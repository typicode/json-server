import type { PropertyType, ResourceSchema } from "./schema.ts";

/** The declared column type for a property type. SQLite keeps the name as written; `propertyType` reads it back. */
export function sqlType(type: PropertyType): "TEXT" | "REAL" | "BOOLEAN" | "JSON" | "ARRAY" {
  switch (type) {
    case "string":
      return "TEXT";
    case "number":
      return "REAL";
    case "boolean":
      return "BOOLEAN";
    case "object":
      return "JSON";
    case "array":
      return "ARRAY";
  }
}

/**
 * The property type for a declared column type, `undefined` when JSON Server has no type
 * for it (`BLOB`, none). Follows SQLite's own affinity rules for the standard names, plus
 * `BOOLEAN`, `JSON` and `ARRAY`.
 */
export function propertyType(declared: string): PropertyType | undefined {
  const name = declared.toUpperCase();
  if (name === "BOOLEAN" || name === "BOOL") return "boolean";
  if (name === "JSON") return "object";
  if (name === "ARRAY") return "array";
  if (name.includes("CHAR") || name.includes("CLOB") || name.includes("TEXT")) return "string";
  if (
    name.includes("INT") ||
    name.includes("REAL") ||
    name.includes("FLOA") ||
    name.includes("DOUB") ||
    name.includes("NUM") ||
    name.includes("DEC")
  ) {
    return "number";
  }
  return undefined;
}

/** Column order for a resource: `id` first, then each property in schema order. */
export function resourceColumns(schema: ResourceSchema): string[] {
  return ["id", ...schema.keys()];
}

/**
 * Builds a `CREATE TABLE` statement for a resource: `"id" INTEGER PRIMARY KEY`, then one
 * column per property with its declared type (`sqlType`), nothing else.
 */
export function createTableSql(resource: string, schema: ResourceSchema): string {
  const columns = [`"id" INTEGER PRIMARY KEY`];
  for (const [property, type] of schema) {
    columns.push(`"${property}" ${sqlType(type)}`);
  }
  return `CREATE TABLE "${resource}" (\n  ${columns.join(",\n  ")}\n)`;
}

/**
 * Builds a parameterized `INSERT` statement for a resource: `id` first, then each
 * property in schema order. A resource with no property yet takes `DEFAULT VALUES`.
 */
export function insertRowSql(resource: string, schema: ResourceSchema, includeId = true): string {
  const columns = includeId ? resourceColumns(schema) : [...schema.keys()];
  if (columns.length === 0) return `INSERT INTO "${resource}" DEFAULT VALUES`;
  const placeholders = columns.map(() => "?").join(", ");
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ");

  return `INSERT INTO "${resource}" (${quotedColumns}) VALUES (${placeholders})`;
}

/** Builds a parameterized `UPDATE` of every property, `id` last. With no property, a no-op that still matches the row. */
export function updateRowSql(resource: string, schema: ResourceSchema): string {
  const assignments = [...schema.keys()].map((column) => `"${column}" = ?`);
  if (assignments.length === 0) assignments.push(`"id" = "id"`);
  return `UPDATE "${resource}" SET ${assignments.join(", ")} WHERE "id" = ?`;
}

/** A bound parameter: `node:sqlite` binds a boolean as 0/1 and `undefined` as `NULL`. */
export type SqlValue = null | undefined | boolean | number | string;

/** Converts a JSON value to a bound parameter: an array or an object becomes JSON text. */
export function toSqlValue(value: unknown): SqlValue {
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return value as SqlValue;
}

/** Converts a SQLite value back to its inferred JSON type. */
export function fromSqlValue(type: PropertyType, value: unknown): unknown {
  if (value === null) return null;
  if (type === "boolean") return value === 1;
  if (type === "object" || type === "array") return JSON.parse(value as string);
  return value;
}

/** Converts a SQLite row back to a JSON object: `id` first, then each property in schema order. */
export function fromSqlRow(
  row: Record<string, unknown>,
  schema: ResourceSchema,
): Record<string, unknown> {
  const result: Record<string, unknown> = { id: row.id };
  for (const [property, type] of schema) {
    result[property] = fromSqlValue(type, row[property]);
  }
  return result;
}
