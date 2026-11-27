import type { DatabaseSync } from "node:sqlite";

import {
  hasSqliteCode,
  readOnly,
  SQLITE_AUTH,
  SQLITE_CONSTRAINT_CHECK,
  SQLITE_CONSTRAINT_FOREIGNKEY,
  SQLITE_CONSTRAINT_NOTNULL,
  SQLITE_CONSTRAINT_TRIGGER,
  SQLITE_CONSTRAINT_UNIQUE,
} from "./db.ts";
import { isPositiveInteger, listOf, type JsonObject, type ValidationError } from "./json_types.ts";
import type { ResourceSchema } from "./schema.ts";
import type { Source } from "./source.ts";
import {
  fromSqlRow,
  fromSqlValue,
  insertRowSql,
  propertyType,
  type SqlValue,
  toSqlValue,
  updateRowSql,
} from "./sql.ts";
import { parseQuery, selectSql, type ListParams } from "./where.ts";
import { validateBody, type WriteMode } from "./validate.ts";

/** The HTTP status a `StoreError` stands for. */
export type StoreErrorStatus = 400 | 404 | 409 | 503;

/**
 * Base of every error a `Store` method throws on purpose. `status` and `errors` are the
 * HTTP response it stands for: `c.json({ errors }, status)`.
 */
export class StoreError extends Error {
  readonly status: StoreErrorStatus;
  readonly errors: readonly ValidationError[];

  constructor(status: StoreErrorStatus, errors: readonly ValidationError[]) {
    super(errors.map((e) => (e.field ? `${e.field} ${e.message}` : e.message)).join(", "));
    this.status = status;
    this.errors = errors;
  }
}

/**
 * The resources of a `Source`, with the same validation and semantics as the HTTP
 * routes: one method per route, throwing a `StoreError` with the status the route
 * would answer (400, 404, 409 or 503). Rows come back as JSON objects, never as raw SQLite rows, except from `query`,
 * which returns them as SQLite does.
 *
 * Every operation starts with `source.sync()`; every write ends with `source.persist()`.
 */
export class Store {
  readonly #source: Source;

  constructor(source: Source) {
    this.#source = source;
  }

  /**
   * The source's current SQLite connection. A JSON file reopens one at each reload, so
   * read it when needed rather than keeping it. `db.close()` discards the store.
   */
  get db(): DatabaseSync {
    return this.#source.db;
  }

  /** Resource names, sorted. */
  resources(): string[] {
    this.#source.sync();
    return [...this.#source.schema().keys()].sort();
  }

  /**
   * Rows of `resource` matching `query`: a `ListParams`, or the search params of a
   * `GET /:resource` as they come.
   */
  list(resource: string, query: ListParams | URLSearchParams = {}): JsonObject[] {
    this.#source.sync();
    const schema = this.#resourceSchema(resource);
    const parsed = parseQuery(query, schema);
    if (parsed.errors.length > 0) throw new StoreError(400, parsed.errors);

    const { sql, values } = selectSql(resource, parsed);
    return this.db
      .prepare(sql)
      .all(...values)
      .map((row) => fromSqlRow(row, schema));
  }

  /** The row `id` of `resource`. */
  get(resource: string, id: number): JsonObject {
    const schema = this.#target(resource, id);
    return this.#row(resource, schema, id);
  }

  /**
   * Inserts `body` (without an `id`) and returns the created row. A property the body
   * leaves out is not in the `INSERT`, so the column takes its `DEFAULT`, or `NULL`.
   */
  create(resource: string, body: unknown): JsonObject {
    this.#source.sync();
    const schema = this.#resourceSchema(resource);
    const row = this.#validated(body, schema, "create");
    const provided = new Map([...schema].filter(([property]) => Object.hasOwn(row, property)));
    const values = this.#values(row, provided);
    const result = this.#write(
      () => this.db.prepare(insertRowSql(resource, provided, false)).run(...values),
      () => danglingValues(this.db, resource, row),
    );
    const created = this.#row(resource, schema, Number(result.lastInsertRowid));
    this.#source.persist();
    return created;
  }

  /** Replaces the row `id` with `body`; an `id` in the body must match, a property left out becomes `null`. Returns the new row. */
  replace(resource: string, id: number, body: unknown): JsonObject {
    const schema = this.#target(resource, id);
    const row = this.#validated(body, schema, "replace");
    if (Object.hasOwn(row, "id") && row.id !== id) throw idMismatch();
    return this.#update(resource, schema, id, row);
  }

