<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-wordmark-dark.svg">
    <img src="assets/logo-wordmark-light.svg" alt="JSON Server" width="372" height="76">
  </picture>
</p>

Get a full REST API with **zero coding** in **less than 30 seconds** (seriously).

> [!NOTE]
> New in v2:
>
> - Runs on Node's SQLite: faster, and ready for production.
> - Mounts in a Hono app, next to your own logic.
> - Clearer errors, for people and agents.

- **Start with a JSON file.** Edit it by hand or with your agent.
- **Add rules in SQL** when you need them: relations, `NOT NULL`, `UNIQUE`, defaults, triggers.
- **Switch to a SQLite file** for production. Same API.
- **Mount it in a Hono app** and add your own routes and auth.

> [!CAUTION]
> v2 has breaking changes. v0 is still available: [v0.17.4](https://github.com/typicode/json-server/tree/v0.17.4).

## Getting started

Requires Node.js 26.10 or later.

Create a `db.json` file:

```json
{
  "posts": [{ "id": 1, "title": "Hello", "draft": false, "tags": ["intro"] }],
  "comments": [{ "id": 10, "postId": 1, "body": "Nice" }]
}
```

Start JSON Server:

```bash
npx json-server db.json
```

Go to `http://localhost:3000/posts/1`:

```json
{ "id": 1, "title": "Hello", "draft": false, "tags": ["intro"] }
```

Write to it:

```bash
curl -X POST http://localhost:3000/posts -H "Content-Type: application/json" -d '{"title":"Second"}'
```

The new post is saved in `db.json`.

## Routes

```
GET    /posts
GET    /posts/1
POST   /posts
PUT    /posts/1
PATCH  /posts/1
DELETE /posts/1
```

Bodies are validated against the data's types. Errors list every problem at once:

```json
{
  "errors": [
    { "field": "title", "message": "must be a string" },
    { "field": "titel", "message": "unknown property, use title, draft or tags" }
  ]
}
```

## Filter, sort, page

```
GET /posts?where.title.eq=Hello&where.draft.eq=false
GET /posts?where.views.gte=10&where.title.not.like=Hel*
GET /posts?where.tags.has=news
GET /posts?orderBy.title=asc&limit=20&offset=40
```

| Operator                     | Works on                |
| ---------------------------- | ----------------------- |
| `eq`, `in`                   | string, number, boolean |
| `lt`, `lte`, `gt`, `gte`     | string, number          |
| `like` (`*` is the wildcard) | string                  |
| `has`                        | array                   |
| `is` (`null`)                | anything                |

Add `not.` before an operator to negate it. Store dates as ISO strings (`2026-03-15T08:30:00Z`) and the string operators just work.

For anything query parameters can't express, send SQL to [`QUERY /`](#raw-sql).

## Schema

On first run, JSON Server writes the tables it inferred to `db.schema.sql`:

```sql
CREATE TABLE "comments" (
  "id" INTEGER PRIMARY KEY,
  "postId" REAL,
  "body" TEXT
);
```

It's plain SQLite, and it's yours. Edit it to say what the data can't:

```diff
 CREATE TABLE "comments" (
   "id" INTEGER PRIMARY KEY,
-  "postId" REAL,
-  "body" TEXT
+  "postId" INTEGER NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
+  "body" TEXT NOT NULL
 );
```

That's it. The API now refuses a comment without a post (`409`, `{ "field": "postId", "message": "no row with id 99 in \"posts\"" }`), and deleting a post deletes its comments. Anything SQLite supports works the same way: `UNIQUE`, `CHECK`, `DEFAULT`, `COLLATE NOCASE`, triggers, indexes, views, full-text search.

JSON Server only appends new tables to this file. It never changes what you wrote. **Commit both files.**

## Raw SQL

```
QUERY /
Content-Type: application/sql

SELECT * FROM posts WHERE json_extract(author, '$.city') = 'Paris'
```

Returns `{ "columns": [...], "rows": [...] }`, a column read from a table typed as the REST API returns it (`true`, not `1`). Read-only: anything that writes is refused.

Use it for what query parameters can't do: `OR`, joins, nested values, full-text search.

## SQLite file

For production or large datasets, export your JSON file to SQLite and serve that instead:

```bash
json-server export db.json db.sqlite
json-server db.sqlite
```

Same API. Run migrations with any SQLite tool.

## Options

```
json-server <file> [--port 3000] [--host 127.0.0.1] [--quiet]
json-server export <file.json> <db.sqlite>
```

## Use it in a Hono app

> [!TIP]
> `createApp` returns the REST API to mount, and the `store` behind it for your own routes.

```ts
import { Hono } from "hono";
import { html } from "hono/html";
import { createApp } from "json-server";

const { app, store } = createApp("db.json");

const server = new Hono();
server.mount("/api", app.fetch);

server.get("/", (c) => {
  const posts = store.list("posts", { orderBy: { id: "desc" }, limit: 10 });
  return c.html(
    html`<ul>
      ${posts.map((p) => html`<li>${p.title}</li>`)}
    </ul>`,
  );
});
```

`store` has one method per route: `list`, `get`, `create`, `replace`, `patch`, `remove`, `query`. It validates and saves like the API does, and throws a `StoreError` with the same `status` and `errors`.

`list` takes the query parameters as an object: `{ where: { views: { gte: 10 }, title: { not: { like: "Hel*" } } } }` is `?where.views.gte=10&where.title.not.like=Hel*`.

### Add login

JSON Server has no users or auth. Your Hono app does, with any Hono middleware. Here, GitHub login with [`@hono/oauth-providers`](https://github.com/honojs/middleware/tree/main/packages/oauth-providers) and a signed cookie:

```sql
-- db.schema.sql
CREATE TABLE "users" (
  "id" INTEGER PRIMARY KEY,
  "githubId" INTEGER NOT NULL UNIQUE,
  "name" TEXT
);

CREATE TABLE "posts" (
  "id" INTEGER PRIMARY KEY,
  "title" TEXT,
  "draft" BOOLEAN,
  "tags" ARRAY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") -- existing posts need one in db.json
);
```

```ts
import { Hono } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { githubAuth } from "@hono/oauth-providers/github";
import { createApp } from "json-server";

const { store } = createApp("db.json");
const secret = process.env.SESSION_SECRET!;

const server = new Hono();

// GitHub sends the user back here: find or create them, then open a session.
// Reads GITHUB_ID and GITHUB_SECRET from the environment.
server.use("/login", githubAuth({ scope: ["read:user"], oauthApp: true }));
server.get("/login", async (c) => {
  const github = c.get("user-github")!;
  const [user] = store.list("users", { where: { githubId: { eq: github.id } } });
  const { id } = user ?? store.create("users", { githubId: github.id, name: github.login });
  await setSignedCookie(c, "userId", String(id), secret, { httpOnly: true, sameSite: "Lax" });
  return c.redirect("/");
});

const auth = createMiddleware<{ Variables: { userId: number } }>(async (c, next) => {
  const userId = await getSignedCookie(c, secret, "userId");
  if (!userId) return c.redirect("/login");
  c.set("userId", Number(userId));
  await next();
});

// Each user sees and creates their own posts. The owner comes from the session, never the body.
server.get("/posts", auth, (c) => {
  return c.json(store.list("posts", { where: { userId: { eq: c.var.userId } } }));
});
server.post("/posts", auth, async (c) => {
  const post = store.create("posts", { ...(await c.req.json()), userId: c.var.userId });
  return c.json(post, 201);
});
```

The mounted REST API knows nothing about users. Don't expose it to them: mount it behind an admin-only middleware, or not at all.
