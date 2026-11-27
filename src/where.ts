import {
  NAME_PATTERN,
  isPlainObject,
  listOf,
  valueType,
  type ValidationError,
} from "./json_types.ts";
import type { PropertyType, ResourceSchema } from "./schema.ts";
import { toSqlValue, type SqlValue } from "./sql.ts";

// In the order the README lists them, for the messages that name the valid ones.
const OPERATORS = ["eq", "lt", "lte", "gt", "gte", "in", "like", "has", "is"] as const;

export type Operator = (typeof OPERATORS)[number];

// `in` and `has` take more than an operator, `selectSql` builds them.
const SQL_OP: Record<Exclude<Operator, "in" | "has">, string> = {
  eq: "=",
  lt: "<",
  lte: "<=",
  gt: ">",
  gte: ">=",
  like: "LIKE",
  is: "IS",
};

type Scalar = boolean | number | string | null;

/** A value a filter compares a property to. */
type Value = string | number | boolean;

/**
 * The conditions on one property, all of which a row must meet. In a URL, each one is a
 * `where.<property>.<operator>` parameter, or `where.<property>.not.<operator>`.
 */
export type Condition = {
  eq?: Value;
  lt?: string | number;
  lte?: string | number;
  gt?: string | number;
  gte?: string | number;
  in?: Value[];
  /** `*` is the wildcard. */
  like?: string;
  /** For an array property: one of its items is this value. */
  has?: Value;
  is?: null;
  /** The same operators, negated. */
  not?: Omit<Condition, "not">;
};

/**
 * What `Store.list` takes: the parameters of a `GET /:resource`, as an object with JSON
 * values. `{ where: { views: { gte: 10 } }, orderBy: { id: "desc" }, limit: 20 }` is
 * `?where.views.gte=10&orderBy.id=desc&limit=20`.
 */
export type ListParams = {
  where?: Record<string, Condition>;
  orderBy?: Record<string, "asc" | "desc">;
  limit?: number;
  offset?: number;
};

export type WhereFilter = {
  column: string;
  not: boolean;
  op: Operator;
  values: Scalar[];
};

export type OrderBy = { column: string; direction: "ASC" | "DESC" };

/** The list parameters, parsed: what `selectSql` builds the statement from. */
export type SelectQuery = {
  filters: WhereFilter[];
  orderBy: OrderBy[];
  limit: number | undefined;
  offset: number | undefined;
};

type Parsed = SelectQuery & { errors: ValidationError[] };

/**
 * Parses the list parameters, from a URL or a `ListParams`, against the resource's schema.
 * Each problem is an error on the parameter at fault, named as in a URL.
 */
export function parseQuery(input: URLSearchParams | ListParams, schema: ResourceSchema): Parsed {
  const parsed: Parsed = {
    filters: [],
    orderBy: [],
    limit: undefined,
    offset: undefined,
    errors: [],
  };
  if (input instanceof URLSearchParams) fromParams(parsed, input, schema);
  else fromObject(parsed, input, schema);
  if (parsed.offset !== undefined && parsed.limit === undefined) {
    parsed.errors.push({ field: "offset", message: 'requires "limit"' });
  }
  return parsed;
}

// The parameters of json-server v0 and v1, which clients and agents try first, and what
// to use instead.
const OLD_PARAMS: Record<string, string> = {
  _sort: "orderBy.<property>=asc or desc",
  _order: "orderBy.<property>=asc or desc",
  _limit: "limit",
  _start: "offset",
  _page: "limit and offset",
  _per_page: "limit and offset",
  page: "limit and offset",
  q: "where.<property>.like, there is no full-text search",
};

/**
 * What to write instead of the unknown parameter `key`: `where.title.eq` for `title` or
 * `title:eq`, the replacement of a v0/v1 parameter, or else the forms there are.
 */
function replacementOf(key: string, schema: ResourceSchema): string {
  const [property = "", op = "eq", ...rest] = key.split(":");
  if (schema.has(property) && OPERATORS.includes(op as Operator) && rest.length === 0) {
    return `where.${property}.${op}`;
  }
  return OLD_PARAMS[key] ?? "where.<property>.<operator>, orderBy.<property>, limit or offset";
}

function fromParams(parsed: Parsed, params: URLSearchParams, schema: ResourceSchema): void {
  const fail = (field: string, message: string) => parsed.errors.push({ field, message });

  for (const key of ["limit", "offset"] as const) {
    const raw = params.getAll(key);
    if (raw.length > 1) fail(key, "must not be repeated");
    else if (raw.length === 1) parsed[key] = paging(parsed, key, parseUnsigned(raw[0]!));
  }

  for (const [key, raw] of params) {
    if (key === "limit" || key === "offset") continue;

    if (key.startsWith("orderBy.")) {
      const parts = key.split(".");
      if (parts.length !== 2) fail(key, "must be orderBy.<property>");
      else addOrder(parsed, schema, key, parts[1]!, raw);
      continue;
    }

    if (!key.startsWith("where.")) {
      fail(key, `unknown query parameter, use ${replacementOf(key, schema)}`);
      continue;
    }

    const where = parseWhereKey(key);
    if (where === undefined) {
      fail(key, "must be where.<property>.<operator> or where.<property>.not.<operator>");
      continue;
    }
    const { column, not, op } = where;
    addFilter(parsed, schema, key, column, not, op, (op, type) => parseValue(op, type, raw));
  }
}

