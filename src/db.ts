import { constants, DatabaseSync } from "node:sqlite";

/**
 * Opens `path` (default: a private in-memory database) with foreign keys enforced. A file
 * may be written by another process (a migration, `sqlite3`): rather than fail at once
 * with `SQLITE_BUSY`, wait up to five seconds for its lock.
 */
export function open(path = ":memory:"): DatabaseSync {
  return new DatabaseSync(path, { enableForeignKeyConstraints: true, timeout: 5000 });
}

/**
 * SQLite result codes. `node:sqlite` puts the (extended) code on a thrown error as
 * `errcode` but exports neither the codes nor the error type, so they live here.
 * https://sqlite.org/rescode.html
 */
export const SQLITE_AUTH = 23; // the authorizer denied the statement
export const SQLITE_NOTADB = 26; // the file is not a database
export const SQLITE_CONSTRAINT_CHECK = 275;
export const SQLITE_CONSTRAINT_FOREIGNKEY = 787;
export const SQLITE_CONSTRAINT_NOTNULL = 1299;
export const SQLITE_CONSTRAINT_TRIGGER = 1811; // what ON DELETE RESTRICT raises
export const SQLITE_CONSTRAINT_UNIQUE = 2067;

/** Whether `error` was thrown by `node:sqlite` with one of these result codes. */
export function hasSqliteCode(error: unknown, ...codes: number[]): boolean {
  if (!(error instanceof Error)) return false;
  const { errcode } = error as { errcode?: unknown };
  return typeof errcode === "number" && codes.includes(errcode);
}

/** What a read-only statement may do: read tables, call functions, recurse in a CTE. */
const READ_ONLY_ACTIONS = new Set([
  constants.SQLITE_SELECT,
  constants.SQLITE_READ,
  constants.SQLITE_FUNCTION,
  constants.SQLITE_RECURSIVE,
]);

/**
 * Runs `fn` with the connection restricted to reads: a write, DDL, `PRAGMA` (the
 * `pragma_*` table-valued functions included), `ATTACH` or transaction fails at prepare
 * time with `SQLITE_AUTH`. The one pragma allowed is `data_version`, which FTS5 reads
 * for itself on every query and which tells nothing about the schema. `fn` is
 * synchronous on purpose: the authorizer is connection-wide, so an `await` inside it
 * would deny another request's write too.
 */
export function readOnly<T>(db: DatabaseSync, fn: () => T): T {
  db.setAuthorizer((action, pragma) =>
    READ_ONLY_ACTIONS.has(action) ||
    (action === constants.SQLITE_PRAGMA && pragma === "data_version")
      ? constants.SQLITE_OK
      : constants.SQLITE_DENY,
  );
  try {
    return fn();
  } finally {
    db.setAuthorizer(null);
  }
}
