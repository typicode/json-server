# json-server

[![Node.js CI](https://github.com/typicode/json-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/typicode/json-server/actions/workflows/node.js.yml)

## Usage

Install `json-server`

```shell
npm install json-server
```

Create a `db.json` file or run `json-server db.json` to create one with some default resources

```json
{
  "posts": [
    { "id": "1", "title": "string" },
    { "id": "2", "title": "some post" }
  ],
  "comments": [
    { "id": "1", "text": "some text", "postId": "1" },
    { "id": "2", "text": "some text", "postId": "1" }
  ]
}
```

```shell
json-server db.json
```

Run `json-server --help` for a list of options

## Routes

```
GET    /posts
GET    /posts/:id
POST   /posts
PUT    /posts
DELETE /posts/:id
```

## Params

### Comparison

- ` ` →`==`
- `lt` → `<`
- `lte` → `<=`
- `gt` → `>`
- `gte` → `>=`
- `ne` → `!=`

```
GET /posts?views_gt=9000
```

### Range

- `start`
- `end`
- `limit`

```
GET /posts?_start=10&_end=20
GET /posts?_start=10&_limit=10
```

### Paginate

- `page`
- `per_page` (default = 10)

```
GET /posts?_page=1&_per_page=25
```

### Sort

- `_sort=f1,f2`

```
GET /posts?_sort=id,-views
```

### Nested fields

- `x.y.z`

### Include

```
GET /posts?_include=comments
GET /comments?_include=post
```

## Delete

```
DELETE /posts/1
DELETE /posts/1?_include=comments
```

# Serving static files

If you create a `./public` directory, JSON Serve will serve its content in addition to the REST API. You can add custom directories using `-s/--static` option.

```sh
json-server -s ./static
json-server -s ./static -s ./node_modules
```