function fromObject(parsed: Parsed, query: ListParams, schema: ResourceSchema): void {
  const fail = (field: string, message: string) => parsed.errors.push({ field, message });
  const conditionMessage = "must be an object of operators, like { eq: value }";

  for (const key of Object.keys(query)) {
    if (["where", "orderBy", "limit", "offset"].includes(key)) continue;
    // A URL parameter name: the object nests what the URL joins with dots.
    if (key.includes(".")) fail(key, "must be nested, like { where: { title: { eq: value } } }");
    else fail(key, "unknown parameter, use where, orderBy, limit or offset");
  }
  if (query.limit !== undefined) parsed.limit = paging(parsed, "limit", query.limit);
  if (query.offset !== undefined) parsed.offset = paging(parsed, "offset", query.offset);

  for (const [column, condition] of Object.entries(query.where ?? {})) {
    const key = `where.${column}`;
    if (!isPlainObject(condition)) {
      fail(key, conditionMessage);
      continue;
    }
    for (const [op, value] of Object.entries(condition)) {
      if (op !== "not") {
        addFilter(parsed, schema, `${key}.${op}`, column, false, op, (op, type) =>
          checkValue(op, type, value),
        );
      } else if (!isPlainObject(value)) {
        fail(`${key}.not`, conditionMessage);
      } else {
        for (const [notOp, notValue] of Object.entries(value)) {
          addFilter(parsed, schema, `${key}.not.${notOp}`, column, true, notOp, (op, type) =>
            checkValue(op, type, notValue),
          );
        }
      }
    }
  }

  for (const [column, direction] of Object.entries(query.orderBy ?? {})) {
    addOrder(parsed, schema, `orderBy.${column}`, column, direction);
  }
}

/**
 * Adds the filter of the parameter `key` on `column`, or its error. `operand` reads its
 * value for an operator the property's type allows: a list of values, or the error message.
 */
function addFilter(
  parsed: Parsed,
  schema: ResourceSchema,
  key: string,
  column: string,
  not: boolean,
  op: string,
  operand: (op: Operator, type: PropertyType) => Scalar[] | string,
): void {
  const fail = (message: string) => parsed.errors.push({ field: key, message });
  const type = fieldType(column, schema);
  if (type === undefined) {
    fail(unknownProperty(schema));
    return;
  }
  const allowed = OPERATORS.filter((candidate) => operatorAllowed(candidate, type));
  if (!isOperator(op)) {
    fail(`unknown operator, use ${listOf(allowed)}`);
  } else if (!allowed.includes(op)) {
    fail(`operator "${op}" is not allowed on ${type} properties, use ${listOf(allowed)}`);
  } else {
    const values = operand(op, type);
    if (typeof values === "string") fail(values);
    else parsed.filters.push({ column, not, op, values });
  }
}

function addOrder(
  parsed: Parsed,
  schema: ResourceSchema,
  key: string,
  column: string,
  direction: unknown,
): void {
  const fail = (message: string) => parsed.errors.push({ field: key, message });
  if (fieldType(column, schema) === undefined) fail(unknownProperty(schema));
  else if (direction === "asc") parsed.orderBy.push({ column, direction: "ASC" });
  else if (direction === "desc") parsed.orderBy.push({ column, direction: "DESC" });
  else fail("must be asc or desc");
}

/** `limit` or `offset` when it is an integer of at least 1 or 0, else `undefined` and its error. */
function paging(parsed: Parsed, key: "limit" | "offset", n: unknown): number | undefined {
  const min = key === "limit" ? 1 : 0;
  if (typeof n === "number" && Number.isSafeInteger(n) && n >= min) return n;
  const message = min > 0 ? "must be a positive integer" : "must be a non-negative integer";
  parsed.errors.push({ field: key, message });
  return undefined;
}

export function selectSql(
  resource: string,
  { filters, orderBy, limit, offset }: SelectQuery,
): { sql: string; values: SqlValue[] } {
  let sql = `SELECT * FROM "${resource}"`;
  const values: SqlValue[] = [];

  if (filters.length > 0) {
    const clauses = filters.map((filter) => {
      const placeholders = filter.values.map(() => "?").join(", ");
      let clause: string;
      if (filter.op === "in") clause = `"${filter.column}" IN (${placeholders})`;
      else if (filter.op === "has") {
        // NULL when the column is, so that `not` does not match a missing array, like the others.
        const exists = `EXISTS (SELECT 1 FROM json_each("${filter.column}") WHERE value = ?)`;
        clause = `CASE WHEN "${filter.column}" IS NULL THEN NULL ELSE ${exists} END`;
      } else clause = `"${filter.column}" ${SQL_OP[filter.op]} ?`;
      values.push(...filter.values.map(toSqlValue));
      return filter.not ? `NOT (${clause})` : clause;
    });
    sql += ` WHERE ${clauses.join(" AND ")}`;
  }

  if (orderBy.length > 0) {
    sql += ` ORDER BY ${orderBy.map((item) => `"${item.column}" ${item.direction}`).join(", ")}`;
  }

  if (limit !== undefined) {
    sql += " LIMIT ?";
    values.push(limit);
    if (offset !== undefined) {
      sql += " OFFSET ?";
      values.push(offset);
    }
  }

  return { sql, values };
}