  /** Merges `body` into the row `id`; an `id` in the body must match. Returns the new row. */
  patch(resource: string, id: number, body: unknown): JsonObject {
    const schema = this.#target(resource, id);
    const patch = this.#validated(body, schema, "patch");
    if (Object.hasOwn(patch, "id") && patch.id !== id) throw idMismatch();

    const row = this.#row(resource, schema, id);
    for (const property of schema.keys()) {
      if (Object.hasOwn(patch, property)) row[property] = patch[property];
    }
    return this.#update(resource, schema, id, row);
  }

  /** Deletes the row `id`. */
  remove(resource: string, id: number): void {
    this.#target(resource, id);
    const result = this.#write(
      () => this.db.prepare(`DELETE FROM "${resource}" WHERE "id" = ?`).run(id),
      () => references(this.db, resource, id),
    );
    if (result.changes === 0) throw missingRow(resource, id);
    this.#source.persist();
  }

  /**
   * Runs one read-only SQL statement (the first one of `sql`; anything after a `;` is
   * ignored) and returns its column names and rows. A column read straight from a table
   * comes back as `list` returns it (a boolean, an object, an array); a computed one
   * (`count(*)`, `json_extract(...)`) as SQLite returns it.
   */
  query(sql: string): { columns: string[]; rows: JsonObject[] } {
    this.#source.sync();
    try {
      return readOnly(this.db, () => {
        const statement = this.db.prepare(sql);
        const meta = statement.columns();
        const columns = meta.map((column) => column.name);
        // SQLite gives the declared type of a column read from a table, alias or not.
        const types = meta.map((column) =>
          column.table === null || column.type === null ? undefined : propertyType(column.type),
        );
        const rows = statement.all().map((row) =>
          Object.fromEntries(
            columns.map((name, i) => {
              const type = types[i];
              return [name, type === undefined ? row[name] : fromSqlValue(type, row[name])];
            }),
          ),
        );
        return { columns, rows };
      });
    } catch (error) {
      if (hasSqliteCode(error, SQLITE_AUTH)) {
        throw new StoreError(400, [
          { message: "only read statements are allowed, write with POST, PUT, PATCH or DELETE" },
        ]);
      }
      throw new StoreError(400, [{ message: (error as Error).message }]);
    }
  }

  #resourceSchema(resource: string): ResourceSchema {
    const schema = this.#source.schema().get(resource);
    if (schema === undefined) {
      const names = [...this.#source.schema().keys()].sort();
      const message = `unknown resource "${resource}"`;
      throw notFound(names.length > 0 ? `${message}, use ${listOf(names)}` : message);
    }
    return schema;
  }

  /** Starts an operation on one row: refuses an impossible id before touching the source, then syncs and resolves the resource. */
  #target(resource: string, id: number): ResourceSchema {
    if (!isPositiveInteger(id)) throw notFound("id must be a positive integer");
    this.#source.sync();
    return this.#resourceSchema(resource);
  }

  #validated(body: unknown, schema: ResourceSchema, mode: WriteMode): JsonObject {
    const errors = validateBody(body, schema, mode);
    if (errors.length > 0) throw new StoreError(400, errors);
    return body as JsonObject;
  }

  /** Writes every property of `row` over the row `id`, persists, and returns the row as stored. */
  #update(resource: string, schema: ResourceSchema, id: number, row: JsonObject): JsonObject {
    const values = this.#values(row, schema);
    const result = this.#write(
      () => this.db.prepare(updateRowSql(resource, schema)).run(...values, id),
      () => danglingValues(this.db, resource, row),
    );
    if (result.changes === 0) throw missingRow(resource, id);
    const updated = this.#row(resource, schema, id);
    this.#source.persist();
    return updated;
  }

  #row(resource: string, schema: ResourceSchema, id: number): JsonObject {
    const row = this.db.prepare(`SELECT * FROM "${resource}" WHERE "id" = ?`).get(id);
    if (row === undefined) throw missingRow(resource, id);
    return fromSqlRow(row, schema);
  }

  #values(row: JsonObject, schema: ResourceSchema): SqlValue[] {
    return [...schema.keys()].map((column) => toSqlValue(row[column]));
  }

  /**
   * Runs a write, turning a constraint failure into the error the caller can act on: a
   * foreign key (dangling value, `RESTRICT`ed delete) or a `UNIQUE` is a conflict, a
   * `NOT NULL`, a `CHECK` or a trigger's `RAISE` is invalid input. Constraints are the
   * schema's to declare and SQLite's to enforce; this is where their refusals become
   * responses. `foreignKeyErrors` says which foreign key failed, as SQLite does not.
   */
  #write<T>(fn: () => T, foreignKeyErrors: () => ValidationError[]): T {
    try {
      return fn();
    } catch (error) {
      // A `RESTRICT` raises a trigger error with the foreign key's message.
      if (
        hasSqliteCode(error, SQLITE_CONSTRAINT_FOREIGNKEY) ||
        (hasSqliteCode(error, SQLITE_CONSTRAINT_TRIGGER) &&
          (error as Error).message === "FOREIGN KEY constraint failed")
      ) {
        const errors = foreignKeyErrors();
        throw new StoreError(
          409,
          errors.length > 0 ? errors : [{ message: "foreign key constraint failed" }],
        );
      }
      // A trigger's `RAISE(ABORT, '...')`: its message is the trigger author's.
      if (hasSqliteCode(error, SQLITE_CONSTRAINT_TRIGGER) && error instanceof Error) {
        throw new StoreError(400, [{ message: error.message }]);
      }
      if (hasSqliteCode(error, SQLITE_CONSTRAINT_UNIQUE)) {
        throw new StoreError(409, [{ field: constraintColumn(error), message: "must be unique" }]);
      }
      if (hasSqliteCode(error, SQLITE_CONSTRAINT_NOTNULL)) {
        throw new StoreError(400, [
          { field: constraintColumn(error), message: "must not be null" },
        ]);
      }
      // SQLite names the failed expression (or the constraint's name), which is the
      // most useful message there is: `CHECK constraint failed: "draft" IN (0, 1)`.
      if (hasSqliteCode(error, SQLITE_CONSTRAINT_CHECK) && error instanceof Error) {
        throw new StoreError(400, [{ message: error.message }]);
      }
      throw error;
    }
  }
}

