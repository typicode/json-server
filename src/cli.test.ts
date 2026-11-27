import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempDisposableSync, writeFileSync } from "node:fs";
import { createServer, type AddressInfo, type Server } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import { createApp } from "./app.ts";
import { run } from "./cli.ts";

const binPath = path.join(import.meta.dirname, "bin.ts");
const seed = JSON.stringify({ posts: [{ id: 1, title: "Hello" }] });
// Tests that expect `run()` to fail pass `--host 127.0.0.1`: `run()` returns only an exit
// code, so a server it unexpectedly leaves listening (a `HOST` in the environment that
// dodges the occupied loopback port) cannot be closed and keeps the runner alive.

/** A temporary `db.json` holding `content`, removed with its directory at the end of the `using` scope. */
function tempFile(content: string): Disposable & { path: string } {
  const dir = mkdtempDisposableSync(path.join(tmpdir(), "json-server-"));
  const file = path.join(dir.path, "db.json");
  writeFileSync(file, content);
  return { path: file, [Symbol.dispose]: () => dir.remove() };
}

// Hold a port so the CLI finds it busy. Port 0 takes any free port; a fixed port that
// something else already holds resolves to null, which is just as busy for a test.
function occupy(port: number): Promise<Server | null> {
  return new Promise((resolve, reject) => {
    const blocker = createServer();
    blocker.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") resolve(null);
      else reject(error);
    });
    blocker.listen(port, "127.0.0.1", () => resolve(blocker));
  });
}

function spawnCli(args: string[], env = process.env): ChildProcess {
  return spawn(process.execPath, [binPath, ...args], { env, stdio: ["ignore", "pipe", "pipe"] });
}

// Resolve with everything the CLI printed up to and including its ready line.
function waitForListening(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server did not start in time")), 5000);
    let stdout = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.includes("http://")) {
        clearTimeout(timer);
        resolve(stdout);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`CLI exited early with code ${code}`));
    });
  });
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError;
}

const refusedCases = [
  { name: "no file", args: [] },
  { name: "two files", args: ["db.json", "other.json"] },
  { name: "--watch", args: ["db.json", "--watch"] },
];
for (const { name, args } of refusedCases) {
  test(`${name} returns exit code 1 before reading any file`, async () => {
    assert.equal(await run([...args, "--port", "4000", "--host", "127.0.0.1"]), 1);
  });
}

test("invalid dataset file returns exit code 1", async () => {
  using file = tempFile(JSON.stringify({}));
  const code = await run([file.path, "--port", "4001"]);
  assert.equal(code, 1);
});

test("explicit --port that is busy returns exit code 1", async () => {
  using file = tempFile(seed);
  await using blocker = (await occupy(0)) as Server;
  const { port } = blocker.address() as AddressInfo;
  const code = await run([file.path, "--port", String(port), "--host", "127.0.0.1", "--quiet"]);
  assert.equal(code, 1);
});

test("unresolvable --host returns exit code 1", async () => {
  using file = tempFile(seed);
  // `.invalid` never resolves (RFC 6761), so this fails before any bind on any OS.
  const code = await run([file.path, "--host", "json-server.invalid", "--port", "4005", "--quiet"]);
  assert.equal(code, 1);
});

test("CLI falls back to a free port when the default is busy", async () => {
  using file = tempFile(seed);
  await using _blocker = await occupy(3000);
  const env = { ...process.env };
  delete env.PORT;
  delete env.HOST;
  using child = spawnCli([file.path], env); // SIGTERM at the end of the scope

  const stdout = await waitForListening(child);
  assert.match(
    stdout,
    /^created .*db\.schema\.sql\njson-server: port 3000 in use, taking a free one\n/,
  );
  const port = Number(/http:\/\/127\.0\.0\.1:(\d+)/.exec(stdout)?.[1]);
  assert.ok(port > 0 && port !== 3000);
  const response = await fetchWithRetry(`http://127.0.0.1:${port}/posts`);
  assert.equal(response.status, 200);
});

test("Ctrl+C stops the CLI with exit code 130", async () => {
  using file = tempFile(seed);
  using child = spawnCli([file.path, "--port", "4006", "--host", "127.0.0.1"]);
  await waitForListening(child);
  child.kill("SIGINT");
  const [code] = await once(child, "exit");
  assert.equal(code, 130);
});

test("export writes a SQLite database from the JSON file and exits", async () => {
  using file = tempFile(seed);
  const target = path.join(path.dirname(file.path), "out.sqlite");
  assert.equal(await run(["export", file.path, target, "--quiet"]), 0);
  const { app } = createApp(target);
  const response = await app.request("/posts");
  assert.deepEqual(await response.json(), [{ id: 1, title: "Hello" }]);

  const other = path.join(path.dirname(file.path), "x.sqlite");
  const refused = [
    ["export", file.path, target], // would overwrite
    ["export", target, other], // a SQLite input
    ["export", file.path], // no target
    ["export", file.path, other, "--port", "4000"], // serves nothing
  ];
  for (const args of refused) assert.equal(await run([...args, "--quiet"]), 1, args.join(" "));
});
