import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempDisposableSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { Dataset } from "./json_types.ts";
import { JsonSource, schemaFileOf } from "./json_source.ts";
import { DatasetError, type SourceOptions } from "./source.ts";
import { SqliteSource } from "./sqlite_source.ts";
import { Store, StoreError, type StoreErrorStatus } from "./store.ts";

const status =
  (code: StoreErrorStatus) =>
  (error: unknown): boolean =>
    error instanceof StoreError && error.status === code;

/** A schema file declaring `comments` with `postId` referencing `posts`; `posts` is inferred. */
const commentOnPost = `CREATE TABLE "comments" (
  "id" INTEGER PRIMARY KEY,
  "body" TEXT,
  "postId" INTEGER REFERENCES "posts"("id")
);`;

const dirs: string[] = [];
test.after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function makeStore(
  dataset: Dataset,
  schema: string | null = null,
  options: SourceOptions = {},
): { store: Store; file: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "json-server-store-"));
  dirs.push(dir);
  const file = path.join(dir, "db.json");
  writeFileSync(file, JSON.stringify(dataset));
  if (schema !== null) writeFileSync(path.join(dir, "db.schema.sql"), schema);
  return { store: new Store(new JsonSource(file, options)), file };
}

const readFile = (file: string): Dataset => JSON.parse(readFileSync(file, "utf8"));

const blog: Dataset = {
  posts: [
    { id: 1, title: "Hello", views: 10, draft: false },
    { id: 2, title: "World", views: 3, draft: true },
  ],
  comments: [{ id: 1, body: "Nice", postId: 1 }],
};

test("resources() lists resource names sorted", () => {
  const { store } = makeStore(blog);
  assert.deepEqual(store.resources(), ["comments", "posts"]);
});

test("list() returns JSON rows, with a ListParams or URLSearchParams", () => {
  const { store } = makeStore(blog);
  assert.deepEqual(store.list("posts"), blog.posts);
  assert.deepEqual(store.list("posts", { where: { draft: { eq: true } } }), [blog.posts[1]]);
  assert.deepEqual(store.list("posts", new URLSearchParams("orderBy.views=asc&limit=1")), [
    blog.posts[1],
  ]);
});

test("list() rejects a bad parameter and an unknown resource", () => {
  const { store } = makeStore(blog);
  assert.throws(
    () => store.list("posts", { where: { nope: { eq: 1 } } }),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 400 &&
      error.errors.length === 1 &&
      error.errors[0]?.field === "where.nope.eq",
  );
  assert.throws(() => store.list("nope"), status(404));
});

const filterCases: { name: string; params: string; ids: number[] }[] = [
  {
    name: "eq on two properties",
    params: "where.title.eq=Hello&where.draft.eq=false",
    ids: [1, 3],
  },
  { name: "eq on id", params: "where.id.eq=2", ids: [2] },
  { name: "comparisons", params: "where.views.gt=10&where.views.lte=30", ids: [2, 3] },
  { name: "not, which a null does not satisfy", params: "where.title.not.eq=Hello", ids: [2] },
  { name: "is null", params: "where.title.is=null", ids: [4] },
  { name: "not is null", params: "where.title.not.is=null", ids: [1, 2, 3] },
  { name: "like with * wildcard", params: "where.title.like=H*", ids: [1, 3] },
  { name: "in", params: "where.views.in=10,40", ids: [1, 4] },
  { name: "has a string", params: "where.tags.has=news", ids: [4] },
  { name: "has a number", params: "where.tags.has=1", ids: [4] },
  { name: "not has, which a null does not satisfy", params: "where.tags.not.has=news", ids: [] },
  { name: "orderBy desc", params: "orderBy.views=desc", ids: [4, 3, 2, 1] },
  { name: "orderBy two keys", params: "orderBy.title=asc&orderBy.views=desc", ids: [4, 3, 1, 2] },
  { name: "limit and offset", params: "orderBy.id=asc&limit=2&offset=1", ids: [2, 3] },
];

for (const { name, params, ids } of filterCases) {
  test(`list() runs ${name} against SQLite`, () => {
    const { store } = makeStore({
      posts: [
        { id: 1, title: "Hello", views: 10, draft: false },
        { id: 2, title: "World", views: 20, draft: true },
        { id: 3, title: "Hello", views: 30, draft: false },
        { id: 4, title: null, views: 40, draft: true, tags: ["news", 1] },
      ],
    });
    assert.deepEqual(
      store.list("posts", new URLSearchParams(params)).map((row) => row.id),
      ids,
    );
  });
}

