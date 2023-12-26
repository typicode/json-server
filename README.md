# json-server

[![Node.js CI](https://github.com/typicode/json-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/typicode/json-server/actions/workflows/node.js.yml)

## Install

```shell
npm install json-server@alpha
```

## Usage

Create a `db.json` or `db.json5` file

```json
{
  "posts": [
    { "id": "1", "title": "a title" },
    { "id": "2", "title": "another title" }
  ],
  "comments": [
    { "id": "1", "text": "a comment about post 1", "postId": "1" },
    { "id": "2", "text": "another comment about post 1", "postId": "1" }
  ]
}
```

Pass it to JSON Server CLI

```shell
json-server db.json
```

Get a REST API

```shell
curl -H "Accept: application/json" -X GET http://localhost:3000/posts/1
{
  "id": "1",
  "title": "a title"
}
```

Run `json-server --help` for a list of options

## Routes

```
GET    /posts
GET    /posts/:id
POST   /posts
PUT    /posts/:id
PATCH  /posts/:id
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