function unknownProperty(schema: ResourceSchema): string {
  const names = ["id", ...schema.keys()].filter((name) => NAME_PATTERN.test(name));
  return `unknown property, use ${listOf(names)}`;
}

/**
 * The column's type, or undefined when the parameter cannot name it. Only an identifier can:
 * the column is interpolated into the SQL, and a SQLite file may have a column named `a"b`.
 */
function fieldType(column: string, schema: ResourceSchema): PropertyType | undefined {
  if (!NAME_PATTERN.test(column)) return undefined;
  if (column === "id") return "number";
  return schema.get(column);
}

function operatorAllowed(op: Operator, type: PropertyType): boolean {
  if (op === "is") return true;
  if (op === "has") return type === "array";
  if (type === "object" || type === "array") return false;
  if (op === "like") return type === "string";
  if (op === "eq" || op === "in") return true;
  return type === "string" || type === "number";
}

function parseUnsigned(value: string): number | undefined {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || String(n) !== value) return undefined;
  return n;
}

/** Parses a filter operand. A string is the error message for the parameter. */
function parseValue(op: Operator, type: PropertyType, raw: string): Scalar[] | string {
  if (op === "is") return raw === "null" ? [null] : "must be null";
  if (op === "like") return [raw.replaceAll("*", "%")];
  if (op === "in") return parseIn(type, raw);
  if (op === "has") return parseItem(raw);

  const parsed = parseScalar(type, raw);
  return typeof parsed === "string" ? parsed : [parsed.value];
}

/** Checks a filter operand of a `ListParams`. A string is the error message for the parameter. */
function checkValue(op: Operator, type: PropertyType, value: unknown): Scalar[] | string {
  if (op === "is") return value === null ? [null] : "must be null";
  if (op === "like")
    return typeof value === "string" ? [value.replaceAll("*", "%")] : "must be a string";
  if (op === "has") {
    const item = valueType(value);
    return item === "string" || item === "number" || item === "boolean"
      ? [value as Value]
      : "must be a string, a number or a boolean";
  }
  if (op !== "in") return checkScalar(type, value) ?? [value as Value];

  if (!Array.isArray(value) || value.length === 0) return "must be a non-empty array";
  for (const item of value) {
    const error = checkScalar(type, item);
    if (error !== undefined) return error;
  }
  return value as Value[];
}

function checkScalar(type: PropertyType, value: unknown): string | undefined {
  if (value === null) return 'must not be null, use the "is" operator';
  if (valueType(value) !== type || (type === "number" && !Number.isFinite(value))) {
    return `must be a ${type}`;
  }
  return undefined;
}

function parseScalar(
  type: PropertyType,
  raw: string,
): { value: boolean | number | string } | string {
  if (type === "boolean") {
    if (raw === "true") return { value: true };
    if (raw === "false") return { value: false };
    return "must be true or false";
  }

  if (type === "number") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "number" && Number.isFinite(parsed)) return { value: parsed };
    } catch {
      // not JSON
    }
    return "must be a number";
  }

  return { value: raw };
}

/** Splits a `where.` key. The operator is checked later, against the property's type. */
function parseWhereKey(key: string): { column: string; not: boolean; op: string } | undefined {
  const parts = key.split(".");
  if (parts.length === 3 && parts[2] !== "not") {
    return { column: parts[1], not: false, op: parts[2] };
  }
  if (parts.length === 4 && parts[2] === "not") {
    return { column: parts[1], not: true, op: parts[3] };
  }
  return undefined;
}

function parseIn(type: PropertyType, raw: string): Scalar[] | string {
  if (raw.length === 0) return "must not be empty";
  const items = raw.split(",");
  if (items.some((item) => item.length === 0 || item.includes(" "))) {
    return "must be a comma-separated list without spaces";
  }

  const values: Scalar[] = [];
  for (const item of items) {
    if (item === "null") return 'must not contain null, use the "is" operator';
    const parsed = parseScalar(type, item);
    if (typeof parsed === "string") return parsed;
    values.push(parsed.value);
  }
  return values;
}

/**
 * Parses a `has` operand. Array items are untyped, so a JSON scalar (`1`, `true`) is taken as
 * such and anything else as a string. A JSON `null` is refused: an array never "has" one.
 */
function parseItem(raw: string): Scalar[] | string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null) return "must not be null";
    if (typeof parsed === "number" || typeof parsed === "boolean") return [parsed];
  } catch {
    // not JSON, a string
  }
  return [raw];
}

function isOperator(value: string): value is Operator {
  return (OPERATORS as readonly string[]).includes(value);
}