test("get() returns one row or throws a 404", () => {
  const { store } = makeStore(blog);
  assert.deepEqual(store.get("posts", 2), blog.posts[1]);
  assert.throws(() => store.get("posts", 3), status(404));
  assert.throws(() => store.get("posts", 0), status(404));
  assert.throws(() => store.get("posts", 1.5), status(404));
  assert.throws(() => store.get("nope", 1), status(404));
});

const notFoundCases: { name: string; call: (store: Store) => unknown; message: string }[] = [
  {
    name: "a missing row",
    call: (store) => store.get("posts", 3),
    message: 'no row with id 3 in "posts"',
  },
  {
    name: "an id that cannot be a row id",
    call: (store) => store.get("posts", Number.NaN),
    message: "id must be a positive integer",
  },
  {
    name: "an unknown resource",
    call: (store) => store.list("postz"),
    message: 'unknown resource "postz", use comments or posts',
  },
];

for (const { name, call, message } of notFoundCases) {
  test(`a 404 says what is missing: ${name}`, () => {
    const { store } = makeStore(blog);
    assert.throws(
      () => call(store),
      (error: unknown) =>
        error instanceof StoreError && error.status === 404 && error.errors[0]?.message === message,
    );
  });
}

test("a 404 names no resource when there is none", () => {
  // Only a SQLite file can have no resource: a JSON file needs one.
  using dir = mkdtempDisposableSync(path.join(tmpdir(), "json-server-store-"));
  const file = path.join(dir.path, "db.sqlite");
  new DatabaseSync(file).close();
  const store = new Store(new SqliteSource(file));
  assert.throws(
    () => store.list("posts"),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 404 &&
      error.errors[0]?.message === 'unknown resource "posts"',
  );
});

test("create() inserts and returns the row with its id", () => {
  const { store } = makeStore(blog);
  const created = store.create("posts", { title: "New", views: 0, draft: true });
  assert.deepEqual(created, { id: 3, title: "New", views: 0, draft: true });
  assert.deepEqual(store.get("posts", 3), created);
});

test("create() validates the body", () => {
  const { store } = makeStore(blog);
  assert.throws(
    () => store.create("posts", { title: 1, views: 0, draft: true }),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 400 &&
      error.errors.some((e) => e.field === "title" && e.message === "must be a string"),
  );
  assert.throws(() => store.create("posts", "not an object"), status(400));
});

test("replace() swaps the row; an id in the body is optional but must match", () => {
  const { store } = makeStore(blog);
  const replaced = store.replace("posts", 1, { id: 1, title: "Hi", views: 11, draft: false });
  assert.deepEqual(replaced, { id: 1, title: "Hi", views: 11, draft: false });
  assert.deepEqual(store.replace("posts", 1, { title: "No id", views: 1, draft: true }), {
    id: 1,
    title: "No id",
    views: 1,
    draft: true,
  });
  assert.throws(
    () => store.replace("posts", 1, { id: 2, title: "Hi", views: 11, draft: false }),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 409 &&
      error.errors[0]?.field === "id" &&
      error.errors[0].message === "does not match the id in the path",
  );
  assert.throws(
    () => store.replace("posts", 9, { id: 9, title: "Hi", views: 11, draft: false }),
    status(404),
  );
});

test("patch() merges into the row and keeps the rest", () => {
  const { store } = makeStore(blog);
  assert.deepEqual(store.patch("posts", 2, { views: 4 }), {
    id: 2,
    title: "World",
    views: 4,
    draft: true,
  });
  assert.deepEqual(store.patch("posts", 2, { id: 2, draft: false }).draft, false);
  assert.throws(() => store.patch("posts", 2, { id: 1 }), status(409));
  assert.throws(() => store.patch("posts", 9, { views: 1 }), status(404));
  assert.throws(() => store.patch("posts", 2, { views: "many" }), status(400));
});

test("remove() deletes the row or throws a 404", () => {
  const { store } = makeStore(blog);
  store.remove("posts", 2);
  assert.throws(() => store.get("posts", 2), status(404));
  assert.throws(() => store.remove("posts", 2), status(404));
});

test("writes turn a foreign key failure into a 409", () => {
  const { store } = makeStore(blog, commentOnPost);
  assert.throws(() => store.create("comments", { body: "Dangling", postId: 99 }), status(409));
  assert.throws(() => store.remove("posts", 1), status(409)); // a comment points at it
  store.remove("comments", 1);
  store.remove("posts", 1);
});

const linked = `CREATE TABLE posts (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, a INTEGER, b INTEGER, UNIQUE (a, b));
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  postId INTEGER REFERENCES posts ON DELETE RESTRICT,
  postSlug TEXT REFERENCES posts(slug),
  a INTEGER,
  b INTEGER,
  FOREIGN KEY (a, b) REFERENCES posts(a, b)
);
CREATE TRIGGER no_fives BEFORE INSERT ON posts WHEN NEW.a = 5 BEGIN SELECT RAISE(ABORT, 'a must not be 5'); END;`;

