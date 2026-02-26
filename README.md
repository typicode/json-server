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

Start JSON Server

```bash
npx json-server db.json
```

This starts the server at `http://localhost:3000`. You should see:
```
JSON Server started on PORT :3000
http://localhost:3000
```

Access your REST API:

```bash
curl http://localhost:3000/posts/1
```

**Response:**
```json
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
| <a href="http://git-tower.com/?utm_source=husky&utm_medium=referral"><img height="100px" alt="tower-dock-icon-light" src="https://github.com/user-attachments/assets/b6b4ab20-beff-4e5c-9845-bb9d60057196" /></a> |
| <a href="https://serpapi.com/?utm_source=typicode"><img height="100px" src="https://github.com/user-attachments/assets/52b3039d-1e4c-4c68-951c-93f0f1e73611" /></a>


### Silver

|                                                                                                                                                                                                                                         |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| <a href="https://requestly.com?utm_source=githubsponsor&utm_medium=jsonserver&utm_campaign=jsonserver"><img src="https://github.com/user-attachments/assets/f7e7b3cf-97e2-46b8-81c8-cb3992662a1c" style="height:70px; width:auto;"></a> |

### Bronze

|                                                                                                                                                                                |                                                                                                                                                                              |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| <a href="https://www.storyblok.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/c6b10674-4ada-4616-91b8-59d30046b45a" height="35px"></a> | <a href="https://betterstack.com/" target="_blank"><img src="https://github.com/typicode/json-server/assets/5502029/44679f8f-9671-470d-b77e-26d90b90cbdc" height="35px"></a> |

[Become a sponsor and have your company logo here](https://github.com/users/typicode/sponsorship)

## Query Capabilities

JSON Server supports advanced querying out of the box:

```http
GET /posts?views:gt=100                  # Filter by condition
GET /posts?_sort=-views                  # Sort by field (descending)
GET /posts?_page=1&_per_page=10          # Pagination
GET /posts?_embed=comments               # Include relations
GET /posts?_where={"or":[...]}           # Complex queries
```

See detailed documentation below for each feature.

## Routes

### Array Resources

For array resources like `posts` and `comments`:

```http
GET    /posts
GET    /posts/:id
POST   /posts
PUT    /posts/:id
PATCH  /posts/:id
DELETE /posts/:id
```

### Object Resources

For singular object resources like `profile`:

```http
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
- `in` included in comma-separated list
- `contains` string contains (case-insensitive)
- `startsWith` string starts with (case-insensitive)
- `endsWith` string ends with (case-insensitive)

Examples:

```http
GET /posts?views:gt=100
GET /posts?title:eq=Hello
GET /posts?id:in=1,2,3
GET /posts?author.name:eq=typicode
GET /posts?title:contains=hello
GET /posts?title:startsWith=Hello
GET /posts?title:endsWith=world
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

**Response:**
```json
{
  "first": 1,
  "prev": null,
  "next": 2,
  "last": 4,
  "pages": 4,
  "items": 100,
  "data": [
    { "id": "1", "title": "...", "views": 100 },
    { "id": "2", "title": "...", "views": 200 }
  ]
}
```

**Notes:**
- `_per_page` defaults to `10` if not specified
- Invalid `_page` or `_per_page` values are automatically normalized to valid ranges

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

## Static Files

JSON Server automatically serves files from the `./public` directory.

To serve additional static directories:

```bash
json-server db.json -s ./static
json-server db.json -s ./static -s ./node_modules
```

Static files are served with standard MIME types and can include HTML, CSS, JavaScript, images, and other assets.

## Migration Notes (v0 → v1)

If you are upgrading from json-server v0.x, note these behavioral changes:

- **ID handling:** `id` is always a string and will be auto-generated if not provided
- **Pagination:** Use `_per_page` with `_page` instead of the deprecated `_limit` parameter
- **Relationships:** Use `_embed` instead of `_expand` for including related resources
- **Request delays:** Use browser DevTools (Network tab > throttling) instead of the removed `--delay` CLI option

> **New to json-server?** These notes are for users migrating from v0. If this is your first time using json-server, you can ignore this section.
