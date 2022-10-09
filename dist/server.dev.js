"use strict";

var jsonServer = require('json-server');

var server = jsonServer.create();
var router = jsonServer.router('./db.json');
var middlewares = jsonServer.defaults({
  "static": './build'
});
var PORT = process.env.PORT || 8000;
server.use(middlewares);
server.use(jsonServer.rewriter({
  '/api/*': '/$1'
}));
server.use(router);
server.listen(PORT, function () {
  console.log('Server is running');
});