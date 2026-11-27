import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempDisposableSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createApp } from "./app.ts";
import { JsonSource } from "./json_source.ts";
import { DatasetError } from "./source.ts";
import { SqliteSource } from "./sqlite_source.ts";
import { Store, StoreError, type StoreErrorStatus } from "./store.ts";

const status =
  (code: StoreErrorStatus) =>
  (error: unknown): boolean =>
    error instanceof StoreError && error.status === code;

const dirs: string[] = [];
test.after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** A SQLite file with `ddl` applied, closed, ready to be opened by a source. */
function makeDb(ddl: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "json-server-sqlite-"));
  dirs.push(dir);
  const file = path.join(dir, "db.sqlite");
  using db = new DatabaseSync(file);
  db.exec(ddl);
  return file;
}

const blog = `
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    slug VARCHAR(80) UNIQUE,
    views INTEGER,
    score REAL,
    draft BOOLEAN,
    author JSON,
    tags ARRAY
  );
  CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    body TEXT,
    postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  );
  CREATE TABLE post_tags (postId INTEGER, tag TEXT);
  INSERT INTO posts VALUES (1, 'Hello', 'hello', 10, 4.5, 1, '{"name":"Ann"}', '["a","b"]');
  INSERT INTO comments VALUES (1, 'Nice', 1);
`;

test("the schema comes from the tables, typed by declared column type", () => {
  const store = new Store(new SqliteSource(makeDb(blog)));
  // post_tags has no INTEGER PRIMARY KEY id: not a resource, still there for query().
  assert.deepEqual(store.resources(), ["comments", "posts"]);
  assert.deepEqual(store.get("posts", 1), {
    id: 1,
    title: "Hello",
    slug: "hello",
    views: 10,
    score: 4.5,
    draft: true,
    author: { name: "Ann" },
    tags: ["a", "b"],
  });
  assert.deepEqual(store.list("posts", { where: { draft: { eq: true } } }).length, 1);
  assert.equal(store.query("SELECT count(*) AS n FROM post_tags").rows[0]?.n, 0);
});

test("relations are the foreign keys, enforced by SQLite", () => {
  const store = new Store(new SqliteSource(makeDb(blog)));
  assert.throws(
    () => store.create("comments", { body: "x", postId: null }),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 400 &&
      error.errors[0]?.message === "must not be null",
  );
  assert.throws(() => store.create("comments", { body: "x", postId: 99 }), status(409));
  store.remove("posts", 1);
  assert.equal(store.list("comments").length, 0); // cascaded
});

test("any foreign key SQLite accepts is fine: composite, to another column, SET DEFAULT", () => {
  const store = new Store(
    new SqliteSource(
      makeDb(`
      CREATE TABLE posts (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, a INTEGER, b INTEGER, UNIQUE (a, b));
      CREATE TABLE comments (id INTEGER PRIMARY KEY, postSlug TEXT REFERENCES posts(slug),
        a INTEGER, b INTEGER, FOREIGN KEY (a, b) REFERENCES posts(a, b));
      CREATE TABLE likes (id INTEGER PRIMARY KEY, postId INTEGER DEFAULT 1 REFERENCES posts(id) ON DELETE SET DEFAULT);
      INSERT INTO posts VALUES (1, 'hello', 1, 2), (2, 'two', 3, 4);
    `),
    ),
  );
  assert.deepEqual(store.resources(), ["comments", "likes", "posts"]);
  store.create("comments", { postSlug: "hello", a: 1, b: 2 });
  assert.throws(() => store.create("comments", { postSlug: "nope", a: 1, b: 2 }), status(409));
  const like = store.create("likes", { postId: 2 });
  store.remove("posts", 2);
  assert.equal(store.get("likes", like.id as number).postId, 1);
});

const invalidCases = [
  {
    name: "an unsupported column type",
    ddl: "CREATE TABLE posts (id INTEGER PRIMARY KEY, data BLOB)",
    message:
      'posts.data: unsupported column type "BLOB", use TEXT, REAL, INTEGER, BOOLEAN, JSON or ARRAY',
  },
];
for (const { name, ddl, message } of invalidCases) {
  test(`SqliteSource rejects ${name}`, () => {
    assert.throws(
      () => new SqliteSource(makeDb(ddl)),
      (error: unknown) => error instanceof DatasetError && error.message.includes(message),
    );
  });
}

test("SqliteSource does not create a missing file", () => {
  using dir = mkdtempDisposableSync(path.join(tmpdir(), "json-server-sqlite-"));
  const file = path.join(dir.path, "missing.sqlite");
  assert.throws(() => new SqliteSource(file), DatasetError);
});

test("SqliteSource rejects a file that is not a database, and says which files are JSON", () => {
  using dir = mkdtempDisposableSync(path.join(tmpdir(), "json-server-sqlite-"));
  const file = path.join(dir.path, "db.yaml");
  writeFileSync(file, "posts: []\n");
  assert.throws(
    () => new SqliteSource(file),
    new DatasetError(`${file}: not a SQLite database, and only a .json file is read as JSON`),
  );
});

