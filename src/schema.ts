import type { DatabaseSync } from "node:sqlite";

import { DatasetError } from "./source.ts";
import { propertyType } from "./sql.ts";

export type PropertyType = "string" | "number" | "boolean" | "object" | "array";

/** Property -> type. */
export type ResourceSchema = Map<string, PropertyType>;

/**
 * The plain tables of the database, in creation order: no view, no virtual table (an
 * FTS index) and none of the shadow tables a virtual table brings along.
 */
export function tableNames(db: DatabaseSync): string[] {
  return db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         AND name IN (SELECT name FROM pragma_table_list WHERE schema = 'main' AND type = 'table')
       ORDER BY rowid`,
    )
    .all()
    .map((row) => row.name as string);
}

/**
 * Reads the schema from the tables of `db`. Every plain table with an `"id" INTEGER
 * PRIMARY KEY` column is a resource, its other columns are the properties, typed by their
 * declared type (`TEXT`, `REAL` or `INTEGER`, `BOOLEAN`, `JSON` for an object, `ARRAY`;
 * see `propertyType`). Other tables are not resources but stay reachable through
 * `query`. Relations are SQLite's business: a foreign key is declared in the DDL and
 * enforced by the engine, JSON Server only translates its errors. Throws `DatasetError`,
 * each line prefixed by `file`, when a column type cannot be mapped.
 */
export function readSchema(db: DatabaseSync, file: string): Map<string, ResourceSchema> {
  const schema = new Map<string, ResourceSchema>();
  const errors: string[] = [];

  for (const table of tableNames(db)) {
    const columns = db.prepare("SELECT * FROM pragma_table_info(?)").all(table) as {
      name: string;
      type: string;
      pk: number;
    }[];
    const id = columns.find((c) => c.name === "id");
    if (id === undefined || id.pk !== 1 || id.type.toUpperCase() !== "INTEGER") continue;

    const resourceSchema: ResourceSchema = new Map();
    for (const column of columns) {
      if (column.name === "id") continue;
      const type = propertyType(column.type);
      if (type === undefined) {
        errors.push(
          `${file}: ${table}.${column.name}: unsupported column type "${column.type}", use TEXT, REAL, INTEGER, BOOLEAN, JSON or ARRAY`,
        );
        continue;
      }
      resourceSchema.set(column.name, type);
    }
    schema.set(table, resourceSchema);
  }

  if (errors.length > 0) throw new DatasetError(errors.join("\n"));
  return schema;
}
