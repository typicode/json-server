# JSON-Server

[![Node.js CI](https://github.com/typicode/json-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/typicode/json-server/actions/workflows/node.js.yml)

> [!IMPORTANT]
> Viewing beta v1 documentation – usable but expect breaking changes. For stable version, see [here](https://github.com/typicode/json-server/tree/v0.17.4)

> [!NOTE]
> Using React ⚛️ and tired of CSS-in-JS? See [MistCSS](https://github.com/typicode/mistcss) 👀

## Install

```shell
npm install json-server
```

## Usage

Create a `db.json` or `db.json5` file

```json
{
  "$schema": "./node_modules/json-server/schema.json",
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
    { id: "1", title: "a title", views: 100 },
    { id: "2", title: "another title", views: 200 },
  ],
  comments: [
    { id: "1", text: "a comment about post 1", postId: "1" },
    { id: "2", text: "another comment about post 1", postId: "1" },
  ],
  profile: {
    name: "typicode",
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
  "title": "a title",
  "views": 100
}
```

Run `json-server --help` for a list of options

## Sponsors ✨

### Gold

|                                                                                                                                                            |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------: |
|               <a href="https://mockend.com/" target="_blank"><img src="https://jsonplaceholder.typicode.com/mockend.svg" height="100px"></a>               |
| <a href="https://zuplo.link/json-server-gh"><img src="https://github.com/user-attachments/assets/adfee31f-a8b6-4684-9a9b-af4f03ac5b75" height="100px"></a> |
|     <a href="https://www.mintlify.com/"><img src="https://github.com/user-attachments/assets/bcc8cc48-b2d9-4577-8939-1eb4196b7cc5" height="100px"></a>     |
| <a href="http://git-tower.com/?utm_source=husky&utm_medium=referral"><img height="100px" alt="tower-dock-icon-light" src="https://github.com/user-attachments/assets/b6b4ab20-beff-4e5c-9845-bb9d60057196" /></a>

### Silver

|                                                                                                                                                                                                                                         |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| <a href="https://requestly.com?utm_source=githubsponsor&utm_medium=jsonserver&utm_campaign=jsonserver"><img src="https://github.com/user-attachments/assets/f7e7b3cf-97e2-46b8-81c8-cb3992662a1c" style="height:70px; width:auto;"></a> |

### Bronze

|                                                                                                                                                                                |                                                                                                                                                                              |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| <a href="https://www.storyblok.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/c6b10674-4ada-4616-91b8-59d30046b45a" height="35px"></a> | <a href="https://betterstack.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/44679f8f-9671-470d-b77e-26d90b90cbdc" height="35px"></a> |

[Become a sponsor and have your company logo here](https://github.com/users/typicode/sponsorship)

## Sponsorware

> [!NOTE]
> This project uses the [Fair Source License](https://fair.io/). Only organizations with 3+ users are kindly asked to contribute a small amount through sponsorship [sponsor](https://github.com/sponsors/typicode) for usage. **This license helps keep the project sustainable and healthy, benefiting everyone.**
>
> For more information, FAQs, and the rationale behind this, visit [https://fair.io/](https://fair.io/).

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

- `id` is always a string and will be generated for you if missing
- use `_per_page` with `_page` instead of `_limit`for pagination
- use `_embed` instead of `_expand`
- use Chrome's `Network tab > throtling` to delay requests instead of `--delay` CLI option
