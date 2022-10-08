"use strict";

var url = require('url');

module.exports = function getFullURL(req) {
  var root = url.format({
    protocol: req.protocol,
    host: req.get('host')
  });
  return "".concat(root).concat(req.originalUrl);
};