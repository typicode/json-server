import { extname } from "node:path";

import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { methodNotAllowed } from "hono/method-not-allowed";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { JsonSource } from "./json_source.ts";
import { listOf } from "./json_types.ts";
import { faviconDataUri, wordmarkSvg } from "./logo.ts";
import { SqliteSource } from "./sqlite_source.ts";
import type { Source, SourceOptions } from "./source.ts";
import { Store, StoreError } from "./store.ts";

/**
 * Every error response has the same shape, `{ errors: [{ field?, message }] }`, so a client
 * handles one format. This builds the single-message case; validation passes its own list.
 */
function fail(
  c: Context,
  status: ContentfulStatusCode,
  message: string,
  headers?: Record<string, string>,
): Response {
  return c.json({ errors: [{ message }] }, status, headers);
}

/** The request body as text, after checking it is of `type`: a 415 otherwise. */
function body(c: Context, type: string): Promise<string> {
  if (!c.req.header("content-type")?.startsWith(type)) {
    throw new HTTPException(415, { message: `content-type must be ${type}` });
  }
  return c.req.text();
}

/** The JSON body. A 400 that is malformed keeps the parser's message, which says where. */
async function jsonBody(c: Context): Promise<unknown> {
  const text = await body(c, "application/json");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new HTTPException(400, {
      message: `body is not valid JSON: ${(error as Error).message}`,
    });
  }
}

/** The row id of the URL, as a number. The store answers 404 to one that cannot be a row id. */
const pathId = (c: Context): number => Number(c.req.param("id"));

/** `SourceOptions`; `log` also receives one line per request (`GET /posts 200 2ms`). */
export type AppOptions = SourceOptions;

/**
 * Serves the resources of `file`, a `.json` file (with the `.schema.sql` schema file next to it,
 * see `JsonSource`) or a SQLite database, as a REST API. Mount the app under a prefix
 * with `hono.mount(prefix, app.fetch)`. Throws `DatasetError` when the file cannot be
 * loaded.
 */
export function createApp(
  file: string,
  { log = () => {}, ...options }: AppOptions = {},
): {
  app: Hono;
  /** The operations behind the routes, as methods. */
  store: Store;
} {
  const store = new Store(openSource(file, { ...options, log }));
  const app = new Hono();

  // Outermost, so it times the whole request. A thrown error is logged as a 500.
  app.use(async (c, next) => {
    const start = performance.now();
    const path = c.req.url.slice(c.req.url.indexOf("/", "https://".length));
    let status = 500;
    try {
      await next();
      status = c.res.status;
    } finally {
      log(`${c.req.method} ${path} ${status} ${Math.round(performance.now() - start)}ms`);
    }
  });

  app.use(
    cors({
      origin: "*",
      allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "QUERY"],
      allowHeaders: ["Content-Type"],
      exposeHeaders: ["Location"],
    }),
  );
  app.use(
    methodNotAllowed({
      app,
      onMethodNotAllowed: (c, methods) =>
        fail(
          c,
          405,
          `method not allowed, use ${listOf(methods)}${idHint(c.req.method, c.req.path)}`,
          {
            Allow: methods.join(", "),
          },
        ),
    }),
  );
  app.notFound((c) => fail(c, 404, notFoundMessage(c.req.path)));
  // `body` and `jsonBody` throw an `HTTPException` for a wrong type or malformed JSON.
  // Anything else is a bug, reported through `log` (Hono's default handler would print to
  // stderr).
  app.onError((error, c) => {
    if (error instanceof HTTPException) return fail(c, error.status, error.message);
    if (error instanceof StoreError) return c.json({ errors: error.errors }, error.status);
    log(`error: ${error.stack ?? error.message}`);
    return fail(c, 500, "internal server error");
  });

  // Scoped to the routes that read a body, not global: a global bodyLimit would run
  // ahead of route matching for every request, so a request to a disallowed method
  // with an oversized body would get 413 instead of the correct 405.
  const limitBody = bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => fail(c, 413, "body must not exceed 1 MiB"),
  });

  app.get("/", (c) => c.html(homepageHtml(store.resources())));

  app.query("/", limitBody, async (c) => {
    return c.json(store.query(await body(c, "application/sql")));
  });

  app.get("/:resource", (c) => {
    const params = new URL(c.req.url, "http://localhost").searchParams;
    return c.json(store.list(c.req.param("resource"), params));
  });

  app.get("/:resource/:id", (c) => c.json(store.get(c.req.param("resource"), pathId(c))));

  app.post("/:resource", limitBody, async (c) => {
    const created = store.create(c.req.param("resource"), await jsonBody(c));
    // Relative, so it stays right when the app is mounted under a prefix.
    return c.json(created, 201, { Location: `${c.req.param("resource")}/${created.id}` });
  });

  app.put("/:resource/:id", limitBody, async (c) => {
    return c.json(store.replace(c.req.param("resource"), pathId(c), await jsonBody(c)));
  });

  app.patch("/:resource/:id", limitBody, async (c) => {
    return c.json(store.patch(c.req.param("resource"), pathId(c), await jsonBody(c)));
  });

  app.delete("/:resource/:id", (c) => {
    store.remove(c.req.param("resource"), pathId(c));
    return c.body(null, 204);
  });

  return { app, store };
}