test("writes land in the file", () => {
  const file = makeDb(blog);
  const store = new Store(new SqliteSource(file));
  const created = store.create("posts", {
    title: "Second",
    slug: "second",
    views: 0,
    score: null,
    draft: false,
    author: null,
    tags: [],
  });
  store.patch("posts", 1, { views: 11 });

  using other = new DatabaseSync(file, { readOnly: true });
  assert.deepEqual(
    other.prepare("SELECT id, title, draft, tags FROM posts ORDER BY id").all(),
    [
      { id: 1, title: "Hello", draft: 1, tags: '["a","b"]' },
      { id: created.id, title: "Second", draft: 0, tags: "[]" },
    ].map((row) => Object.assign(Object.create(null), row)),
  );
  assert.equal(other.prepare("SELECT views FROM posts WHERE id = 1").get()?.views, 11);
});

test("NOT NULL and UNIQUE constraints of the table become 400 and 409 on the column", () => {
  const store = new Store(new SqliteSource(makeDb(blog)));
  const post = {
    title: null,
    slug: "hello",
    views: 0,
    score: null,
    draft: false,
    author: null,
    tags: null,
  };
  assert.throws(
    () => store.create("posts", post),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 400 &&
      error.status === 400 &&
      error.errors[0]?.field === "title" &&
      error.errors[0].message === "must not be null",
  );
  assert.throws(
    () => store.create("posts", { ...post, title: "Dup" }),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 409 &&
      error.status === 409 &&
      error.errors[0]?.field === "slug" &&
      error.errors[0].message === "must be unique",
  );
});

test("a migration run elsewhere is picked up by the next operation", () => {
  const file = makeDb("CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT)");
  const store = new Store(new SqliteSource(file));
  assert.throws(() => store.get("posts", 1), status(404)); // no rows yet

  {
    using migration = new DatabaseSync(file);
    migration.exec(
      "ALTER TABLE posts ADD COLUMN published BOOLEAN; CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT)",
    );
  }

  assert.deepEqual(store.resources(), ["posts", "tags"]);
  const created = store.create("posts", { title: "x", published: true });
  assert.equal(created.published, true);
});

test("createApp serves a SQLite file", async () => {
  const file = makeDb(blog);
  const { app } = createApp(file);
  assert.equal((await app.request("/posts")).status, 200);
  const response = await app.request("/comments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body: "Again", postId: 1 }),
  });
  assert.equal(response.status, 201);
  assert.equal((await app.request("/comments")).status, 200);
  assert.equal(((await (await app.request("/comments")).json()) as unknown[]).length, 2);
});

test("a CHECK failure from the table is a 400 carrying SQLite's message", () => {
  const store = new Store(
    new SqliteSource(
      makeDb("CREATE TABLE posts (id INTEGER PRIMARY KEY, views INTEGER CHECK (views >= 0))"),
    ),
  );
  assert.throws(
    () => store.create("posts", { views: -1 }),
    (error: unknown) =>
      error instanceof StoreError &&
      error.status === 400 &&
      error.status === 400 &&
      error.errors[0]?.message === "CHECK constraint failed: views >= 0",
  );
});

test("JsonSource.export writes a database SqliteSource reads back identically", () => {
  using dir = mkdtempDisposableSync(path.join(tmpdir(), "json-server-sqlite-"));
  const json = path.join(dir.path, "db.json");
  const target = path.join(dir.path, "out.sqlite");
  const dataset = {
    posts: [{ id: 1, title: "Hello", draft: false, author: { name: "Ann" }, tags: ["a"] }],
    comments: [{ id: 1, body: "Nice", postId: 1 }],
  };
  writeFileSync(json, JSON.stringify(dataset));
  writeFileSync(
    path.join(dir.path, "db.schema.sql"),
    `CREATE TABLE comments (id INTEGER PRIMARY KEY, body TEXT, postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE);`,
  );
  const source = new JsonSource(json);
  source.export(target);
  assert.throws(() => source.export(target), /already exists/);

  const exported = new SqliteSource(target);
  const store = new Store(exported);
  assert.throws(() => store.create("comments", { body: "x", postId: 99 }), status(409));
  assert.deepEqual(store.list("posts"), dataset.posts);
  assert.deepEqual(store.list("comments"), dataset.comments);

  // The export is the schema file run as is, the inferred table included.
  using other = new DatabaseSync(target);
  const ddl = other.prepare("SELECT sql FROM sqlite_master WHERE name = 'posts'").get()?.sql;
  assert.equal(
    ddl,
    'CREATE TABLE "posts" (\n  "id" INTEGER PRIMARY KEY,\n  "title" TEXT,\n  "draft" BOOLEAN,\n  "author" JSON,\n  "tags" ARRAY\n)',
  );
});
