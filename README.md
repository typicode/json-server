[![Build Status](https://travis-ci.org/typicode/json-server.png)](https://travis-ci.org/typicode/json-server)
[![NPM version](https://badge.fury.io/js/json-server.png)](http://badge.fury.io/js/json-server)

![](http://i.imgur.com/dLeJmw6.png)

# JSON Server

Give it a JSON or JS seed file and it will serve it through REST routes.

Created with :heart: for front-end developers who need a flexible back-end for quick prototyping and mocking.

## Examples

### Command line interface

```bash
$ cat db.json
{
  "posts": [
    { "id": 1, "body": "foo" }
  ]
}
$ json-server --file db.json
$ curl -i http://localhost:3000/posts/1
```

You can type 's' at any moment to save the current live JSON object to timestamped
file.

### Node module

```javascript
var server = require('json-server');

var db = {
  posts: [
    { id: 1, body: 'foo' }
  ]
}

server.run(db);
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
json-server --help

  Usage: json-server [options]

  Options:

    -h, --help        output usage information
    -V, --version     output the version number
    -f --file <file>  load db from a js or json file
    -u --url <url>    load db from a URL
    -p --port [port]  server port
    --read-only       read only mode
```

JSON Server can load JSON from multiple sources:

```bash
$ json-server --file db.json
$ json-server --file seed.js
$ json-server --url http://example.com/db.json
```

And be run in read-only mode (useful if deployed on a public server):

```bash
$ json-server --file db.json --read-only
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
GET   /:resource?attr=&attr=&
GET   /:parent/:parentId/:resource
GET   /:resource/:id
GET   /:resource/range/:from/:to
POST  /:resource
PUT   /:resource/:id
PATCH /:resource/:id
DEL   /:resource/:id
```

For routes usage information, have a look at [JSONPlaceholder](https://github.com/typicode/jsonplaceholder) code examples.

```
GET /db
```

Returns database state.


```
GET /
```

Returns default index file or content of ./public/index.html (useful if you need to set a custom home page).


```
GET /:resource/range/:from/:to
```

Assumes the `resource` is an array and returns its slice from `from` index to `to`, for example
`/posts/range/5/10`

## Support

If you like the project, please tell your friends about it, star it or give feedback :) It's very much appreciated!

For project updates or to get in touch, [@typicode](http://twitter.com/typicode). You can also send me a mail.

## Test

```bash
$ npm install
$ npm test
```

## Articles

[Fast prototyping using Restangular and Json-server](http://bahmutov.calepin.co/fast-prototyping-using-restangular-and-json-server.html)
