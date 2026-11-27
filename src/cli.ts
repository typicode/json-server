import { once } from "node:events";
import { createRequire } from "node:module";
import { convertProcessSignalToExitCode, parseArgs, styleText } from "node:util";

import { createAdaptorServer, type ServerType } from "@hono/node-server";

// Not a static import: that would pull package.json into the tsc root and emit dist/src/.
// Both src/bin.ts and dist/bin.js sit one level below package.json.
const pkg: { version: string } = createRequire(import.meta.url)("../package.json");

import { createApp, isJsonFile } from "./app.ts";
import { JsonSource } from "./json_source.ts";
import { DatasetError } from "./source.ts";

const defaultPort = 3000;
const defaultHost = process.env.HOST ?? "127.0.0.1";

const helpText = `Usage: json-server <file> [options]
       json-server export <file.json> <db.sqlite>

  <file> is a .json file, or a SQLite database (any other extension). A JSON file gets
  its schema (tables, types, relations) from the .schema.sql file next to it, made on the first run.

Commands:
  export <file.json> <db.sqlite>  Write the JSON file to a new SQLite database and exit

Options:
  -p, --port <port>     HTTP port (default: PORT or 3000; a busy 3000 falls back to a free port)
  -H, --host <address>  Listen address (default: HOST or 127.0.0.1)
  -q, --quiet           Print nothing but errors
  -h, --help            Show this help
  -v, --version         Show version
`;

/** Prints `message` as an error, in red on a terminal, and returns the exit code 1. */
function fail(message: string): number {
  const line = styleText("red", `json-server: ${message}`, { stream: process.stderr });
  process.stderr.write(`${line}\n`);
  return 1;
}

// Listen on `port`; when it is busy and `fallback` is allowed, on a free port the system
// picks. Resolves the port that worked; rejects with the listen error.
async function listen(
  server: ServerType,
  host: string,
  port: number,
  fallback: boolean,
  log?: (line: string) => void,
): Promise<number> {
  server.listen(port, host);
  try {
    await once(server, "listening");
  } catch (error) {
    if (!fallback || (error as NodeJS.ErrnoException).code !== "EADDRINUSE") throw error;
    log?.(styleText("yellow", `json-server: port ${port} in use, taking a free one`));
    server.listen(0, host);
    await once(server, "listening");
  }
  const address = server.address();
  return typeof address === "object" && address !== null ? address.port : port;
}

export async function run(argv: string[] = process.argv.slice(2)): Promise<number> {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      allowNegative: true,
      options: {
        // No parseArgs default: an explicit port and the fallback are handled differently.
        port: { type: "string", short: "p" },
        host: { type: "string", short: "H" },
        quiet: { type: "boolean", short: "q" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        // json-server v0 and v1 had it: say why it is gone rather than "unknown option".
        watch: { type: "boolean", short: "w" },
      },
    }));
  } catch (error) {
    return fail((error as Error).message);
  }

  if (values.help) {
    process.stdout.write(helpText);
    return 0;
  }

  if (values.watch) {
    return fail("--watch is not needed, the file is always watched");
  }

  if (values.version) {
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  const log = values.quiet ? undefined : (line: string) => process.stdout.write(`${line}\n`);

  if (positionals[0] === "export") {
    const [, file, target] = positionals;
    if (file === undefined || target === undefined || positionals.length > 3) {
      return fail("export takes two arguments, as in: json-server export db.json db.sqlite");
    }
    if (values.port !== undefined || values.host !== undefined) {
      return fail("export serves nothing, it takes no --port or --host");
    }
    try {
      if (!isJsonFile(file)) throw new DatasetError(`${file}: export takes a .json file`);
      new JsonSource(file).export(target);
    } catch (error) {
      return fail(error instanceof DatasetError ? error.message : "cannot export");
    }
    log?.(`exported ${file} to ${target}`);
    return 0;
  }

  if (!positionals[0]) {
    return fail("missing <file>, as in: json-server db.json");
  }
  if (positionals.length > 1) {
    return fail(`takes one <file>, got ${positionals.length}: ${positionals.join(" ")}`);
  }
  const file = positionals[0];

  const requestedPort = values.port ?? process.env.PORT;
  let port = requestedPort === undefined ? defaultPort : Number(requestedPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return fail(`invalid port "${requestedPort}"`);
  }

  const host = values.host ?? defaultHost;

  let app;
  let store;
  try {
    ({ app, store } = createApp(file, { log }));
  } catch (error) {
    const message = error instanceof DatasetError ? error.message : "cannot start";
    return fail(message);
  }

  // A busy default falls back to a free port. An explicit `--port` or `PORT` never
  // moves: the user asked for that one, so say it is taken and stop.
  const server = createAdaptorServer({ fetch: app.fetch, hostname: host });
  try {
    port = await listen(server, host, port, requestedPort === undefined, log);
  } catch (error) {
    store.db.close();
    return fail((error as Error).message);
  }

  // Exits like a process the signal killed: 130 for Ctrl+C, 143 for SIGTERM.
  const shutdown = (signal: NodeJS.Signals) => {
    server.close();
    store.db.close();
    process.exit(convertProcessSignalToExitCode(signal));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Only once the handlers are in: whoever waits for this line may send a signal at once.
  log?.(`json-server ${styleText("bold", `http://${host}:${port}`)}`);

  return 0;
}
