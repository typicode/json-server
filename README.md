# json-server

[![Node.js CI](https://github.com/typicode/json-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/typicode/json-server/actions/workflows/node.js.yml)

## Usage

Install `json-server`

```shell
npm install json-server@alpha
```

Create a `db.json` file or run `json-server db.json` to create one with some default resources

> [!TIP]
> You can also use [json5](https://json5.org/) format by creating a `db.json5` instead

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

```shell
json-server db.json
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
