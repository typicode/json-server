import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createApp } from "./app.ts";
import { schemaFileOf } from "./json_source.ts";
import type { ValidationError } from "./json_types.ts";

const dirs: string[] = [];
test.after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** Serves `dataset` from a temporary `db.json`. `lines` collects the log. */
function serve(dataset: unknown) {
  const dir = mkdtempSync(path.join(tmpdir(), "json-server-"));
  dirs.push(dir);
  const file = path.join(dir, "db.json");
  writeFileSync(file, JSON.stringify(dataset));
  const lines: string[] = [];
  const { app, store } = createApp(file, { log: (line) => lines.push(line) });
  return { app, store, file, lines };
}

const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const sqlRequest = (sql: string): RequestInit => ({
  method: "QUERY",
  headers: { "content-type": "application/sql" },
  body: sql,
});

const one = { posts: [{ id: 1, title: "Hello" }] };
const typed = { posts: [{ id: 1, title: "Hello", draft: true, tags: ["a"] }] };
const seed = {
  posts: [
    { id: 1, title: "Hello", draft: false },
    { id: 2, title: "World", draft: true },
  ],
  comments: [{ id: 1, body: "Nice" }],
};

test("GET /:resource returns rows with their original JSON types", async () => {
  const { app } = serve({
    posts: [{ id: 1, title: "Hello", draft: true, tags: ["a"], meta: { rank: 1 } }],
  });
  const response = await app.request("/posts");

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    { id: 1, title: "Hello", draft: true, tags: ["a"], meta: { rank: 1 } },
  ]);
});

test("GET / lists each resource as a link", async () => {
  const { app } = serve({ ...one, comments: [{ id: 1, body: "Nice" }] });
  const response = await app.request("/");

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  const html = await response.text();
  assert.match(html, /href="posts"/);
  assert.match(html, /href="comments"/);
  assert.match(html, /<h1><svg /);
  assert.match(html, /rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,/);
});

test("GET /:resource and /:resource/:id return 404 for what does not exist", async () => {
  const { app } = serve(one);
  const response = await app.request("/comments");

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    errors: [{ message: 'unknown resource "comments", use posts' }],
  });
  assert.equal((await app.request("/posts/2")).status, 404);
});

const notFoundCases = [
  { path: "/posts/1/2/3", message: "not found, use /<resource> or /<resource>/<id>" },
  { path: "/posts/1/comments", message: "no nested routes, use /comments?where.postId.eq=1" },
];
for (const { path, message } of notFoundCases) {
  test(`a path that matches no route is a 404 that says what to request: ${path}`, async () => {
    const { app } = serve(one);
    const response = await app.request(path);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { errors: [{ message }] });
  });
}

test("an unexpected error is a JSON 500 and goes to the log", async () => {
  const { app, store, lines } = serve(one);
  store.db.close(); // every query now throws

  const response = await app.request("/posts");

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { errors: [{ message: "internal server error" }] });
  assert.match(lines[0] ?? "", /^created .*db\.schema\.sql$/);
  assert.match(lines[1] ?? "", /^error: /);
  assert.match(lines[2] ?? "", /^GET \/posts 500 \d+ms$/);
});

test("GET /:resource passes the query string to the store", async () => {
  const { app } = serve({
    posts: [
      { id: 1, title: "Hello", views: 10, draft: false },
      { id: 2, title: "World", views: 20, draft: true },
      { id: 3, title: "Hello", views: 30, draft: false },
    ],
  });
  const response = await app.request("/posts?where.title.eq=Hello&where.draft.eq=false");

  assert.equal(response.status, 200);
  assert.deepEqual(
    ((await response.json()) as { id: number }[]).map((row) => row.id),
    [1, 3],
  );
});

test("POST /:resource creates a row with a generated id", async () => {
  const { app } = serve(typed);
  const body = { title: "World", draft: false, tags: ["b"] };
  const response = await app.request("/posts", jsonRequest("POST", body));

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), "posts/2");
  assert.equal(response.headers.get("access-control-expose-headers"), "Location");
  assert.deepEqual(await response.json(), { id: 2, ...body });
  assert.deepEqual(await (await app.request("/posts/2")).json(), { id: 2, ...body });
});

test("POST /:resource rejects a missing Content-Type with 415", async () => {
  const { app } = serve(typed);
  const response = await app.request("/posts", { method: "POST", body: "{}" });

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), {
    errors: [{ message: "content-type must be application/json" }],
  });
});

