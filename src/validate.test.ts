import { test } from "node:test";
import assert from "node:assert/strict";

import type { ValidationError } from "./json_types.ts";
import type { ResourceSchema } from "./schema.ts";
import { validateBody, validateDataset } from "./validate.ts";

const schema = new Map([
  ["title", "string"],
  ["draft", "boolean"],
  ["tags", "array"],
] as const);

const createCases: { name: string; body: unknown; errors: ValidationError[] }[] = [
  {
    name: "valid body without id",
    body: { title: "Hello", draft: true, tags: ["a"] },
    errors: [],
  },
  {
    name: "id is not allowed",
    body: { id: 999, title: "Hello", draft: true, tags: ["a"] },
    errors: [{ field: "id", message: "is assigned by the server, leave it out" }],
  },
  {
    name: "body is not an object",
    body: [],
    errors: [{ message: "body must be a JSON object" }],
  },
  {
    name: "unknown property",
    body: { title: "Hello", draft: true, tags: [], extra: true },
    errors: [{ field: "extra", message: "unknown property, use title, draft or tags" }],
  },
  {
    name: "missing property is allowed",
    body: { title: "Hello", tags: [] },
    errors: [],
  },
  {
    name: "invalid property type",
    body: { title: "Hello", draft: "true", tags: [] },
    errors: [{ field: "draft", message: "must be a boolean" }],
  },
];

for (const { name, body, errors } of createCases) {
  test(name, () => {
    assert.deepEqual(validateBody(body, schema, "create"), errors);
  });
}

const replaceCases: { name: string; body: unknown; errors: ValidationError[] }[] = [
  {
    name: "valid replace body",
    body: { id: 1, title: "Hello", draft: true, tags: ["a"] },
    errors: [],
  },
  {
    name: "replace without id is allowed",
    body: { title: "Hello", draft: true, tags: ["a"] },
    errors: [],
  },
  {
    name: "replace id must be a positive integer",
    body: { id: 0, title: "Hello", draft: true, tags: ["a"] },
    errors: [{ field: "id", message: "must be a positive integer" }],
  },
  {
    name: "replace unknown property",
    body: { id: 1, title: "Hello", draft: true, tags: [], extra: true },
    errors: [{ field: "extra", message: "unknown property, use title, draft or tags" }],
  },
  {
    name: "replace missing property is allowed",
    body: { id: 1, title: "Hello", tags: [] },
    errors: [],
  },
];

for (const { name, body, errors } of replaceCases) {
  test(name, () => {
    assert.deepEqual(validateBody(body, schema, "replace"), errors);
  });
}

const patchCases: { name: string; body: unknown; errors: ValidationError[] }[] = [
  {
    name: "valid patch with one field",
    body: { title: "Hello" },
    errors: [],
  },
  {
    name: "valid empty patch",
    body: {},
    errors: [],
  },
  {
    name: "patch may include id",
    body: { id: 1, title: "Hello" },
    errors: [],
  },
  {
    name: "patch id must be a positive integer",
    body: { id: 0 },
    errors: [{ field: "id", message: "must be a positive integer" }],
  },
  {
    name: "patch unknown property",
    body: { extra: true },
    errors: [{ field: "extra", message: "unknown property, use title, draft or tags" }],
  },
  {
    name: "patch invalid property type",
    body: { draft: "true" },
    errors: [{ field: "draft", message: "must be a boolean" }],
  },
];

for (const { name, body, errors } of patchCases) {
  test(name, () => {
    assert.deepEqual(validateBody(body, schema, "patch"), errors);
  });
}

test("unknown property on a resource without properties names none", () => {
  assert.deepEqual(validateBody({ extra: true }, new Map(), "create"), [
    { field: "extra", message: "unknown property" },
  ]);
});

const commentsTable = new Map<string, ResourceSchema>([
  [
    "comments",
    new Map([
      ["postId", "number"],
      ["body", "string"],
    ]),
  ],
]);