/** For a write sent to the wrong one of `/posts` and `/posts/<id>`: the right one. */
function idHint(method: string, path: string): string {
  const [resource, id] = path.split("/").slice(1);
  if (!resource) return "";
  if (id === undefined && ["PUT", "PATCH", "DELETE"].includes(method)) {
    return `; ${method} takes an id, as in /${resource}/<id>`;
  }
  return id !== undefined && method === "POST" ? `; POST takes no id, as in /${resource}` : "";
}

/**
 * A nested route is the first thing a client tries for related rows: point to the filter.
 * The column is a guess from the path (`/posts/1/comments` → `postId`); a wrong one gets
 * an error naming the real ones.
 */
function notFoundMessage(path: string): string {
  const [parent, id, child, ...rest] = path.split("/").slice(1);
  if (parent && id && child && rest.length === 0) {
    const column = `${parent.replace(/s$/, "")}Id`;
    return `no nested routes, use /${child}?where.${column}.eq=${id}`;
  }
  return "not found, use /<resource> or /<resource>/<id>";
}

// Resource names are already constrained to NAME_PATTERN (validateDataset), so no
// HTML-escaping is needed to interpolate them here. Links are relative so they work
// when the app is mounted under a prefix.
function homepageHtml(resources: readonly string[]): string {
  const links = resources.map((r) => `<li><a href="${r}">/${r}</a></li>`).join("\n      ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>JSON Server</title>
<link rel="icon" type="image/svg+xml" href="${faviconDataUri}">
<style>
  body { font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { margin: 0 0 0.25rem; }
  h1 svg { display: block; height: 3rem; width: auto; }
  p { color: #555; }
  ul { padding-left: 1.25rem; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; color: #777; font-size: 0.9rem; }
  a { color: #0060df; }
</style>
</head>
<body>
<h1>${wordmarkSvg}</h1>
<p>Turn a JSON file into a REST API backed by SQLite.</p>
${resources.length > 0 ? `<ul>\n      ${links}\n    </ul>` : "<p>No resources.</p>"}
<footer><a href="https://github.com/typicode/json-server">Docs</a> · <a href="https://github.com/sponsors/typicode">Sponsor ♥</a></footer>
</body>
</html>
`;
}

/** A `.json` file is data to mirror; anything else is a SQLite database to serve in place. */
export function isJsonFile(file: string): boolean {
  return extname(file).toLowerCase() === ".json";
}

function openSource(file: string, options: SourceOptions): Source {
  return isJsonFile(file) ? new JsonSource(file, options) : new SqliteSource(file, options);
}