const linkedData: Dataset = {
  posts: [
    { id: 1, slug: "hello", a: 1, b: 2 },
    { id: 2, slug: "two", a: 3, b: 4 },
  ],
  comments: [{ id: 1, postId: 1, postSlug: "hello", a: 1, b: 2 }],
};

const constraintCases: {
  name: string;
  call: (store: Store) => unknown;
  status: number;
  errors: { field?: string; message: string }[];
}[] = [
  {
    name: "a value that points to no row names the column",
    call: (store) => store.create("comments", { postId: 99 }),
    status: 409,
    errors: [{ field: "postId", message: 'no row with id 99 in "posts"' }],
  },
  {
    name: "a key to another column names that column",
    call: (store) => store.patch("comments", 1, { postSlug: "nope" }),
    status: 409,
    errors: [{ field: "postSlug", message: 'no row with slug "nope" in "posts"' }],
  },
  {
    name: "every dangling value at once",
    call: (store) => store.replace("comments", 1, { postId: 99, postSlug: "nope" }),
    status: 409,
    errors: [
      { field: "postId", message: 'no row with id 99 in "posts"' },
      { field: "postSlug", message: 'no row with slug "nope" in "posts"' },
    ],
  },
  {
    name: "a delete names what still references the row",
    call: (store) => store.remove("posts", 1),
    status: 409,
    errors: [
      {
        message:
          'the row is still referenced by "postId" in "comments", delete or update those rows first',
      },
      {
        message:
          'the row is still referenced by "postSlug" in "comments", delete or update those rows first',
      },
    ],
  },
  {
    name: "a composite key keeps SQLite's message",
    call: (store) => store.create("comments", { a: 9, b: 9 }),
    status: 409,
    errors: [{ message: "foreign key constraint failed" }],
  },
  {
    name: "a trigger's RAISE is invalid input, with its message",
    call: (store) => store.create("posts", { a: 5 }),
    status: 400,
    errors: [{ message: "a must not be 5" }],
  },
];

for (const { name, call, status, errors } of constraintCases) {
  test(`constraint failure: ${name}`, () => {
    const { store } = makeStore(linkedData, linked);
    assert.throws(
      () => call(store),
      (error: unknown) => {
        assert.ok(error instanceof StoreError);
        assert.equal(error.status, status);
        assert.deepEqual(error.errors, errors);
        return true;
      },
    );
  });
}

test("query() runs read-only SQL and returns columns and rows", () => {
  const { store } = makeStore(blog);
  const result = store.query('SELECT "id", "title" FROM "posts" ORDER BY "id"');
  assert.deepEqual(result, {
    columns: ["id", "title"],
    rows: [
      { id: 1, title: "Hello" },
      { id: 2, title: "World" },
    ],
  });
  assert.throws(
    () => store.query('DELETE FROM "posts"'),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 400 &&
      error.errors[0]?.message ===
        "only read statements are allowed, write with POST, PUT, PATCH or DELETE",
  );
  assert.throws(() => store.query("SELECT FROM"), status(400));
  assert.equal(store.list("posts").length, 2);
});

test("query() returns a table's columns as list() does, computed ones as SQLite does", () => {
  const { store } = makeStore({
    posts: [{ id: 1, draft: true, tags: ["a"], meta: { x: 1 } }],
  });
  const { rows } = store.query(
    `SELECT p.draft AS isDraft, tags, meta, json_array_length(tags) AS n, draft = 1 AS raw FROM posts p`,
  );
  assert.deepEqual(rows, [{ isDraft: true, tags: ["a"], meta: { x: 1 }, n: 1, raw: 1 }]);
});

const refusedQueries = [
  `UPDATE "posts" SET "title" = 'Raw' WHERE "id" = 1`,
  `DELETE FROM "posts"`,
  `INSERT INTO "posts" ("title") VALUES ('Raw')`,
  `DROP TABLE "posts"`,
  `CREATE TABLE "extra" ("id" INTEGER)`,
  `PRAGMA query_only = 0`,
  `ATTACH DATABASE ':memory:' AS "other"`,
  `SELECT "name" FROM pragma_table_info('posts')`,
];

test("query() refuses anything but a read, and a later write still works", () => {
  const { store, file } = makeStore(blog);
  const before = readFileSync(file, "utf8");
  for (const sql of refusedQueries) {
    assert.throws(
      () => store.query(sql),
      (error: unknown) =>
        error instanceof StoreError &&
        error.status === 400 &&
        error.errors[0]?.message ===
          "only read statements are allowed, write with POST, PUT, PATCH or DELETE",
      sql,
    );
  }
  assert.equal(store.list("posts").length, 2);
  assert.equal(readFileSync(file, "utf8"), before);
  store.remove("posts", 2); // the authorizer was cleared
});

