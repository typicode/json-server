# JSON Server [![](https://travis-ci.org/typicode/json-server.svg)](https://travis-ci.org/typicode/json-server) [![](https://badge.fury.io/js/json-server.svg)](http://badge.fury.io/js/json-server) [![](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/typicode/json-server?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Get a full fake REST API with __zero coding__ in __less than 30 seconds__ (seriously)

Created with <3 for front-end developers who need a quick back-end for prototyping and mocking.

  * [Egghead.io free video tutorial - Creating demo APIs with json-server](https://egghead.io/lessons/nodejs-creating-demo-apis-with-json-server)
  * [JSONPlaceholder - Live running version](http://jsonplaceholder.typicode.com)

## Example

Create a `db.json` file

```json
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
$ json-server --watch db.json
```

Now if you go to [http://localhost:3000/posts/1](), you'll get

```json
{ "id": 1, "title": "json-server", "author": "typicode" }
```

Also, if you make POST, PUT, PATCH or DELETE requests, changes will be automatically saved to `db.json` using [lowdb](https://github.com/typicode/lowdb).

## Routes

Based on the previous `db.json` file, here are all the available routes. If you need more customization, you can use the project as a [module](https://github.com/typicode/json-server#module).

```
GET    /posts
GET    /posts/1
GET    /posts/1/comments
GET    /posts?title=json-server&author=typicode
POST   /posts
PUT    /posts/1
PATCH  /posts/1
DELETE /posts/1
```

To slice resources, add `_start` and `_end` or `_limit` (an `X-Total-Count` header is included in the response).

```
GET /posts?_start=20&_end=30
GET /posts/1/comments?_start=20&_end=30
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

To embed other resources, add `_embed`.

```
GET /posts/1?_embed=comments
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

### Module

If you need to add authentication, validation, rewrite or add routes, you can use the project as a module in combination with other Express middlewares.

```javascript
var jsonServer = require('json-server')

var server = jsonServer.create() // Returns an Express server
var router = jsonServer.router('db.json') // Returns an Express router

server.use(jsonServer.defaults) // logger, static and cors middlewares
server.use(router) // Mount router on '/'

server.listen(3000)
```

For an in-memory database, you can pass an object to `jsonServer.router()`.
Please note also that `jsonServer.router()` can be used in existing Express projects.

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

### Projects

* [Grunt JSON Server](https://github.com/tfiwm/grunt-json-server)
* [Docker JSON Server](https://github.com/clue/docker-json-server)
* [JSON Server GUI](https://github.com/naholyr/json-server-gui)

## License

MIT - [Typicode](https://github.com/typicode)
