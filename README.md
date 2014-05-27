<p align="center">
  <img height="56" width="64" src="http://i.imgur.com/dLeJmw6.png"/>
</p>

# JSON Server

Give it a JSON or JS seed file and it will serve it through REST routes.

Created with :heart: for front-end developers who need a flexible back-end for quick prototyping and mocking.

[![Build Status](https://travis-ci.org/typicode/json-server.svg)](https://travis-ci.org/typicode/json-server)
[![NPM version](https://badge.fury.io/js/json-server.svg)](http://badge.fury.io/js/json-server)

## Examples

### Command line interface

```javascript
// db.json
{ 
  "posts": [
    { "id": 1, "body": "foo" }
  ]
}
```

```bash
$ json-server --file db.json
$ curl -i http://localhost:3000/posts/1
```

### Node module

```javascript
var server = require('json-server');

server.low.db = { 
  posts: [
    { id: 1, body: 'foo' }
  ]
}

server.get('/another/route', function(req, res, next) {
  // ...
})

server.listen(3000);
```

You can find a running demo here: http://jsonplaceholder.typicode.com.

## Why?

* Lets you use plain JSON or simple JS file
* Supports __GET__ but also __POST__, __PUT__, __DELETE__ and even __PATCH__ requests
* Can be used from anywhere through __cross domain__ requests (JSONP or CORS)
* Can load remote JSON files
* Can be deployed on Nodejitsu, Heroku, ...


## Installation

```bash
$ npm install -g json-server
```

## Usage

### Command line interface

```bash

  Usage: json-server <source> [options]

  Options:

    --version      output version
    --port <port>  set port

  Exemples:

    json-server db.json
    json-server seed.js
    json-server http://example.com/db.json
    
```

#### Input

Here's 2 examples showing how to format JSON or JS seed file:

* __db.json__

```javascript
{
  "posts": [
    { "id": 1, "body": "foo" },
    { "id": 2, "body": "bar" }
  ],
  "comments": [
    { "id": 1, "body": "baz", "postId": 1 }
    { "id": 2, "body": "qux", "postId": 2 }
  ]
}
```

* __seed.js__

```javascript
exports.run = function() {
  var data = {};

  data.posts = [];
  data.posts.push({ id: 1, body: 'foo' });
  //...

  return data;
}
```

JSON Server expects JS files to export a ```run``` method that returns an object.

Seed files are useful if you need to programmaticaly create a lot of data.

### Node module

#### run(db, [options])

```javascript
var server = require('json-server'),
    db = require('./seed').run();

var options = { port: 4000, readOnly: true };

server.run(db, options);
```

By default, ```port``` is set to 3000 and ```readOnly``` to false.

## Routes

```
GET   /:resource
GET   /:resource?filter=&filter=&
GET   /:parent/:parentId/:resource
GET   /:resource/:id
POST  /:resource
PUT   /:resource/:id
PATCH /:resource/:id
DEL   /:resource/:id
```

To slice resources, add `_start` and `_end` to query parameters.

For routes usage information, have a look at [JSONPlaceholder](https://github.com/typicode/jsonplaceholder) code examples.

```
GET /db
```

Returns database state.

```
GET /
```

Returns default index file or content of ./public/index.html (useful if you need to set a custom home page).

## Articles

* [Fast prototyping using Restangular and Json-server](http://bahmutov.calepin.co/fast-prototyping-using-restangular-and-json-server.html)