test("query() runs the first statement only, and allows CTEs, recursive ones included", () => {
  const { store } = makeStore(blog);
  const rows = (sql: string) => store.query(sql).rows;

  assert.deepEqual(rows(`SELECT 1 AS "one"; DELETE FROM "posts"`), [{ one: 1 }]);
  assert.equal(store.list("posts").length, 2);
  assert.deepEqual(
    rows(`WITH latest AS (SELECT max("id") AS "id" FROM "posts")
          SELECT "title" FROM "posts" WHERE "id" = (SELECT "id" FROM latest)`),
    [{ title: "World" }],
  );
  assert.deepEqual(
    rows(
      `WITH RECURSIVE n("x") AS (SELECT 1 UNION ALL SELECT "x" + 1 FROM n WHERE "x" < 3) SELECT "x" FROM n`,
    ),
    [{ x: 1 }, { x: 2 }, { x: 3 }],
  );
});

test("JsonSource throws DatasetError on an invalid file", () => {
  using dir = mkdtempDisposableSync(path.join(tmpdir(), "json-server-store-"));
  const file = path.join(dir.path, "db.json");
  writeFileSync(file, "{ not json");
  assert.throws(() => new JsonSource(file), DatasetError);
  assert.throws(() => new JsonSource(path.join(dir.path, "missing.json")), DatasetError);
});

test("writes are saved to the file before they return, and are not taken for edits", () => {
  const lines: string[] = [];
  const { store, file } = makeStore(blog, null, { log: (line) => lines.push(line) });
  const created = store.create("posts", { title: "Saved", views: 1, draft: false });
  assert.deepEqual(readFile(file).posts?.at(-1), created);

  store.patch("posts", 1, { views: 99 });
  assert.equal(readFile(file).posts?.[0]?.views, 99);

  store.remove("posts", 2);
  assert.deepEqual(
    readFile(file).posts?.map((p) => p.id),
    [1, 3],
  );
  // Reading the file back after our own saves does not count as a reload.
  store.list("posts");
  assert.deepEqual(lines, [`created ${schemaFileOf(file)}`]);
});

test("a failed write leaves the file untouched", () => {
  const { store, file } = makeStore(blog, commentOnPost);
  const before = readFileSync(file, "utf8");
  assert.throws(() => store.create("comments", { body: "x", postId: 99 }), status(409));
  assert.throws(() => store.create("posts", { title: 1 }), status(400));
  assert.equal(readFileSync(file, "utf8"), before);
});

test("an edit on disk is picked up by the next operation", () => {
  const lines: string[] = [];
  const { store, file } = makeStore(blog, null, { log: (line) => lines.push(line) });
  assert.equal(store.list("posts").length, 2);

  writeFileSync(
    file,
    JSON.stringify({ posts: [{ id: 7, title: "Edited", views: 0, draft: false }] }),
  );
  assert.deepEqual(store.list("posts"), [{ id: 7, title: "Edited", views: 0, draft: false }]);
  assert.throws(() => store.get("comments", 1), status(404));
  assert.deepEqual(lines, [`created ${schemaFileOf(file)}`, `reloaded ${file}`]);

  // A write lands on top of the edit, not over it; a new resource in the edit is served.
  store.create("posts", { title: "After", views: 1, draft: false });
  assert.deepEqual(
    readFile(file).posts?.map((p) => p.id),
    [7, 8],
  );
  writeFileSync(file, JSON.stringify({ ...readFile(file), users: [{ id: 1, name: "Ann" }] }));
  assert.deepEqual(store.resources(), ["comments", "posts", "users"]);
  assert.deepEqual(store.get("users", 1), { id: 1, name: "Ann" });
});

test("while the file is invalid, every operation throws a 503 and logs why", () => {
  const lines: string[] = [];
  const { store, file } = makeStore(blog, null, { log: (line) => lines.push(line) });
  writeFileSync(file, "{ broken");

  const unusable = (error: unknown) =>
    error instanceof StoreError &&
    error.status === 503 &&
    error.errors[0]?.message.startsWith(`${file} is not usable, fix it and retry:`) === true;
  assert.throws(() => store.list("posts"), unusable);
  assert.throws(() => store.create("posts", { title: "x", views: 0, draft: false }), unusable);
  assert.equal(lines.length, 3);
  assert.match(lines[1] ?? "", /is not usable: /);
  assert.match(lines[2] ?? "", /is not usable: /);

  // Fixed: the next operation reloads and writes resume.
  writeFileSync(file, JSON.stringify(blog));
  store.create("posts", { title: "Back", views: 0, draft: false });
  assert.equal(readFile(file).posts?.length, 3);
});
