import { test } from "node:test";
import assert from "node:assert/strict";

import type { ValidationError } from "./json_types.ts";
import { parseQuery, type ListParams } from "./where.ts";

const schema = new Map([
  ["title", "string"],
  ["views", "number"],
  ["draft", "boolean"],
  ["tags", "array"],
  // A SQLite file may have it; a parameter must not reach it.
  ['a"b', "string"],
] as const);

function parse(search: string) {
  return parseQuery(new URL(`http://localhost/posts${search}`).searchParams, schema);
}

const errorCases: { name: string; search: string; errors: ValidationError[] }[] = [
  { name: "no query", search: "", errors: [] },
  {
    name: "unknown parameter",
    search: "?title=Hello",
    errors: [
      {
        field: "title",
        message: "unknown query parameter, use where.title.eq",
      },
    ],
  },
  {
    name: "v1 parameters",
    search: "?_sort=title&_limit=1&page=2&q=a",
    errors: [
      { field: "_sort", message: "unknown query parameter, use orderBy.<property>=asc or desc" },
      { field: "_limit", message: "unknown query parameter, use limit" },
      { field: "page", message: "unknown query parameter, use limit and offset" },
      {
        field: "q",
        message: "unknown query parameter, use where.<property>.like, there is no full-text search",
      },
    ],
  },
  {
    name: "operator after a colon",
    search: "?views:gt=1",
    errors: [{ field: "views:gt", message: "unknown query parameter, use where.views.gt" }],
  },
  {
    name: "parameter that is no property",
    search: "?foo=1",
    errors: [
      {
        field: "foo",
        message:
          "unknown query parameter, use where.<property>.<operator>, orderBy.<property>, limit or offset",
      },
    ],
  },
  {
    name: "unknown operator",
    search: "?where.views.xyz=1",
    errors: [
      { field: "where.views.xyz", message: "unknown operator, use eq, lt, lte, gt, gte, in or is" },
    ],
  },
  {
    name: "like on number",
    search: "?where.views.like=1*",
    errors: [
      {
        field: "where.views.like",
        message:
          'operator "like" is not allowed on number properties, use eq, lt, lte, gt, gte, in or is',
      },
    ],
  },
  {
    name: "not without operator",
    search: "?where.title.not=Hello",
    errors: [
      {
        field: "where.title.not",
        message: "must be where.<property>.<operator> or where.<property>.not.<operator>",
      },
    ],
  },
  {
    name: "unknown field",
    search: "?where.nope.eq=1",
    errors: [
      { field: "where.nope.eq", message: "unknown property, use id, title, views, draft or tags" },
    ],
  },
  {
    name: "field that is not a name",
    search: "?where.a-b.eq=1",
    errors: [
      { field: "where.a-b.eq", message: "unknown property, use id, title, views, draft or tags" },
    ],
  },
  {
    name: "column that is not a name",
    search: '?where.a"b.eq=1&orderBy.a"b=asc',
    errors: [
      { field: 'where.a"b.eq', message: "unknown property, use id, title, views, draft or tags" },
      { field: 'orderBy.a"b', message: "unknown property, use id, title, views, draft or tags" },
    ],
  },
  {
    name: "eq on array",
    search: "?where.tags.eq=a",
    errors: [
      {
        field: "where.tags.eq",
        message: 'operator "eq" is not allowed on array properties, use has or is',
      },
    ],
  },
  {
    name: "has on string",
    search: "?where.title.has=a",
    errors: [
      {
        field: "where.title.has",
        message:
          'operator "has" is not allowed on string properties, use eq, lt, lte, gt, gte, in, like or is',
      },
    ],
  },
  {
    name: "has null",
    search: "?where.tags.has=null",
    errors: [{ field: "where.tags.has", message: "must not be null" }],
  },
  {
    name: "comparison on boolean",
    search: "?where.draft.gt=true",
    errors: [
      {
        field: "where.draft.gt",
        message: 'operator "gt" is not allowed on boolean properties, use eq, in or is',
      },
    ],
  },
  {
    name: "boolean operand",
    search: "?where.draft.eq=yes",
    errors: [{ field: "where.draft.eq", message: "must be true or false" }],
  },
  {
    name: "number operand",
    search: "?where.views.eq=abc",
    errors: [{ field: "where.views.eq", message: "must be a number" }],
  },
  {
    name: "is operand not null",
    search: "?where.title.is=true",
    errors: [{ field: "where.title.is", message: "must be null" }],
  },
  {
    name: "empty in list",
    search: "?where.title.in=",
    errors: [{ field: "where.title.in", message: "must not be empty" }],
  },
  {
    name: "spaces in in list",
    search: "?where.title.in=a, b",
    errors: [{ field: "where.title.in", message: "must be a comma-separated list without spaces" }],
  },
  {
    name: "null in in list",
    search: "?where.title.in=a,null",
    errors: [{ field: "where.title.in", message: 'must not contain null, use the "is" operator' }],
  },
  {
    name: "in on array",
    search: "?where.tags.in=a,b",
    errors: [
      {
        field: "where.tags.in",
        message: 'operator "in" is not allowed on array properties, use has or is',
      },
    ],
  },
  {
    name: "unknown orderBy field",
    search: "?orderBy.nope=asc",
    errors: [
      { field: "orderBy.nope", message: "unknown property, use id, title, views, draft or tags" },
    ],
  },
  {
    name: "invalid orderBy direction",
    search: "?orderBy.views=up",
    errors: [{ field: "orderBy.views", message: "must be asc or desc" }],
  },
  {
    name: "empty orderBy direction",
    search: "?orderBy.views=",
    errors: [{ field: "orderBy.views", message: "must be asc or desc" }],
  },
  {
    name: "invalid orderBy key",
    search: "?orderBy.views.desc=",
    errors: [{ field: "orderBy.views.desc", message: "must be orderBy.<property>" }],
  },
  {
    name: "limit zero",
    search: "?limit=0",
    errors: [{ field: "limit", message: "must be a positive integer" }],
  },
  {
    name: "limit not an integer",
    search: "?limit=1.5",
    errors: [{ field: "limit", message: "must be a positive integer" }],
  },
  {
    name: "limit repeated",
    search: "?limit=1&limit=2",
    errors: [{ field: "limit", message: "must not be repeated" }],
  },
  {
    name: "offset without limit",
    search: "?offset=1",
    errors: [{ field: "offset", message: 'requires "limit"' }],
  },
  {
    name: "offset negative",
    search: "?offset=-1",
    errors: [{ field: "offset", message: "must be a non-negative integer" }],
  },
  {
    name: "offset repeated",
    search: "?limit=1&offset=0&offset=1",
    errors: [{ field: "offset", message: "must not be repeated" }],
  },
];

