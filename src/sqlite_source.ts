import { statSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";

import { hasSqliteCode, open, SQLITE_NOTADB } from "./db.ts";
import { readSchema, type ResourceSchema } from "./schema.ts";
import { DatasetError, type Source, type SourceOptions } from "./source.ts";

/**
 * A SQLite database file, read and written in place. Its schema is read from its tables
 * (`readSchema`) again whenever `sync` finds it changed, so a migration run elsewhere is
 * seen by the next operation. `persist` does nothing.
 */
export class SqliteSource implements Source {
  readonly db: DatabaseSync;
  readonly #file: string;
  #schema: Map<string, ResourceSchema>;
  #schemaVersion: number;

  /** Throws `DatasetError` when the file is missing or its tables cannot be mapped to resources. */
  constructor(file: string, _options: SourceOptions = {}) {
    this.#file = file;

    // `DatabaseSync` would create a missing file; a typo must not become an empty database.
    try {
      statSync(file);
    } catch (error) {
      throw new DatasetError(`${file}: ${(error as Error).message}`);
    }
    this.db = open(file);
    try {
      this.#schemaVersion = schemaVersion(this.db);
    } catch (error) {
      // SQLite opens any file and fails at the first read; a db.yaml lands here.
      if (!hasSqliteCode(error, SQLITE_NOTADB)) throw error;
      this.db.close();
      throw new DatasetError(
        `${file}: not a SQLite database, and only a .json file is read as JSON`,
      );
    }
    this.#schema = readSchema(this.db, file);
  }

  schema(): Map<string, ResourceSchema> {
    return this.#schema;
  }

  /**
   * Rereads the schema when it changed: a migration run elsewhere is picked up here.
   * Checking `schema_version` takes under a microsecond, `readSchema` a query per table.
   */
  sync(): void {
    const version = schemaVersion(this.db);
    if (version === this.#schemaVersion) return;
    this.#schema = readSchema(this.db, this.#file);
    this.#schemaVersion = version;
  }

  /** Nothing to do: the write is already in the file. */
  persist(): void {}
}

/** SQLite bumps it at every schema change, made by any connection. */
function schemaVersion(db: DatabaseSync): number {
  return db.prepare("PRAGMA schema_version").get()?.schema_version as number;
}