// SQLite does not say which foreign key failed. The failed statement was rolled back,
// so the functions below find it by reading the keys and the rows as they were.

/** A foreign key from `child.from` to `table.to`; `to` is `null` when the key names the parent's primary key. */
type ForeignKey = {
  child: string;
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string | null;
};

/** The values of `row` that point to no row, on their column. */
function danglingValues(db: DatabaseSync, resource: string, row: JsonObject): ValidationError[] {
  const keys = foreignKeys(db).filter((fk) => fk.child === resource);
  return keys.flatMap((fk) => {
    const value = toSqlValue(row[fk.from]);
    const to = fk.to ?? primaryKey(db, fk.table);
    if (value == null || to === undefined) return [];
    const found = db.prepare(`SELECT 1 FROM "${fk.table}" WHERE "${to}" = ?`).get(value);
    return found ? [] : [{ field: fk.from, message: noRow(fk.table, to, value) }];
  });
}

/** The tables whose rows still point to the row `id` of `resource`. */
function references(db: DatabaseSync, resource: string, id: number): ValidationError[] {
  const keys = foreignKeys(db).filter((fk) => fk.table.toLowerCase() === resource.toLowerCase());
  return keys.flatMap(({ child, from, to }) => {
    const parent = to ?? primaryKey(db, resource);
    if (parent === undefined) return [];
    const found = db
      .prepare(
        `SELECT 1 FROM "${child}" WHERE "${from}" IN (SELECT "${parent}" FROM "${resource}" WHERE "id" = ?)`,
      )
      .get(id);
    const message = `the row is still referenced by "${from}" in "${child}", delete or update those rows first`;
    return found ? [{ message }] : [];
  });
}

/** The single-column foreign keys of every table, in the order they are declared. */
function foreignKeys(db: DatabaseSync): ForeignKey[] {
  // SQLite numbers a table's keys from the last declared.
  const keys = db
    .prepare(
      `SELECT t.name AS child, fk.* FROM sqlite_schema AS t, pragma_foreign_key_list(t.name) AS fk
       WHERE t.type = 'table' ORDER BY t.rowid, fk.id DESC`,
    )
    .all() as ForeignKey[];
  const composite = keys.filter((fk) => fk.seq > 0);
  return keys.filter((fk) => !composite.some((c) => c.child === fk.child && c.id === fk.id));
}

/** The primary key column of `table`, `undefined` when it is not one column. */
function primaryKey(db: DatabaseSync, table: string): string | undefined {
  const keys = db.prepare("SELECT name FROM pragma_table_info(?) WHERE pk > 0").all(table);
  return keys.length === 1 ? (keys[0]?.name as string) : undefined;
}

/** `no row with id 3 in "posts"`, `no row with slug "nope" in "posts"`. */
export function noRow(table: string, column: string, value: SqlValue): string {
  return `no row with ${column} ${JSON.stringify(value)} in "${table}"`;
}

/** The column of a `... constraint failed: table.column` SQLite message; `undefined` if unreadable. */
function constraintColumn(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  return /constraint failed: [^.\s]+\.(\S+)$/.exec(error.message)?.[1];
}

function notFound(message: string): StoreError {
  return new StoreError(404, [{ message }]);
}

function missingRow(resource: string, id: number): StoreError {
  return notFound(noRow(resource, "id", id));
}

function idMismatch(): StoreError {
  return new StoreError(409, [{ field: "id", message: "does not match the id in the path" }]);
}
