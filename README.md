# JSON Server [![](https://travis-ci.org/typicode/json-server.svg)](https://travis-ci.org/typicode/json-server) [![](https://badge.fury.io/js/json-server.svg)](http://badge.fury.io/js/json-server)

> Get a full fake REST API with __zero coding__ in __less than 30 seconds__ (seriously)

Created with <3 for front-end developers who need a quick back-end for prototyping and mocking.

For a live running version, see [JSONPlaceholder](http://jsonplaceholder.typicode.com).

## Example

Create a `db.json` file

```javascript
{
  "posts": [
    { "id": 1, "title": "json-server", "author": "typicode" }
  ],
  "comments": [
    { "id": 1, "body": "some comment", "postId": 1 }
  ]
}
```

Start JSON Server

```bash
$ json-server db.json
```

Now if you go to [http://localhost:3000/posts/1](), you'll get

```javascript
{ "id": 1, "title": "json-server", "author": "typicode" }
```

Also, if you make POST, PUT, PATCH or DELETE requests, changes will be saved to `db.json`

## Routes

Here are all the available routes.

```
GET   /posts
GET   /posts/1
GET   /posts/1/comments
GET   /posts?title=json-server&author=typicode
POST  /posts
PUT   /posts/1
PATCH /posts/1
DEL   /posts/1
```

To slice resources, add `_start` and `_end`. An `X-Total-Count` header is included in the response.

```
GET /posts?_start=0&_end=10
GET /posts/1/comments?_start=0&_end=10
```

To sort resources, add `_sort` and `_order` (ascending order by default).

```
GET /posts?_sort=views&_order=DESC
GET /posts/1/comments?_sort=votes&_order=ASC
```

To make a full-text search on resources, add `q`.

```
GET /posts?q=internet
```

Returns database.

```
GET /db
```

Returns default index file or serves `./public` directory.

```
GET /
```

## Install

```bash
$ npm install -g json-server
```

## Extras

### Static file server

You can use JSON Server to serve your HTML, JS and CSS, simply create a `./public` directory.

### Access from anywhere

You can access your fake API from anywhere using CORS and JSONP.

### Remote schema

You can load remote schemas:

```bash
$ json-server http://example.com/file.json
$ json-server http://jsonplaceholder.typicode.com/db
```

### JS file support

You can use JS to programmatically create data:

```javascript
module.exports = function() {
  data = { users: [] }
  // Create 1000 users
  for (var i = 0; i < 1000; i++) {
    data.users.push({ name: 'user' + i })
  }
  return data
}
```

```bash
$ json-server index.js
```

### Module

You can use JSON Server as a module:

```javascript
var jsonServer = require('json-server')

var server = jsonServer.create()         // Express server
server.use(jsonServer.defaults)          // Default middlewares (logger, public, cors)
server.use(jsonServer.router('db.json')) // Express router

server.listen(3000)
```

For an in-memory database, you can pass an object to `jsonServer.route()`.

### Deployment

You can deploy JSON Server. For example, [JSONPlaceholder](http://jsonplaceholder.typicode.com) is an online fake API powered by JSON Server and running on Heroku.

## Links

### Video

* [Creating Demo APIs with json-server on egghead.io](https://egghead.io/lessons/nodejs-creating-demo-apis-with-json-server)

### Articles

* [Fast prototyping using Restangular and Json-server](http://glebbahmutov.com/blog/fast-prototyping-restangular-and-json-server/)
* [ng-admin: Add an AngularJS admin GUI to any RESTful API](http://marmelab.com/blog/2014/09/15/easy-backend-for-your-restful-api.html)
* [how to build quick json REST APIs for development](http://outloudthinking.me/how-to-build-quick-json-rest-apis/)

### Projects

* [Grunt JSON Server](https://github.com/tfiwm/grunt-json-server)
* [Docker JSON Server](https://github.com/clue/docker-json-server)
* [JSON Server GUI](https://github.com/naholyr/json-server-gui)

## License

MIT - [Typicode](https://github.com/typicode)
