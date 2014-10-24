<p align="center">
  <img height="56" width="64" src="http://i.imgur.com/QRlAg0b.png"/>
</p>

# JSON Server [![Build Status](https://travis-ci.org/typicode/json-server.svg)](https://travis-ci.org/typicode/json-server) [![NPM version](https://badge.fury.io/js/json-server.svg)](http://badge.fury.io/js/json-server)

> Give it a JSON or JS file and it will serve it through REST routes.

Created with <3 for front-end developers who need a flexible back-end for quick prototyping and mocking.

_Powers [JSONPlaceholder](http://jsonplaceholder.typicode.com)_

## Usage

### CLI

Create a `db.json` file:

```javascript
{
  "posts": [
    { "id": 1, "body": "foo" }
  ]
}
```

Then run `json-server db.json` and go to `http://localhost:3000/posts/1`. 

You should get `{ "id": 1, "body": "foo" }`.

### Module

```javascript
var server = require('json-server');

server({
  posts: [
    { id: 1, body: 'foo' }
  ]
}).listen(3000);
```

__Tip__ You can mount json-server in Express apps.

## Features

* Lets you use plain JSON or simple JS file
* Supports __GET__ but also __POST__, __PUT__, __DELETE__ and even __PATCH__ requests
* Can be used from anywhere through __cross domain__ requests (JSONP or CORS)
* Can load remote JSON files ([JSON Generator](http://www.json-generator.com/), ...)
* Can be deployed on Nodejitsu, Heroku, ...

## Install

```bash
$ npm install -g json-server
```

## CLI options

```bash
json-server <source>

Examples:
  json-server db.json
  json-server file.js
  json-server http://example.com/db.json


Options:
  --help, -h     Show help
  --version, -v  Show version number
  --port, -p     Set port             [default: 3000]
```

#### Input

Here's 2 examples showing how to format JSON or JS seed file:

__JSON__

```javascript
{
  "posts": [
    { "id": 1, "body": "foo" },
    { "id": 2, "body": "bar" }
  ],
  "comments": [
    { "id": 1, "body": "baz", "postId": 1 },
    { "id": 2, "body": "qux", "postId": 2 }
  ]
}
```

__JS__

```javascript
module.exports = function() {
  var data = {};

  data.posts = [];
  data.posts.push({ id: 1, body: 'foo' });
  //...

  return data;
}
```

JSON Server expects JS files to export a function that returns an object.

JS files are useful if you need to programmaticaly create a lot of data.

## Available routes

Let's say we have `posts`, here's the routes you can use.

```
GET   /posts
GET   /posts?title=jsonserver&author=typicode
GET   /posts/1/comments
GET   /posts/1
POST  /posts
PUT   /posts/1
PATCH /posts/1
DEL   /posts/1
```

To slice resources, add `_start` and `_end`.

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

Returns default index file or content of `./public/index.html` (useful if you need to set a custom home page).

```
GET /
```

For more routes usage examples, have a look at [JSONPlaceholder](https://github.com/typicode/jsonplaceholder)'s README.

## Links

### Articles

* [Fast prototyping using Restangular and Json-server](http://bahmutov.calepin.co/fast-prototyping-using-restangular-and-json-server.html)
* [ng-admin: Add an AngularJS admin GUI to any RESTful API](http://marmelab.com/blog/2014/09/15/easy-backend-for-your-restful-api.html)

### Projects

* [Grunt JSON Server](https://github.com/tfiwm/grunt-json-server)
* [JSON Server GUI](https://github.com/naholyr/json-server-gui)
