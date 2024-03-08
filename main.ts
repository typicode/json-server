import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { args, kaomojis, logRoutes, randomItem } from "./src/bin.ts";

import chalk from "chalk";
import { watch } from "chokidar";
import JSON5 from "json5";
import { Adapter, Low } from "lowdb";
import { DataFile, JSONFile } from "lowdb/node";

import process from "node:process";
import { createApp } from "./src/app.ts";
import { Observer } from "./src/observer.ts";
import { Data } from "./src/service.ts";

const { file, port, host, static: staticArr } = args();

if (!existsSync(file)) {
  console.log(chalk.red(`File ${file} not found`));
  process.exit(1);
}

// Handle empty string JSON file
if (readFileSync(file, "utf-8").trim() === "") {
  writeFileSync(file, "{}");
}

// Set up database
let adapter: Adapter<Data>;
if (extname(file) === ".json5") {
  adapter = new DataFile<Data>(file, {
    parse: JSON5.parse,
    stringify: JSON5.stringify,
  });
} else {
  adapter = new JSONFile<Data>(file);
}
const observer = new Observer(adapter);

const db = new Low<Data>(observer, {});
await db.read();

// Create app
const app = createApp(db, { logger: false, static: staticArr });

app.listen(port, () => {
  console.log(
    [
      chalk.bold(`JSON Server started on PORT :${port}`),
      chalk.gray("Press CTRL-C to stop"),
      chalk.gray(`Watching ${file}...`),
      "",
      chalk.magenta(randomItem(kaomojis)),
      "",
      chalk.bold("Index:"),
      chalk.gray(`http://localhost:${port}/`),
      "",
      chalk.bold("Static files:"),
      chalk.gray("Serving ./public directory if it exists"),
      "",
    ].join("\n"),
  );
  logRoutes(db.data, { file, port, host });
});

// Watch file for changes
if (process.env["NODE_ENV"] !== "production") {
  let writing = false; // true if the file is being written to by the app
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
    if (prevEndpoints !== nextEndpoints) {
      console.log();
      logRoutes(data, { file, host, port });
    }
  };
  watch(file).on("change", () => {
    // Do no reload if the file is being written to by the app
    if (!writing) {
      db.read().catch((e) => {
        if (e instanceof SyntaxError) {
          return console.log(
            chalk.red(["", `Error parsing ${file}`, e.message].join("\n")),
          );
        }
        console.log(e);
      });
    }
  });
}
