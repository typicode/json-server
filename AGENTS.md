# JSON Server

## Stack

TypeScript ESM strict, Node.js 26.10+ (`node:sqlite` binds booleans and `undefined`). Node type stripping runs `.ts` in development and tests; `tsc --noEmit` with `erasableSyntaxOnly` typechecks. `node --run build` emits `dist/` (JS + `.d.ts`, no tests), what `bin` and `exports` point at and what gets published. Publishing is `.github/workflows/publish.yml` on a `v*` tag, never from a laptop: a local `ignore-scripts` would skip `prepack` and ship a stale `dist/`. Hono with `@hono/node-server`, `node:sqlite`, `node:util.parseArgs`, npm, oxfmt, oxlint. Run the scripts with `node --run <script>` (`test`, `typecheck`, `lint`, `fmt:check`, `build`), not `npm run` or `npx`: it puts `node_modules/.bin` on the `PATH` without starting npm.

Hono docs: https://hono.dev/llms.txt. Node sqlite docs: https://nodejs.org/docs/latest-v26.x/api/sqlite.html.

Do not add Zod, Ajv, Prettier, ESLint, Biome, tsx, ts-node, a bundler, Kysely, better-sqlite3, Hono validator/auth/JSX middleware, or a system `sqlite3` binary: each does what Node, SQLite, `validate.ts` or the tools above already do, and the package keeps two dependencies.

## Layout

`src/{index,bin,cli,app,store,source,json_source,sqlite_source,db,validate,schema,sql,where,json_types}.ts`.

- `index.ts`: the package entry, the public API listed by name: `createApp`, `StoreError` and the types of what they take and return. The CLI and the tests import the modules directly.
- `bin.ts` refuses a Node older than 26.10 with a clear message, then runs `cli.ts`. Only `bin.ts`, `cli.ts` and `app.ts` may depend on Hono or the CLI.
- `app.ts`: `createApp`, routes as thin adapters over the store, errors mapped in `onError`. Writes nothing to stdout: everything goes through the `log` option.
- `store.ts`: one method per route, throwing a `StoreError` with the status the route answers (400, 404, 409, 503), the one error class. `#write` translates SQLite's constraint failures: foreign key and `RESTRICT` to 409, on the column with the missing row, or naming the tables that still reference a deleted row (read back from `PRAGMA foreign_key_list`, SQLite's message otherwise), `UNIQUE` to 409 on the column, `NOT NULL` to 400 on the column, `CHECK` and a trigger's `RAISE` to 400 with SQLite's message.
- `source.ts`: the `Source` interface (connection, schema, `sync`, `persist`) behind a store. `json_source.ts` and `sqlite_source.ts` implement it; `createApp` picks `JsonSource` for a `.json` extension and `SqliteSource` for anything else (`isJsonFile`).
- `schema.ts` reads the schema from the tables (`readSchema`, `PRAGMA table_info`); `sql.ts` maps types and builds statements; `validate.ts` checks a body or a dataset against a schema; `where.ts` parses list parameters, from a URL or a `ListParams` object, into SQL; `db.ts` opens connections and holds the read-only authorizer.

## Rules

- The JSON file is the truth for the data, the `.schema.sql` file next to it (`schemaFileOf`) for the schema. The schema file runs first; the data must fit its tables. A resource it does not declare is inferred and its `CREATE TABLE` (columns and types only) appended to the file, created when missing. JSON Server never edits what the file holds: relations, constraints, defaults, indexes, triggers, views are the user's SQL. There is no other config.
- JSON Server knows nothing about relations. A foreign key is SQLite's to declare and enforce; the store only translates its errors.
- `JsonSource.sync` runs at the start of every store call: reread both files, and if their text differs from what was last loaded or written, build a new in-memory database (`build`) and swap it in. While a file fails to load, every call logs why and throws a 503 `StoreError`; nothing is recorded as loaded, so the next call tries again. `persist` runs after every successful write: dump the dataset and write it back atomically. A request rejected before the store (405, 413, 415, a bad id) never sees the 503.
- A SQLite file is served in place: no sync, no save, the schema reread at every call. `open()` waits five seconds on a locked file. `json-server export` is a `VACUUM INTO` of the in-memory database.
- Every property is a real column, `TEXT`, `REAL`, `BOOLEAN` (0/1), `JSON` (object) or `ARRAY` (`sqlType`), read back through those names plus SQLite's standard ones (`propertyType`); `BLOB` is an error. Only plain tables with an `id INTEGER PRIMARY KEY` are resources; views, virtual tables and their shadow tables are not (`tableNames`). JSON Server generates no `CHECK`; the README shows the ones to write when other tools write to a SQLite file.
- Names are kept as-is everywhere, no case conversion: it would collide (`postId` vs `post_id`) and need a translation layer in every path.
- SQL is built with prepared statements; an HTTP value is never concatenated into SQL. The only raw user SQL is `QUERY`, inside `readOnly()`: an authorizer allowing `SQLITE_SELECT`, `SQLITE_READ`, `SQLITE_FUNCTION`, `SQLITE_RECURSIVE`, and `PRAGMA data_version` (FTS5 issues it). Its callback stays synchronous, the authorizer is connection-wide.
- Every error response is `{ errors: [{ field?, message }] }` (`ValidationError`, `fail()`), English, every problem at once. `field` is the body property or query parameter at fault, absent otherwise; messages read after the field name (`must be a string`). Keep `errors` as is so RFC 9457 can wrap it later. A refusal says what to send instead: the valid choices, or the form here of what was tried (`?title=a` → `where.title.eq`, a nested route → a filter), since clients and agents try json-server v0/v1 first. A data file error is one line per problem, `file: path: message` with the path as JavaScript writes it (`db.json: posts[1].views: must be a number or null, like posts[0].views`).
- Success: `POST` 201 with a relative `Location`, `PUT`/`PATCH` 200, `DELETE` 204. CORS `*`. Write bodies max 1 MiB. A property a `POST` leaves out is not in the `INSERT` (the column's `DEFAULT` applies); a `PUT` leaves it `null`; a body `id` on `PUT` or `PATCH` must match the URL.
- `createApp` is meant for `hono.mount(prefix, app.fetch)`: the app never sees its prefix, every URL it emits is relative. It returns `{ app, store }`; `store.db` is a getter to the current connection, a JSON file reopens one at each reload. Nothing to do at shutdown; `store.db.close()` only discards the app.
- Defaults go in the parameter list, `{ log = () => {} }: Options = {}`, never `options.log ?? noop`: the default is then in the signature and its type, where a reader sees it without opening the body.
- Tests: `node:test`, `node:assert/strict`, table-driven, real temporary SQLite. Each behavior is tested once, in the module that decides it; HTTP tests cover what the routes decide (statuses, headers, body shape, log); a few tests launch the CLI process. `node --run test` uses the dot reporter and a random order (`--test-randomize`).
- Stay inside the MVP: no auth, GUI, many-to-many, or json-server query compatibility. `QUERY` later: timeout and row cap (a timeout needs a worker, `node:sqlite` has no progress handler).
