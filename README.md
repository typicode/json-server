# JSON Server v1 (Beta)

Fast mock REST API from a JSON file.

> Beta note: v1 can still change. For stable v0.17 docs, see:
> https://github.com/typicode/json-server/tree/v0.17.4

## Quickstart (30s)

Install:

```sh
npm install json-server
```

Create `db.json`:

```json
{
  "posts": [
    { "id": "1", "title": "Hello", "views": 100 },
    { "id": "2", "title": "World", "views": 200 }
  ],
  "comments": [{ "id": "1", "text": "Nice", "postId": "1" }],
  "profile": { "name": "typicode" }
}
```

Run:

```sh
npx json-server db.json
```

Try:

```sh
curl http://localhost:3000/posts/1
```

Response:

```json
{
  "id": "1",
  "title": "Hello",
  "views": 100
}
```

## Query capabilities overview

```http
GET /posts?views:gt=100
GET /posts?_sort=-views
GET /posts?_page=1&_per_page=10
GET /posts?_embed=comments
GET /posts?_where={"or":[{"views":{"gt":100}},{"title":{"eq":"Hello"}}]}
```

## Routes

For array resources (`posts`, `comments`):

```text
GET    /posts
GET    /posts/:id
POST   /posts
PUT    /posts/:id
PATCH  /posts/:id
DELETE /posts/:id
```

For object resources (`profile`):

```text
GET   /profile
PUT   /profile
PATCH /profile
```

## Query params

### Conditions

Use `field:operator=value`.

Operators:

- no operator -> `eq` (equal)
- `lt` less than, `lte` less than or equal
- `gt` greater than, `gte` greater than or equal
- `eq` equal, `ne` not equal

Examples:

```http
GET /posts?views:gt=100
GET /posts?title:eq=Hello
GET /posts?author.name:eq=typicode
```

### Sort

```http
GET /posts?_sort=title
GET /posts?_sort=-views
GET /posts?_sort=author.name,-views
```

### Pagination

```http
GET /posts?_page=1&_per_page=25
```

- `_per_page` default is `10`
- invalid page/per_page values are normalized

### Embed

```http
GET /posts?_embed=comments
GET /comments?_embed=post
```

### Complex filter with `_where`

`_where` accepts a JSON object and overrides normal query params when valid.

```http
GET /posts?_where={"or":[{"views":{"gt":100}},{"author":{"name":{"lt":"m"}}}]}
```

## Delete dependents

```http
DELETE /posts/1?_dependent=comments
```

## Static files

JSON Server serves `./public` automatically.

Add more static dirs:

```sh
json-server -s ./static
json-server -s ./static -s ./node_modules
```

## Behavior notes

- `id` is always a string and is generated if missing.
- `_where` has priority over URL filter params.
- Unknown operators in URL/query filters are ignored.
