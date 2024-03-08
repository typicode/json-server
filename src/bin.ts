import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import chalk from "chalk";
import { PackageJson } from "type-fest";

import process from "node:process";
import { fileURLToPath } from "node:url";
import { Data } from "./service.ts";

export function help() {
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
export function args(): {
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
        readFileSync(
          fileURLToPath(new URL("../package.json", import.meta.url)),
          "utf-8",
        ),
      ) as PackageJson;
      console.log(pkg.version);
      process.exit();
    }

    // Handle --watch
    if (values.watch) {
      console.log(
        chalk.yellow(
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
      console.log(
        chalk.red((e as NodeJS.ErrnoException).message.split(".")[0]),
      );
      help();
      process.exit(1);
    } else {
      throw e;
    }
  }
}

export function logRoutes(
  data: Data,
  { file, host, port }: { file: string; host: string; port: number },
) {
  console.log(chalk.bold("Endpoints:"));
  if (Object.keys(data).length === 0) {
    console.log(
      chalk.gray(`No endpoints found, try adding some data to ${file}`),
    );
    return;
  }
  console.log(
    Object.keys(data)
      .map(
        (key) => `${chalk.gray(`http://${host}:${port}/`)}${chalk.blue(key)}`,
      )
      .join("\n"),
  );
}

export const kaomojis = [
  "♡⸜(˶˃ ᵕ ˂˶)⸝♡",
  "♡( ◡‿◡ )",
  "( ˶ˆ ᗜ ˆ˵ )",
  "(˶ᵔ ᵕ ᵔ˶)",
];

export function randomItem(items: string[]): string {
  const index = Math.floor(Math.random() * items.length);
  return items.at(index) ?? "";
}
