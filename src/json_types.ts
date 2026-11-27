import type { PropertyType } from "./schema.ts";

export const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type JsonObject = { [key: string]: unknown };

/** A dataset that already passed `validateDataset`: resource name -> array of row objects. */
export type Dataset = Record<string, JsonObject[]>;

export function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The JSON type of a value: a property type, `"null"`, or `"other"` for what JSON cannot hold. */
export function valueType(value: unknown): PropertyType | "null" | "other" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean" || type === "object")
    return type;
  return "other";
}

/** Whether a value is valid as a row id: a positive, safe integer. */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** `a, b or c`, the valid choices in a message. */
export function listOf(items: readonly string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items.at(-1)}`;
}

/**
 * One problem with a request, as sent back in `{ errors: [...] }`. `field` names the body
 * property or query parameter at fault, so a client can attach the message to a form
 * input; it is absent when the problem is not about one field.
 */
export type ValidationError = { field?: string; message: string };
