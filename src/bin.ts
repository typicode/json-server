#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { parseArgs } from "node:util";

import pc from "picocolors";
import { watch } from "chokidar";
import JSON5 from "json5";
import { Low } from "lowdb";
import type { Adapter } from "lowdb";
import { DataFile, JSONFile } from "lowdb/node";
import type { PackageJson } from "type-fest";

import { fileURLToPath } from "node:url";
import { NormalizedAdapter } from "./adapters/normalized-adapter.ts";
import type { RawData } from "./adapters/normalized-adapter.ts";
import { Observer } from "./adapters/observer.ts";
import { createApp } from "./app.ts";
import type { Data } from "./service.ts";

function help() {
  console.log(`Usage: json-server [options] <file>

Options:
  -p, --port <port>  Port (default: 3000)
  -h, --host <host>  Host (default: localhost)
  -s, --static <dir> Static files directory (multiple allowed)
  --help             Show this message
  --version          Show version number
`);
}

// Parse args
function args(): {
  file: string;
  port: number;
  host: string;
  static: string[];
} {
  try {
    const { values, positionals } = parseArgs({
      options: {
        port: {
          type: "string",
          short: "p",
          default: process.env["PORT"] ?? "3000",
        },
        host: {
          type: "string",
          short: "h",
          default: process.env["HOST"] ?? "localhost",
        },
        static: {
          type: "string",
          short: "s",
          multiple: true,
          default: [],
        },
        help: {
          type: "boolean",
        },
        version: {
          type: "boolean",
        },
        // Deprecated
        watch: {
          type: "boolean",
          short: "w",
        },
      },
      allowPositionals: true,
    });

    // --version
    if (values.version) {
      const pkg = JSON.parse(
        readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf-8"),
      ) as PackageJson;
      console.log(pkg.version);
      process.exit();
    }

    // Handle --watch
    if (values.watch) {
      console.log(
        pc.yellow(
          "--watch/-w can be omitted, JSON Server 1+ watches for file changes by default",
        ),
      );
    }

    if (values.help || positionals.length === 0) {
      help();
      process.exit();
    }

    // App args and options
    return {
      file: positionals[0] ?? "",
      port: parseInt(values.port as string),
      host: values.host as string,
      static: values.static as string[],
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
      console.log(pc.red((e as NodeJS.ErrnoException).message.split(".")[0]));
      help();
      process.exit(1);
    } else {
      throw e;
    }
  }
}

const { file, port, host, static: staticArr } = args();

if (!existsSync(file)) {
  console.log(pc.red(`File ${file} not found`));
  process.exit(1);
}

// Handle empty string JSON file
if (readFileSync(file, "utf-8").trim() === "") {
  writeFileSync(file, "{}");
}

// Set up database
let adapter: Adapter<RawData>;
if (extname(file) === ".json5") {
  adapter = new DataFile<RawData>(file, {
    parse: JSON5.parse,
    stringify: JSON5.stringify,
  });
} else {
  adapter = new JSONFile<RawData>(file);
}
const observer = new Observer(new NormalizedAdapter(adapter));

const db = new Low<Data>(observer, {});
await db.read();

// Create app
const app = createApp(db, { logger: false, static: staticArr });

function logRoutes(data: Data) {
  console.log(pc.bold("Endpoints:"));
  if (Object.keys(data).length === 0) {
    console.log(pc.gray(`No endpoints found, try adding some data to ${file}`));
    return;
  }
  console.log(
    Object.keys(data)
      .map((key) => `${pc.gray(`http://${host}:${port}/`)}${pc.blue(key)}`)
      .join("\n"),
  );
}

const kaomojis = ["♡⸜(˶˃ ᵕ ˂˶)⸝♡", "♡( ◡‿◡ )", "( ˶ˆ ᗜ ˆ˵ )", "(˶ᵔ ᵕ ᵔ˶)"];

function randomItem(items: string[]): string {
  const index = Math.floor(Math.random() * items.length);
  return items.at(index) ?? "";
}

app.listen(port, () => {
  console.log(
    [
      pc.bold(`JSON Server started on PORT :${port}`),
      pc.gray("Press CTRL-C to stop"),
      pc.gray(`Watching ${file}...`),
      "",
      pc.magenta(randomItem(kaomojis)),
      "",
      pc.bold("Index:"),
      pc.gray(`http://localhost:${port}/`),
      "",
      pc.bold("Static files:"),
      pc.gray("Serving ./public directory if it exists"),
      "",
    ].join("\n"),
  );
  logRoutes(db.data);
});

// Watch file for changes
if (process.env["NODE_ENV"] !== "production") {
  let writing = false; // true if the file is being written to by the app
  let hadReadError = false;
  let prevEndpoints = "";

  observer.onWriteStart = () => {
    writing = true;
  };
  observer.onWriteEnd = () => {
    writing = false;
  };
  observer.onReadStart = () => {
    prevEndpoints = JSON.stringify(Object.keys(db.data).sort());
  };
  observer.onReadEnd = (data) => {
    if (data === null) {
      return;
    }

    const nextEndpoints = JSON.stringify(Object.keys(data).sort());
    if (hadReadError || prevEndpoints !== nextEndpoints) {
      console.log();
      logRoutes(data);
    }
    hadReadError = false;
  };
  watch(file).on("change", () => {
    // Do no reload if the file is being written to by the app
    if (!writing) {
      db.read().catch((e) => {
        if (e instanceof SyntaxError) {
          hadReadError = true;
          return console.log(pc.red(["", `Error parsing ${file}`, e.message].join("\n")));
        }
        console.log(e);
      });
    }
  });
}
