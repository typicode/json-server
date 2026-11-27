import { test } from "node:test";
import assert from "node:assert/strict";

import { fromSqlValue, propertyType } from "./sql.ts";
const fromValueCases: {
  type: Parameters<typeof fromSqlValue>[0];
  input: unknown;
  output: unknown;
}[] = [
  { type: "string", input: "hello", output: "hello" },
  { type: "number", input: 42, output: 42 },
  { type: "boolean", input: 1, output: true },
  { type: "boolean", input: 0, output: false },
  { type: "array", input: '["a","b"]', output: ["a", "b"] },
  { type: "object", input: '{"draft":true}', output: { draft: true } },
  { type: "object", input: null, output: null },
];

for (const { type, input, output } of fromValueCases) {
  test(`fromSqlValue(${type}, ${JSON.stringify(input)})`, () => {
    assert.deepEqual(fromSqlValue(type, input), output);
  });
}

const declaredCases: { input: string; output: ReturnType<typeof propertyType> }[] = [
  { input: "TEXT", output: "string" },
  { input: "varchar(80)", output: "string" },
  { input: "INTEGER", output: "number" },
  { input: "REAL", output: "number" },
  { input: "NUMERIC", output: "number" },
  { input: "BOOLEAN", output: "boolean" },
  { input: "bool", output: "boolean" },
  { input: "JSON", output: "object" },
  { input: "ARRAY", output: "array" },
  { input: "BLOB", output: undefined },
  { input: "", output: undefined },
];

for (const { input, output } of declaredCases) {
  test(`propertyType("${input}") -> ${output}`, () => {
    assert.equal(propertyType(input), output);
  });
}
