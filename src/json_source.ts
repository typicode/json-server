import { appendFileSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";
import type { DatabaseSync } from "node:sqlite";

import { open } from "./db.ts";
import { validateDataset } from "./validate.ts";
import type { Dataset, JsonObject } from "./json_types.ts";
import { readSchema, tableNames, type ResourceSchema } from "./schema.ts";
import { DatasetError, type Source, type SourceOptions } from "./source.ts";
import { createTableSql, fromSqlRow, insertRowSql, resourceColumns, toSqlValue } from "./sql.ts";
import { noRow, StoreError } from "./store.ts";

/** The schema file that goes with a JSON file: same directory and name, `.schema.sql` extension. */
export function schemaFileOf(file: string): string {
  const { dir, name } = parse(file);
  return join(dir, `${name}.schema.sql`);
}

/**
 * A JSON file mirrored into an in-memory SQLite connection, its tables declared by the
 * `.schema.sql` file next to it (`schemaFileOf`), which JSON Server creates and appends to but
 * never edits. `sync` reloads when either file changed, and throws a 503 `StoreError`
 * as long as they fail to load. `persist` writes the dataset back to the JSON file.
 */
export class JsonSource implements Source {
  #db: DatabaseSync;
  readonly #file: string;
  readonly #schemaFile: string;
  readonly #log: (line: string) => void;
  #schema: Map<string, ResourceSchema> = new Map();
  // The text of both files as last loaded or written; `sync` rereads them and treats any
  // difference as an edit to reload.
  #loaded: Files;

  /** Throws `DatasetError` when the files cannot be loaded. */
  constructor(file: string, { log = () => {} }: SourceOptions = {}) {
    this.#file = file;
    this.#schemaFile = schemaFileOf(file);
    this.#log = log;
    this.#loaded = this.#readFiles();
    this.#db = this.#load(this.#loaded);
  }

  /** The current connection: a reload opens a new one, so read it when needed rather than keeping it. */
  get db(): DatabaseSync {
    return this.#db;
  }

  schema(): Map<string, ResourceSchema> {
    return this.#schema;
  }

  /**
   * Reloads the files if one changed on disk since it was last loaded or written. Runs at
   * the start of every operation, so an edit is noticed by the first operation after it.
   * While the files fail to load, every operation logs why and throws: nothing is
   * recorded as loaded, so the next one tries again.
   */
  sync(): void {
    try {
      const current = this.#readFiles();
      const changed: string[] = [];
      if (current.data !== this.#loaded.data) changed.push(this.#file);
      if (current.ddl !== this.#loaded.ddl) changed.push(this.#schemaFile);
      if (changed.length === 0) return;

      const db = this.#load(current);
      this.#db.close();
      this.#db = db;
      this.#loaded = current;
      this.#log(`reloaded ${changed.join(", ")}`);
    } catch (error) {
      if (!(error instanceof DatasetError)) throw error;
      this.#log(`${this.#file} is not usable: ${error.message}`);
      throw new StoreError(503, [
        { message: `${this.#file} is not usable, fix it and retry: ${error.message}` },
      ]);
    }
  }

  /**
   * Copies the database, schema and rows, to a new SQLite file at `target`: what
   * `SqliteSource` expects. Throws `DatasetError` if `target` exists.
   */
  export(target: string): void {
    this.sync();
    try {
      this.#db.prepare("VACUUM INTO ?").run(target);
    } catch (error) {
      throw new DatasetError(`${target}: ${(error as Error).message}`);
    }
  }

  /** Writes the whole dataset back to the JSON file. What it wrote is what is loaded, so the next `sync` does not reload it. */
  persist(): void {
    const text = `${JSON.stringify(dumpDataset(this.#db, this.#schema), null, 2)}\n`;
    writeFileAtomically(this.#file, text);
    this.#loaded = { data: text, ddl: this.#loaded.ddl };
  }

  /** The text of the JSON file (which must exist) and of the schema file (which may not). Throws `DatasetError`. */
  #readFiles(): Files {
    let data: string;
    try {
      data = readFileSync(this.#file, "utf8"); // Node's message names the file already
    } catch (error) {
      throw new DatasetError((error as Error).message);
    }
    return { data, ddl: readText(this.#schemaFile) };
  }

  /**
   * Builds a new database from the files' text and returns it, the current one untouched.
   * Appends the tables the data has and the schema file does not to the schema file
   * (created when missing). Throws `DatasetError` when the data does not parse or does
   * not fit.
   */
  #load(files: Files): DatabaseSync {
    const data = parseJson(this.#file, files.data);
    const { db, schema, inferred } = build(data, files.ddl ?? "", this.#file, this.#schemaFile);
    this.#schema = schema;
    if (inferred.size === 0) return db;

    const tables = [...inferred].map(([r, s]) => `${createTableSql(r, s)};`).join("\n\n");
    if (files.ddl === null) {
      files.ddl = `${schemaHeader(this.#file)}\n${tables}\n`;
      writeFileAtomically(this.#schemaFile, files.ddl);
      this.#log(`created ${this.#schemaFile}`);
    } else {
      files.ddl = `${files.ddl}\n${tables}\n`;
      appendFileSync(this.#schemaFile, `\n${tables}\n`);
      const names = [...inferred.keys()].map((r) => `"${r}"`).join(", ");
      this.#log(`added ${names} to ${this.#schemaFile}`);
    }
    return db;
  }
}

/** The text of the JSON file and of the schema file (`null` when it does not exist). */
type Files = { data: string; ddl: string | null };

/**
 * Builds an in-memory database from the data: runs the schema SQL, checks the data
 * against the tables it declared, creates the tables it did not declare from the data,
 * inserts every row, and checks the foreign keys. Each problem with the data is a line
 * of the `DatasetError`, prefixed by `file`. Returns the database, its schema with
 * the resources in the data's order, and the tables it had to infer. Throws
 * `DatasetError` on any failure, with nothing left open.
 */
function build(
  data: unknown,
  ddl: string,
  file: string,
  schemaFile: string,
): {
  db: DatabaseSync;
  schema: Map<string, ResourceSchema>;
  inferred: Map<string, ResourceSchema>;
} {
  const db = open();
  try {
    try {
      db.exec(ddl);
    } catch (error) {
      throw new DatasetError(`${schemaFile}: ${(error as Error).message}`);
    }
    const declared = readSchema(db, schemaFile);

    const fail = (errors: string[]) =>
      new DatasetError(errors.map((error) => `${file}: ${error}`).join("\n"));

    const { errors, inferred } = validateDataset(data, declared, schemaFile);
    if (errors.length === 0) {
      for (const table of tableNames(db)) {
        if (!declared.has(table) && Object.hasOwn(data as object, table)) {
          errors.push(
            `${table}: its table in ${schemaFile} is not a resource, give it an "id" INTEGER PRIMARY KEY column`,
          );
        }
      }
    }
    if (errors.length > 0) throw fail(errors);

    const dataset = data as Dataset;
    for (const [resource, schema] of inferred) db.exec(createTableSql(resource, schema));
    // The data's order, so a save keeps the file's; tables only the schema declares last.
    const all = new Map([...declared, ...inferred]);
    const schema = new Map([...Object.keys(dataset).map((r) => [r, all.get(r)!] as const), ...all]);

    // Rows go in file order, a child before its parent if the file says so: foreign keys
    // are checked once all are in.
    db.exec("PRAGMA foreign_keys = OFF");
    for (const [resource, columns] of schema) {
      const error = insertRows(db, resource, columns, dataset[resource] ?? []);
      if (error !== undefined) throw fail([error]);
    }
    const dangling = danglingKeys(db, dataset);
    if (dangling.length > 0) throw fail(dangling);
    db.exec("PRAGMA foreign_keys = ON");
    return { db, schema, inferred };
  } catch (error) {
    db.close();
    throw error;
  }
}

/** The comment opening a schema file JSON Server creates. */
function schemaHeader(file: string): string {
  return (
    `-- Generated by JSON Server from ${file}: its tables, columns and types.\n` +
    `-- Edit freely (REFERENCES, NOT NULL, UNIQUE, CHECK). JSON Server only appends to this\n` +
    `-- file: the CREATE TABLE of a resource it finds in the data and not here.\n`
  );
}

function parseJson(file: string, raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new DatasetError(`${file}: not valid JSON: ${(error as Error).message}`);
  }
}

/** The file's content, or `null` when it does not exist. Throws `DatasetError` on any other failure. */
function readText(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new DatasetError(`${file}: ${(error as Error).message}`);
  }
}

// Persistence helpers: filling a database from a dataset, and the file side.

/**
 * Inserts the rows of a resource, `id` included. A property the table has and the row
 * lacks is `NULL`. Returns the first constraint the table carries (`NOT NULL`, `UNIQUE`,
 * `CHECK`) that a row fails, with its path.
 */
function insertRows(
  db: DatabaseSync,
  resource: string,
  schema: ResourceSchema,
  rows: readonly JsonObject[],
): string | undefined {
  const insert = db.prepare(insertRowSql(resource, schema));
  const columns = resourceColumns(schema);
  for (const [index, row] of rows.entries()) {
    try {
      insert.run(...columns.map((column) => toSqlValue(row[column])));
    } catch (error) {
      return `${resource}[${index}]: ${(error as Error).message}`;
    }
  }
  return undefined;
}

/** Every value of a foreign key that points to no row, with its path. */
function danglingKeys(db: DatabaseSync, dataset: Dataset): string[] {
  const failures = db.prepare("PRAGMA foreign_key_check").all() as {
    table: string;
    rowid: number;
    parent: string;
    fkid: number;
  }[];
  return failures.map(({ table, rowid, parent, fkid }) => {
    const fks = db.prepare("SELECT * FROM pragma_foreign_key_list(?)").all(table) as {
      id: number;
      from: string;
      to: string | null;
    }[];
    const fk = fks.find((fk) => fk.id === fkid)!;
    // Only resources have rows here, and a resource's rowid is its id.
    const index = dataset[table]!.findIndex((row) => row.id === rowid);
    const row = dataset[table]![index]!;
    return `${table}[${index}].${fk.from}: ${noRow(parent, fk.to ?? "id", toSqlValue(row[fk.from]))}`;
  });
}

/**
 * Reads every resource back out of SQLite as a dataset: resources in schema order,
 * rows by ascending `id`, and `id` first in each row.
 */
export function dumpDataset(db: DatabaseSync, schema: Map<string, ResourceSchema>): Dataset {
  const dataset: Dataset = {};
  for (const [resource, resourceSchema] of schema) {
    const rows = db.prepare(`SELECT * FROM "${resource}" ORDER BY "id"`).all();
    dataset[resource] = rows.map((row) => fromSqlRow(row, resourceSchema));
  }
  return dataset;
}

/**
 * Writes `content` to `file` atomically: it goes to a temporary file in the same
 * directory, which is then renamed over the target. A crash mid-write leaves the old
 * file intact rather than a truncated one.
 */
export function writeFileAtomically(file: string, content: string): void {
  const temp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(temp, content);
    renameSync(temp, file);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}
