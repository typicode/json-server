"use strict";

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);

    if (enumerableOnly) {
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }

    keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};

    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
      });
    }
  }

  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var express = require('express');

var write = require('./write');

var getFullURL = require('./get-full-url');

var delay = require('./delay');

module.exports = function (db, name, opts) {
  var router = express.Router();
  router.use(delay);

  function show(req, res, next) {
    res.locals.data = db.get(name).value();
    next();
  }

  function create(req, res, next) {
    if (opts._isFake) {
      res.locals.data = req.body;
    } else {
      db.set(name, req.body).value();
      res.locals.data = db.get(name).value();
    }

    res.setHeader('Access-Control-Expose-Headers', 'Location');
    res.location("".concat(getFullURL(req)));
    res.status(201);
    next();
  }

  function update(req, res, next) {
    if (opts._isFake) {
      if (req.method === 'PUT') {
        res.locals.data = req.body;
      } else {
        var resource = db.get(name).value();
        res.locals.data = _objectSpread(_objectSpread({}, resource), req.body);
      }
    } else {
      if (req.method === 'PUT') {
        db.set(name, req.body).value();
      } else {
        db.get(name).assign(req.body).value();
      }

      res.locals.data = db.get(name).value();
    }

    next();
  }

  var w = write(db);
  router.route('/').get(show).post(create, w).put(update, w).patch(update, w);
  return router;
};