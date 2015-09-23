# JSON Server [![](https://travis-ci.org/typicode/json-server.svg)](https://travis-ci.org/typicode/json-server) [![](https://badge.fury.io/js/json-server.svg)](http://badge.fury.io/js/json-server) [![](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/typicode/json-server?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Get a full fake REST API with __zero coding__ in __less than 30 seconds__ (seriously)

Created with <3 for front-end developers who need a quick back-end for prototyping and mocking.

  * [Egghead.io free video tutorial - Creating demo APIs with json-server](https://egghead.io/lessons/nodejs-creating-demo-apis-with-json-server)
  * [JSONPlaceholder - Live running version](http://jsonplaceholder.typicode.com)

_See also [hotel](https://github.com/typicode/hotel) :hotel:, a process manager for web developers._

## Example

Create a `db.json` file

```json
{
  "posts": [
    { "id": 1, "title": "json-server", "author": "typicode" }
  ],
  "comments": [
    { "id": 1, "body": "some comment", "postId": 1 }
  ],
  "profile": { "name": "typicode" }
}
```

Start JSON Server

```bash
$ json-server --watch db.json
```

Now if you go to [http://localhost:3000/posts/1](), you'll get

```json
{ "id": 1, "title": "json-server", "author": "typicode" }
```

Also, if you make POST, PUT, PATCH or DELETE requests, changes will be automatically and safely saved to `db.json` using [lowdb](https://github.com/typicode/lowdb).

## Install

```bash
$ npm install -g json-server
```

## Routes

Based on the previous `db.json` file, here are all the default routes. You can also add [other routes](#add-routes) using `--routes`.

### Plural routes

```
GET    /posts
GET    /posts/1
POST   /posts
PUT    /posts/1
PATCH  /posts/1
DELETE /posts/1
```

### Singular routes

```
GET    /profile
POST   /profile
PUT    /profile
PATCH  /profile
```

### Filter

Use `.` to access deep properties

```
GET /posts?title=json-server&author=typicode
GET /posts?id=1&id=2
GET /comments?author.name=typicode
```

### Slice

Add `_start` and `_end` or `_limit` (an `X-Total-Count` header is included in the response)

```
GET /posts?_start=20&_end=30
GET /posts/1/comments?_start=20&_end=30
GET /posts/1/comments?_start=20&_limit=10
```

### Sort

Add `_sort` and `_order` (ascending order by default)

```
GET /posts?_sort=views&_order=DESC
GET /posts/1/comments?_sort=votes&_order=ASC
```

### Range

Add `_gte` or `_lte`

```
GET /posts?views_gte=10&views_lte=20
```

### Full-text search

Add `q`

```
GET /posts?q=internet
```

### Relationships

To include children resources, add `_embed`

```
GET /posts?_embed=comments
GET /posts/1?_embed=comments
```

To include parent resource, add `_expand`

```
GET /comments?_expand=post
GET /comments/1?_expand=post
```

To get nested resources (by default one level, [add routes](#add-routes) for more)

```
GET /posts/1/comments
```

### Database

```
GET /db
```

### Homepage

Returns default index file or serves `./public` directory

```
GET /
```

## Extras

### Static file server

You can use JSON Server to serve your HTML, JS and CSS, simply create a `./public` directory
or use `--static`.

```bash
mkdir public
echo 'hello word' > public/index.html
json-server db.json
```

```bash
json-server db.json --static ./static
```

### Access from anywhere

You can access your fake API from anywhere using CORS and JSONP.

### Remote schema

You can load remote schemas.

```bash
$ json-server http://example.com/file.json
$ json-server http://jsonplaceholder.typicode.com/db
```

### Generate random data

Using JS instead of a JSON file, you can create data programmatically.

```javascript
// index.js
module.exports = function() {
  var data = { users: [] }
  // Create 1000 users
  for (var i = 0; i < 1000; i++) {
    data.users.push({ id: i, name: 'user' + i })
  }
  return data
}
```

```bash
$ json-server index.js
```

__Tip__ use modules like [faker](https://github.com/Marak/faker.js), [casual](https://github.com/boo1ean/casual) or [chance](https://github.com/victorquinn/chancejs).

### Add routes

Create a `routes.json` file.

```json
{
  "/api/": "/",
  "/blog/:resource/:id/show": "/:resource/:id"
}
```

Start JSON Server with `--routes` option.

```bash
json-server db.json --routes routes.json
```

Now you can access resources using additional routes.

```bash
/api/posts
/api/posts/1
/blog/posts/1/show
```

### Module

If you need to add authentication, validation, you can use the project as a module in combination with other Express middlewares.

```javascript
var jsonServer = require('json-server')

// Returns an Express server
var server = jsonServer.create()

// Set default middlewares (logger, static, cors and no-cache)
server.use(jsonServer.defaults())

// Returns an Express router
var router = jsonServer.router('db.json')
server.use(router)

server.listen(3000)
```

For an in-memory database, you can pass an object to `jsonServer.router()`.
Please note also that `jsonServer.router()` can be used in existing Express projects.

To modify responses, use `router.render()`:

```javascript
// In this example, returned resources will be wrapped in a body property
router.render = function (req, res) {
  res.jsonp({
   body: res.locals.data
  })
}
```

To add rewrite rules, use `jsonServer.rewriter()`:

```javascript
// Add this before server.use(router)
server.use(jsonServer.rewriter({
  '/api/': '/',
  '/blog/:resource/:id/show': '/:resource/:id'
}))
```

Alternatively, you can also mount the router on another path.

```javascript
server.use('/api', router)
```

### Deployment

You can deploy JSON Server. For example, [JSONPlaceholder](http://jsonplaceholder.typicode.com) is an online fake API powered by JSON Server and running on Heroku.

## Links

### Video

* [Creating Demo APIs with json-server on egghead.io](https://egghead.io/lessons/nodejs-creating-demo-apis-with-json-server)

### Articles

* [Node Module Of The Week - json-server](http://nmotw.in/json-server/)
* [Mock up your REST API with JSON Server](http://www.betterpixels.co.uk/projects/2015/05/09/mock-up-your-rest-api-with-json-server/)
* [how to build quick json REST APIs for development](http://outloudthinking.me/how-to-build-quick-json-rest-apis/)
* [ng-admin: Add an AngularJS admin GUI to any RESTful API](http://marmelab.com/blog/2014/09/15/easy-backend-for-your-restful-api.html)
* [Fast prototyping using Restangular and Json-server](http://glebbahmutov.com/blog/fast-prototyping-using-restangular-and-json-server/)

### Third-party tools

* [Grunt JSON Server](https://github.com/tfiwm/grunt-json-server)
* [Docker JSON Server](https://github.com/clue/docker-json-server)
* [JSON Server GUI](https://github.com/naholyr/json-server-gui)
* [JSON file generator](https://github.com/dfsq/json-server-init)

## License

MIT - [Typicode](https://github.com/typicode)