const datasetCases: {
  name: string;
  input: unknown;
  declared?: Map<string, ResourceSchema>;
  errors: string[];
}[] = [
  {
    name: "valid dataset",
    input: { posts: [{ id: 1, title: "Hello" }] },
    errors: [],
  },
  {
    name: "root not an object",
    input: [],
    errors: ['must be an object of resources, like { "posts": [] }'],
  },
  {
    name: "empty root",
    input: {},
    errors: ['must have a resource, like { "posts": [] }'],
  },
  {
    name: "invalid resource name",
    input: { "1posts": [{ id: 1 }] },
    errors: [
      '"1posts": invalid resource name, use letters, digits and _, not starting with a digit',
    ],
  },
  {
    name: "resource not an array",
    input: { posts: {} },
    errors: ["posts: must be an array of rows"],
  },
  {
    name: "empty resource",
    input: { posts: [] },
    errors: [],
  },
  {
    name: "row not an object",
    input: { posts: ["nope"] },
    errors: ["posts[0]: must be an object"],
  },
  {
    name: "invalid property name",
    input: { posts: [{ id: 1, "bad-name": true }] },
    errors: [
      'posts[0]["bad-name"]: invalid property name, use letters, digits and _, not starting with a digit',
    ],
  },
  {
    name: "id missing",
    input: { posts: [{ title: "no id" }] },
    errors: ["posts[0].id: must be a positive integer"],
  },
  {
    name: "id not positive",
    input: { posts: [{ id: 0 }] },
    errors: ["posts[0].id: must be a positive integer"],
  },
  {
    name: "id not an integer",
    input: { posts: [{ id: 1.5 }] },
    errors: ["posts[0].id: must be a positive integer"],
  },
  {
    name: "duplicate id",
    input: { posts: [{ id: 1 }, { id: 1 }] },
    errors: ["posts[1].id: must be unique, posts[0].id is 1 too"],
  },
  {
    name: "a row may leave a property out",
    input: { posts: [{ id: 1, title: "a" }, { id: 2 }] },
    errors: [],
  },
  {
    name: "null marks intentional absence, no type error",
    input: {
      posts: [
        { id: 1, title: "a" },
        { id: 2, title: null },
      ],
    },
    errors: [],
  },
  {
    name: "type mismatch across rows",
    input: {
      users: [
        { id: 1, age: 30 },
        { id: 2, age: true },
      ],
    },
    errors: ["users[1].age: must be a number or null, like users[0].age"],
  },
  {
    name: "object and array values are allowed types",
    input: { posts: [{ id: 1, tags: ["a"], meta: { draft: true } }] },
    errors: [],
  },
  {
    name: "row index stays correct after an earlier invalid row",
    input: { posts: ["not-an-object", { id: 1, x: 1 }, { id: 2 }] },
    errors: ["posts[0]: must be an object"],
  },
  {
    name: "property with only null values has no inferable type",
    input: {
      posts: [
        { id: 1, title: null },
        { id: 2, title: null },
      ],
    },
    errors: [
      "posts.title: all values are null, give one a value or declare the column in db.schema.sql",
    ],
  },
  {
    name: "validateDataset types a declared column even when all values are null",
    input: {
      posts: [{ id: 1, title: "Hello" }],
      comments: [
        { id: 1, postId: null, body: "a" },
        { id: 2, postId: null, body: "b" },
      ],
    },
    declared: commentsTable,
    errors: [],
  },
  {
    name: "validateDataset rejects a declared column holding another type",
    input: {
      posts: [{ id: 1, title: "Hello" }],
      comments: [{ id: 1, postId: "1", body: "Nope" }],
    },
    declared: commentsTable,
    errors: ["comments[0].postId: must be a number or null, as declared in db.schema.sql"],
  },
  {
    name: "validateDataset accepts an empty declared resource and a declared column no row has",
    input: { comments: [], posts: [{ id: 1, title: "Hello" }] },
    declared: commentsTable,
    errors: [],
  },
  {
    name: "validateDataset rejects a property that is not a column of the declared table, with the column to add",
    input: { comments: [{ id: 1, postId: 1, body: "a", likes: 3 }] },
    declared: commentsTable,
    errors: [
      'comments.likes: not a column of "comments" in db.schema.sql, add it to its CREATE TABLE:\n' +
        '  "likes" REAL',
    ],
  },
  {
    name: "validateDataset rejects an all-null property that is not a column of the declared table",
    input: { comments: [{ id: 1, postId: 1, body: "a", likes: null }] },
    declared: commentsTable,
    errors: ['comments.likes: not a column of "comments" in db.schema.sql'],
  },
];

for (const { name, input, declared, errors } of datasetCases) {
  test(name, () => {
    assert.deepEqual(validateDataset(input, declared, "db.schema.sql").errors, errors);
  });
}

test("validateDataset infers the undeclared resources: properties in order of first appearance, typed by the first non-null value", () => {
  const { errors, inferred } = validateDataset(
    {
      posts: [
        { id: 1, title: null, views: 10 },
        { id: 2, title: "Hello", draft: false, tags: ["a"], meta: { x: 1 } },
      ],
      comments: [{ id: 1, postId: 1, body: "Nice" }],
    },
    commentsTable,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual([...inferred.keys()], ["posts"]);
  assert.deepEqual(
    inferred.get("posts"),
    new Map([
      ["title", "string"],
      ["views", "number"],
      ["draft", "boolean"],
      ["tags", "array"],
      ["meta", "object"],
    ]),
  );
});
