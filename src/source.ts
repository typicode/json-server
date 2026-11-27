import type { DatabaseSync } from "node:sqlite";

import type { ResourceSchema } from "./schema.ts";

/** The source cannot be loaded: a file is missing or unreadable, its content is invalid. */
export class DatasetError extends Error {}

export type SourceOptions = {
  /** Receives one line per notable event (a reload, an unusable file). Default: silent. */
  log?: (line: string) => void;
};

/**
 * What a `Store` operates on: a SQLite connection, its schema, and the hooks to refresh
 * or persist them. `JsonSource` mirrors a JSON file into memory;
 * `SqliteSource` opens a database file in place.
 */
export interface Source {
  /** The current connection; a source may replace it at a `sync`. */
  readonly db: DatabaseSync;
  /** The current schema. May change from one call to the next, after a `sync`. */
  schema(): Map<string, ResourceSchema>;
  /** Runs at the start of every store operation: picks up an external change. Throws a 503 `StoreError` while the source cannot be loaded. */
  sync(): void;
  /** Runs after every successful write. */
  persist(): void;
}