test("POST /:resource rejects malformed JSON with 400", async () => {
  const { app } = serve(typed);
  const response = await app.request("/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    errors: [
      {
        message:
          "body is not valid JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)",
      },
    ],
  });
});

test("POST /:resource answers an invalid body with the store's 400", async () => {
  const { app } = serve(typed);
  const response = await app.request(
    "/posts",
    jsonRequest("POST", { title: "World", draft: "false", tags: ["b"] }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    errors: [{ field: "draft", message: "must be a boolean" }],
  });
});

test("PUT /:resource/:id replaces a row", async () => {
  const { app } = serve(typed);
  const body = { id: 1, title: "World", draft: false, tags: ["b"] };
  const response = await app.request("/posts/1", jsonRequest("PUT", body));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), body);
  assert.deepEqual(await (await app.request("/posts/1")).json(), body);
});

test("PUT /:resource/:id answers a mismatched id with the store's 409", async () => {
  const { app } = serve(typed);
  const response = await app.request(
    "/posts/1",
    jsonRequest("PUT", { id: 2, title: "World", draft: false, tags: ["b"] }),
  );

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    errors: [{ field: "id", message: "does not match the id in the path" }],
  });
});

test("PATCH /:resource/:id updates only the sent fields", async () => {
  const { app } = serve(typed);
  const response = await app.request("/posts/1", jsonRequest("PATCH", { title: "World" }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 1, title: "World", draft: true, tags: ["a"] });
});

test("DELETE /:resource/:id removes a row and answers 204", async () => {
  const { app } = serve(typed);
  const response = await app.request("/posts/1", { method: "DELETE" });

  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal((await app.request("/posts/1")).status, 404);
  assert.equal((await app.request("/posts/1", { method: "DELETE" })).status, 404);
});

test("QUERY / rejects a missing Content-Type with 415", async () => {
  const { app } = serve(one);
  const response = await app.request("/", { method: "QUERY", body: "SELECT 1" });

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), {
    errors: [{ message: "content-type must be application/sql" }],
  });
});

test("QUERY / answers invalid SQL with the store's 400", async () => {
  const { app } = serve(one);
  const response = await app.request("/", sqlRequest("NOT SQL"));

  assert.equal(response.status, 400);
  const body = (await response.json()) as { errors: ValidationError[] };
  assert.match(body.errors[0]?.message ?? "", /syntax error/);
});

test("POST /:resource rejects a body larger than 1 MiB with 413", async () => {
  const { app } = serve(one);
  const response = await app.request("/posts", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(1024 * 1024 + 1) },
    body: "{}",
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    errors: [{ message: "body must not exceed 1 MiB" }],
  });
});

const methodCases = [
  {
    method: "POST",
    path: "/posts/1",
    message:
      "method not allowed, use GET, HEAD, PUT, PATCH or DELETE; POST takes no id, as in /posts",
    allow: "GET, HEAD, PUT, PATCH, DELETE",
  },
  {
    method: "PATCH",
    path: "/posts",
    message: "method not allowed, use GET, HEAD or POST; PATCH takes an id, as in /posts/<id>",
    allow: "GET, HEAD, POST",
  },
  {
    method: "PUT",
    path: "/",
    message: "method not allowed, use GET, HEAD or QUERY",
    allow: "GET, HEAD, QUERY",
  },
];
for (const { method, path, message, allow } of methodCases) {
  test(`${method} ${path} returns 405 with the allowed methods`, async () => {
    const { app } = serve(one);
    const response = await app.request(path, jsonRequest(method, {}));

    assert.equal(response.status, 405);
    assert.deepEqual(await response.json(), { errors: [{ message }] });
    assert.equal(response.headers.get("allow"), allow);
  });
}

test(
  "a write whose save fails returns 500 and logs why",
  { skip: process.getuid?.() === 0 },
  async () => {
    const { app, file, lines } = serve(seed);
    const dir = path.dirname(file);
    chmodSync(dir, 0o500);
    try {
      assert.equal((await app.request("/posts/1", { method: "DELETE" })).status, 500);
    } finally {
      chmodSync(dir, 0o700);
    }
    assert.match(lines[1] ?? "", /^error: .*EACCES/);
    assert.match(lines[2] ?? "", /^DELETE \/posts\/1 500 \d+ms$/);
  },
);

