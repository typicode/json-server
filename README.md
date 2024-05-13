# json-server

[![Node.js CI](https://github.com/typicode/json-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/typicode/json-server/actions/workflows/node.js.yml)

> [!IMPORTANT]
> Viewing beta v1 documentation – usable but expect breaking changes. For stable version, see [here](https://github.com/typicode/json-server/tree/v0)

👋 _Hey! Using React, Vue or Astro? Check my new project [MistCSS](https://github.com/typicode/mistcss) to write 50% less code._

## Install

```shell
npm install json-server
```

## Usage

Create a `db.json` or `db.json5` file

```json
{
  "posts": [
    { "id": "1", "title": "a title", "views": 100 },
    { "id": "2", "title": "another title", "views": 200 }
  ],
  "comments": [
    { "id": "1", "text": "a comment about post 1", "postId": "1" },
    { "id": "2", "text": "another comment about post 1", "postId": "1" }
  ],
  "profile": {
    "name": "typicode"
  }
}
```

<details>

<summary>View db.json5 example</summary>

```json5
{
  posts: [
    { id: '1', title: 'a title', views: 100 },
    { id: '2', title: 'another title', views: 200 },
  ],
  comments: [
    { id: '1', text: 'a comment about post 1', postId: '1' },
    { id: '2', text: 'another comment about post 1', postId: '1' },
  ],
  profile: {
    name: 'typicode',
  },
}
```

You can read more about JSON5 format [here](https://github.com/json5/json5).

</details>

Pass it to JSON Server CLI

```shell
$ npx json-server db.json
```

Get a REST API

```shell
$ curl http://localhost:3000/posts/1
{
  "id": "1",
  "title": "a title"
}
```

Run `json-server --help` for a list of options

## Sponsors ✨

|                                                                                    Sponsors                                                                                    |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|                         <a href="https://mockend.com/" target="_blank"><img src="https://jsonplaceholder.typicode.com/mockend.svg" height="80px"></a>                          |
| <a href="https://www.storyblok.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/c6b10674-4ada-4616-91b8-59d30046b45a" height="40px"></a> |
|  <a href="https://betterstack.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/44679f8f-9671-470d-b77e-26d90b90cbdc" height="40px"></a>  |
| <a href="https://www.globalsoftwarecompanies.com" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/d0bb2e9b-9b74-4d91-9c9e-f3c87e152918" height="40px"></a>  |
| <a href="https://beeceptor.com/?utm_source=json-server"><img src="https://github.com/typicode/json-server/assets/5502029/57b852a6-60b9-426b-986e-a148e82783c2" height="40px"></a> |


[Become a sponsor and have your company logo here](https://github.com/users/typicode/sponsorship)

## Sponsorware

> [!NOTE]
> This project uses the [Fair Source License](https://fair.io/). Only organizations with 3+ users are kindly asked to contribute a small amount through sponsorship [sponsor](https://github.com/sponsors/typicode) for usage. __This license helps keep the project sustainable and healthy, benefiting everyone.__
>
> For more information, FAQs, and the rationale behind this, visit [https://fair.io/](https://fair.io/).

## Routes

Based on the example `db.json`, you'll get the following routes:

```
GET    /posts
GET    /posts/:id
POST   /posts
PUT    /posts/:id
PATCH  /posts/:id
DELETE /posts/:id

# Same for comments
```

```
GET   /profile
PUT   /profile
PATCH /profile
```

## Params

### Conditions

- ` ` → `==`
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

### Nested and array fields

- `x.y.z...`
- `x.y.z[i]...`

```
GET /foo?a.b=bar
GET /foo?x.y_lt=100
GET /foo?arr[0]=bar
```

### Embed

```
GET /posts?_embed=comments
GET /comments?_embed=post
```

## Delete

```
DELETE /posts/1
DELETE /posts/1?_dependent=comments
```

## Serving static files

If you create a `./public` directory, JSON Serve will serve its content in addition to the REST API.

You can also add custom directories using `-s/--static` option.

```sh
json-server -s ./static
json-server -s ./static -s ./node_modules
```

## Notable differences with v0.17

- `id` is always a string and will be generated for you if missing
- use `_per_page` with `_page` instead of `_limit`for pagination
- use Chrome's `Network tab > throtling` to delay requests instead of `--delay` CLI option
