"use strict";

var express = require('express');

var pluralize = require('pluralize');

var delay = require('./delay');

module.exports = function (opts) {
  var router = express.Router();
  router.use(delay); // Rewrite URL (/:resource/:id/:nested -> /:nested) and request query

  function get(req, res, next) {
    var prop = pluralize.singular(req.params.resource);
    req.query["".concat(prop).concat(opts.foreignKeySuffix)] = req.params.id;
    req.url = "/".concat(req.params.nested);
    next();
  } // Rewrite URL (/:resource/:id/:nested -> /:nested) and request body


  function post(req, res, next) {
    var prop = pluralize.singular(req.params.resource);
    req.body["".concat(prop).concat(opts.foreignKeySuffix)] = req.params.id;
    req.url = "/".concat(req.params.nested);
    next();
  }

  return router.get('/:resource/:id/:nested', get).post('/:resource/:id/:nested', post);
};