const invalidEdits: { name: string; content: string; error: RegExp }[] = [
  { name: "invalid JSON", content: "{oops", error: /not valid JSON/ },
  {
    name: "a type conflict",
    content: JSON.stringify({ ...seed, posts: [seed.posts[0], { id: 2, title: 42, draft: true }] }),
    error: /title/,
  },
  { name: "a missing file", content: "", error: /ENOENT/ },
];

for (const { name, content, error } of invalidEdits) {
  test(`after ${name}, every request gets a 503 with the reason`, async () => {
    const { app, file } = serve(seed);
    if (content === "") rmSync(file);
    else writeFileSync(file, content);

    for (const [target, init] of [
      ["/posts/1", undefined],
      ["/", sqlRequest(`SELECT "id" FROM "posts"`)],
      ["/posts/1", { method: "DELETE" }],
    ] as [string, RequestInit | undefined][]) {
      const response = await app.request(target, init);
      assert.equal(response.status, 503);
      const body = (await response.json()) as { errors: ValidationError[] };
      assert.match(body.errors[0]?.message ?? "", error);
    }
    if (content !== "") assert.equal(readFileSync(file, "utf8"), content);
  });
}

test("log reports each reload once, and an unusable file at each request that hits it", async () => {
  const { app, file, lines } = serve(seed);
  const events = () => lines.filter((line) => !/^[A-Z]+ \/\S* \d{3} \d+ms$/.test(line));
  const schemaFile = schemaFileOf(file);

  await app.request("/posts");
  await app.request("/posts/1", { method: "DELETE" });
  assert.deepEqual(events(), [`created ${schemaFile}`]);

  writeFileSync(file, JSON.stringify({ posts: [{ id: 7, title: "Edited", draft: false }] }));
  await app.request("/posts");
  await app.request("/posts");
  assert.deepEqual(events(), [`created ${schemaFile}`, `reloaded ${file}`]);

  // While a file does not load, every request that reaches the store says why.
  writeFileSync(file, "{oops");
  await app.request("/posts");
  await app.request("/posts/7", { method: "DELETE" });
  assert.equal(events().length, 4);
  assert.match(events()[2] ?? "", new RegExp(`^${file} is not usable: .*not valid JSON`));
  assert.match(events()[3] ?? "", new RegExp(`^${file} is not usable: .*not valid JSON`));

  rmSync(file);
  await app.request("/posts");
  assert.match(events()[4] ?? "", /is not usable: ENOENT/);
});

test("log prints one line per request with method, path, status, and duration", async () => {
  const { app, lines } = serve(seed);

  await app.request("/posts?limit=1");
  await app.request("/users/1", { method: "DELETE" });
  await app.request("/posts", { method: "PUT" });
  await app.request("/posts", jsonRequest("POST", { title: "New", draft: true }));

  assert.equal(lines.length, 5);
  assert.match(lines[0] ?? "", /^created /);
  assert.match(lines[1] ?? "", /^GET \/posts\?limit=1 200 \d+ms$/);
  assert.match(lines[2] ?? "", /^DELETE \/users\/1 404 \d+ms$/);
  assert.match(lines[3] ?? "", /^PUT \/posts 405 \d+ms$/);
  assert.match(lines[4] ?? "", /^POST \/posts 201 \d+ms$/);
});

test("createApp exposes a store that shares the app's data", async () => {
  const { app, store } = serve(one);
  assert.deepEqual(store.list("posts"), one.posts);

  const created = store.create("posts", { title: "From the store" });
  const response = await app.request(`/posts/${created.id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), created);
});

test("a request rejected before it reaches the store does not see an unusable file", async () => {
  const { app, file, lines } = serve(one);
  writeFileSync(file, "{ broken");
  const unusable = () => lines.filter((line) => line.includes("is not usable")).length;

  // The request's own fault comes first, and the file is not even looked at.
  assert.equal((await app.request("/posts", { method: "POST", body: "x" })).status, 415);
  assert.equal((await app.request("/posts/abc", { method: "DELETE" })).status, 404);
  assert.equal((await app.request("/posts", { method: "PUT" })).status, 405);
  assert.equal(unusable(), 0);

  // Every operation that reaches the store notices the edit and says so.
  assert.equal((await app.request("/posts", jsonRequest("POST", { title: "x" }))).status, 503);
  assert.equal((await app.request("/posts")).status, 503);
  assert.equal(unusable(), 2);
});
