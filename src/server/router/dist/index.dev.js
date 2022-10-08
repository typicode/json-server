"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var express = require('express');

var methodOverride = require('method-override');

var _ = require('lodash');

var lodashId = require('lodash-id');

var low = require('lowdb');

var Memory = require('lowdb/adapters/Memory');

var FileSync = require('lowdb/adapters/FileSync');

var bodyParser = require('../body-parser');

var validateData = require('./validate-data');

var plural = require('./plural');

var nested = require('./nested');

var singular = require('./singular');

var mixins = require('../mixins');

module.exports = function (db, opts) {
  opts = Object.assign({
    foreignKeySuffix: 'Id',
    _isFake: false
  }, opts);

  if (typeof db === 'string') {
    db = low(new FileSync(db));
  } else if (!_.has(db, '__chain__') || !_.has(db, '__wrapped__')) {
    db = low(new Memory()).setState(db);
  } // Create router


  var router = express.Router(); // Add middlewares

  router.use(methodOverride());
  router.use(bodyParser);
  validateData(db.getState()); // Add lodash-id methods to db

  db._.mixin(lodashId); // Add specific mixins


  db._.mixin(mixins); // Expose database


  router.db = db; // Expose render

  router.render = function (req, res) {
    res.jsonp(res.locals.data);
  }; // GET /db


  router.get('/db', function (req, res) {
    res.jsonp(db.getState());
  }); // Handle /:parent/:parentId/:resource

  router.use(nested(opts)); // Create routes

  db.forEach(function (value, key) {
    if (_.isPlainObject(value)) {
      router.use("/".concat(key), singular(db, key, opts));
      return;
    }

    if (_.isArray(value)) {
      router.use("/".concat(key), plural(db, key, opts));
      return;
    }

    var sourceMessage = ''; // if (!_.isObject(source)) {
    //   sourceMessage = `in ${source}`
    // }

    var msg = "Type of \"".concat(key, "\" (").concat(_typeof(value), ") ").concat(sourceMessage, " is not supported. ") + "Use objects or arrays of objects.";
    throw new Error(msg);
  }).value();
  router.use(function (req, res) {
    if (!res.locals.data) {
      res.status(404);
      res.locals.data = {};
    }

    router.render(req, res);
  });
  router.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send(err.stack);
  });
  return router;
};