for (const { name, search, errors } of errorCases) {
  test(name, () => {
    assert.deepEqual(parse(search).errors, errors);
  });
}

test("parses eq filters including empty string, dots, and id", () => {
  assert.deepEqual(
    parse(
      "?where.title.eq=Hello.World&where.draft.eq=false&where.views.eq=10&where.id.eq=2&where.title.eq=",
    ),
    {
      filters: [
        { column: "title", not: false, op: "eq", values: ["Hello.World"] },
        { column: "draft", not: false, op: "eq", values: [false] },
        { column: "views", not: false, op: "eq", values: [10] },
        { column: "id", not: false, op: "eq", values: [2] },
        { column: "title", not: false, op: "eq", values: [""] },
      ],
      orderBy: [],
      limit: undefined,
      offset: undefined,
      errors: [],
    },
  );
});

test("parses has filters as JSON scalars or strings", () => {
  assert.deepEqual(
    parse("?where.tags.has=news&where.tags.has=1&where.tags.not.has=true&where.tags.has=%5B1%5D")
      .filters,
    [
      { column: "tags", not: false, op: "has", values: ["news"] },
      { column: "tags", not: false, op: "has", values: [1] },
      { column: "tags", not: true, op: "has", values: [true] },
      { column: "tags", not: false, op: "has", values: ["[1]"] },
    ],
  );
});

test("a ListParams parses like the URL it stands for, with JSON values", () => {
  const query: ListParams = {
    where: {
      title: { eq: "a,b c", not: { like: "x*" } },
      views: { gte: 10, in: [1, 2] },
      draft: { is: null },
      tags: { has: "1" },
    },
    orderBy: { views: "desc" },
    limit: 5,
    offset: 10,
  };
  assert.deepEqual(parseQuery(query, schema), {
    ...parse(
      "?where.title.eq=a&where.title.not.like=x*&where.views.gte=10&where.views.in=1,2" +
        "&where.draft.is=null&where.tags.has=1&orderBy.views=desc&limit=5&offset=10",
    ),
    // What a URL cannot say: a string with a comma or a space, a string that looks like a number.
    filters: [
      { column: "title", not: false, op: "eq", values: ["a,b c"] },
      { column: "title", not: true, op: "like", values: ["x%"] },
      { column: "views", not: false, op: "gte", values: [10] },
      { column: "views", not: false, op: "in", values: [1, 2] },
      { column: "draft", not: false, op: "is", values: [null] },
      { column: "tags", not: false, op: "has", values: ["1"] },
    ],
  });
});

const objectErrorCases: { name: string; query: unknown; errors: ValidationError[] }[] = [
  {
    name: "a URL parameter name",
    query: { "where.title.eq": "Hello" },
    errors: [
      {
        field: "where.title.eq",
        message: "must be nested, like { where: { title: { eq: value } } }",
      },
    ],
  },
  {
    name: "an unknown key",
    query: { sort: "title" },
    errors: [{ field: "sort", message: "unknown parameter, use where, orderBy, limit or offset" }],
  },
  {
    name: "a value instead of its operator",
    query: { where: { title: "Hello" } },
    errors: [
      { field: "where.title", message: "must be an object of operators, like { eq: value }" },
    ],
  },
  {
    name: "a value of the wrong type",
    query: { where: { views: { gt: "10" }, draft: { not: { eq: "yes" } } } },
    errors: [
      { field: "where.views.gt", message: "must be a number" },
      { field: "where.draft.not.eq", message: "must be a boolean" },
    ],
  },
  {
    name: "null outside is",
    query: { where: { title: { eq: null }, views: { in: [1, null] } } },
    errors: [
      { field: "where.title.eq", message: 'must not be null, use the "is" operator' },
      { field: "where.views.in", message: 'must not be null, use the "is" operator' },
    ],
  },
  {
    name: "an empty in",
    query: { where: { views: { in: [] } } },
    errors: [{ field: "where.views.in", message: "must be a non-empty array" }],
  },
  {
    name: "an operator the type does not allow",
    query: { where: { views: { like: "1*" } } },
    errors: [
      {
        field: "where.views.like",
        message:
          'operator "like" is not allowed on number properties, use eq, lt, lte, gt, gte, in or is',
      },
    ],
  },
  {
    name: "a bad direction and paging",
    query: { orderBy: { views: "up" }, limit: 0, offset: 1.5 },
    errors: [
      { field: "limit", message: "must be a positive integer" },
      { field: "offset", message: "must be a non-negative integer" },
      { field: "orderBy.views", message: "must be asc or desc" },
    ],
  },
];

for (const { name, query, errors } of objectErrorCases) {
  test(`ListParams error: ${name}`, () => {
    assert.deepEqual(parseQuery(query as ListParams, schema).errors, errors);
  });
}
