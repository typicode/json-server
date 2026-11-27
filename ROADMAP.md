# Roadmap

Candidates distilled from the typicode/json-server issue tracker (617 open, 576 closed, reviewed 2026-09-18), filtered by what fits JSON Server: a small real backend on SQLite, not a mock. Every item is weighed as code complexity against value, and anything complex on query parameters belongs in `QUERY`.

## Candidates

By value for the cost.

### Bulk writes

`POST /posts` with an array body creates many rows; `DELETE /posts?where...` deletes many. Both atomic: everything is validated first (errors carry the item index, `1.title`), then runs in one transaction, and a single failure rolls the whole batch back (400 for validation, 409 for a foreign key, naming the item). A bare `DELETE /posts` without a filter is a 400. `DELETE` returns `{ "deleted": n }`. `PUT` in batch only if asked; `PATCH` in batch is out.

Roughly 60 lines.

json-server issues: #482, #860, #487, #310, #885.

### Total count for paged lists

`X-Total-Count` (or equivalent) on `GET /:resource`, so a client can draw pagination. One `count(*)` with the same `WHERE`, about ten lines.

json-server issues: #1727, #1015, #1276.

### `QUERY` timeout and row cap

Already noted in AGENTS.md. In prod, this is what keeps a read-only SQL endpoint from being a denial-of-service surface. The row cap is cheap; the timeout needs a worker since `node:sqlite` has no progress handler.

### Reset

Reload the file's original content on demand, so a test suite can restore its fixture between tests. Set aside rather than rejected: it reads as a mock convenience, and every write already lands in the file, so a `POST /_reset` (or a signal) needs a copy of the original taken at start. Small, but not free.

json-server issues: #872, #115, #1626.

### Server-sent events

`GET /_events` streaming create/update/delete notifications, so a front end can react with `EventSource`. Moderate cost, no alternative.

json-server issues: #288, #870, #1610, #589.

### OpenAPI

`GET /openapi.json` generated from the inferred schema, giving typed clients and Swagger UI for free. Moderate cost, no alternative. Only worth it as a selling point.

json-server issues: #1236, #1760.

## Covered by `QUERY` or existing operators

Documented in the README instead of built: nested values and array membership (`json_extract`, `json_each`), OR, full-text search (`like` for the simple case), field selection, embedding relations (a `JOIN`), date ranges (ISO strings with `gte`/`lt`).

## Out of scope

Mock conveniences: `--delay`, jitter. json-server 0.17 features that would bring its complexity back: custom or string ids, routes and rewrites, middlewares and `db.js`, multiple files, nested resource URLs (`/posts/1/comments`), auth, HTTPS, file upload, static files.
