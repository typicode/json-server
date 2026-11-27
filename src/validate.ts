import {
  NAME_PATTERN,
  isPlainObject,
  isPositiveInteger,
  listOf,
  valueType,
  type ValidationError,
} from "./json_types.ts";
import type { ResourceSchema } from "./schema.ts";
import { sqlType } from "./sql.ts";

// What the two entry points check is the same thing at two moments: a JSON value against
// the resource's schema. `validateBody` for a request body, `validateDataset` for a file.

export type WriteMode = "create" | "replace" | "patch";

/**
 * Checks a write body against the resource's schema: a JSON object, known properties of
 * the right type. `id` is refused on create, optional otherwise (the store checks it
 * matches the target).
 */
export function validateBody(
  body: unknown,
  schema: ResourceSchema,
  mode: WriteMode,
): ValidationError[] {
  if (!isPlainObject(body)) return [{ message: "body must be a JSON object" }];

  const errors: ValidationError[] = [];
  // The properties a body can write, named in the message for one it cannot.
  const known = [...schema.keys()];
  const unknown = known.length > 0 ? `unknown property, use ${listOf(known)}` : "unknown property";

  for (const field of Object.keys(body)) {
    if (field === "id") {
      if (mode === "create") {
        errors.push({ field, message: "is assigned by the server, leave it out" });
      }
      continue;
    }
    if (!schema.has(field)) {
      errors.push({ field, message: unknown });
    }
  }

  if (mode !== "create" && Object.hasOwn(body, "id") && !isPositiveInteger(body.id)) {
    errors.push({ field: "id", message: "must be a positive integer" });
  }

  for (const [field, type] of schema) {
    if (!Object.hasOwn(body, field)) continue; // absent: the column's default on create, null on replace

    const value = body[field];
    if (value === null) continue; // NOT NULL, if any, is SQLite's to refuse
    if (valueType(value) !== type)
      errors.push({ field, message: `must be ${article(type)} ${type}` });
  }

  return errors;
}

// A message names what it is about by its path in the file, as JavaScript would write it:
// `posts`, `posts[1]`, `posts[1].title`, `posts.title` for every row.

const NAME_RULE = "use letters, digits and _, not starting with a digit";

/**
 * Validates the dataset shape, `{ resourceName: [row, ...] }`, and each resource's rows,
 * and infers the schema of the resources the schema file does not declare: their
 * properties in order of first appearance, typed by their first non-null value. A
 * resource declared in the schema file (`declared`) must fit its table: only its
 * columns, with their types. `schemaFile` names the file in messages.
 */
export function validateDataset(
  data: unknown,
  declared: ReadonlyMap<string, ResourceSchema> = new Map(),
  schemaFile = "the schema file",
): { errors: string[]; inferred: Map<string, ResourceSchema> } {
  const errors: string[] = [];
  const inferred = new Map<string, ResourceSchema>();

  if (!isPlainObject(data)) {
    return { errors: ['must be an object of resources, like { "posts": [] }'], inferred };
  }

  const resourceNames = Object.keys(data);
  if (resourceNames.length === 0 && declared.size === 0) {
    return { errors: ['must have a resource, like { "posts": [] }'], inferred };
  }

  for (const name of resourceNames) {
    if (!NAME_PATTERN.test(name)) {
      errors.push(`${JSON.stringify(name)}: invalid resource name, ${NAME_RULE}`);
      continue;
    }

    const rows = data[name];
    if (!Array.isArray(rows)) {
      errors.push(`${name}: must be an array of rows`);
      continue;
    }

    const table = declared.get(name);
    const schema = validateResource(name, rows, table, schemaFile, errors);
    if (table === undefined) inferred.set(name, schema);
  }

  return { errors, inferred };
}

/**
 * Checks each row and returns the resource's schema: the declared table's, or the one
 * inferred from the rows. A property's type is its column type, or the type of its first
 * non-null value; every other value must agree. A property that is not a column of the
 * declared table is an error, with the column line to add to its `CREATE TABLE`. A row
 * may leave properties out: they are `null`.
 */
function validateResource(
  resource: string,
  rows: unknown[],
  table: ResourceSchema | undefined,
  schemaFile: string,
  errors: string[],
): ResourceSchema {
  const seenIds = new Map<number, number>(); // id -> row index
  const types: ResourceSchema = new Map(table ?? []);
  const typedBy = new Map<string, number>(); // property -> index of the row that typed it
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const at = `${resource}[${index}]`;
    if (!isPlainObject(row)) {
      errors.push(`${at}: must be an object`);
      return;
    }
    validateId(resource, row.id, index, seenIds, errors);

    for (const [property, value] of Object.entries(row)) {
      if (property === "id") continue;
      if (!NAME_PATTERN.test(property)) {
        errors.push(`${at}[${JSON.stringify(property)}]: invalid property name, ${NAME_RULE}`);
        continue;
      }
      seen.add(property);
      const type = valueType(value);
      if (type === "null" || type === "other") continue; // intentional absence, no type to check

      const expected = types.get(property);
      if (expected === undefined) {
        types.set(property, type);
        typedBy.set(property, index);
      } else if (type !== expected) {
        const first = typedBy.get(property);
        const like =
          first === undefined
            ? `as declared in ${schemaFile}`
            : `like ${resource}[${first}].${property}`;
        errors.push(`${at}.${property}: must be ${article(expected)} ${expected} or null, ${like}`);
      }
    }
  });

  for (const property of seen) {
    const type = types.get(property);
    if (table === undefined) {
      if (type === undefined) {
        errors.push(
          `${resource}.${property}: all values are null, give one a value or declare the column in ${schemaFile}`,
        );
      }
    } else if (!table.has(property)) {
      errors.push(
        `${resource}.${property}: not a column of "${resource}" in ${schemaFile}` +
          (type === undefined
            ? ""
            : `, add it to its CREATE TABLE:\n  "${property}" ${sqlType(type)}`),
      );
    }
  }

  return types;
}

function validateId(
  resource: string,
  id: unknown,
  index: number,
  seenIds: Map<number, number>,
  errors: string[],
): void {
  if (!isPositiveInteger(id)) {
    errors.push(`${resource}[${index}].id: must be a positive integer`);
    return;
  }

  const first = seenIds.get(id);
  if (first !== undefined) {
    errors.push(`${resource}[${index}].id: must be unique, ${resource}[${first}].id is ${id} too`);
    return;
  }

  seenIds.set(id, index);
}

/** `a` or `an`, for the property types: `an array`, `a string`. */
function article(word: string): string {
  return /^[aeiou]/.test(word) ? "an" : "a";
}
