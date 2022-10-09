"use strict";

var express = require('express');

var rewrite = require('express-urlrewrite');

module.exports = function (routes) {
  var router = express.Router();
  router.get('/__rules', function (req, res) {
    res.json(routes);
  });
  Object.keys(routes).forEach(function (key) {
    router.use(rewrite(key, routes[key]));
  });
  return router;
};