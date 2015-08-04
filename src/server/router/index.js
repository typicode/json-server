var express = require('express')
var methodOverride = require('method-override')
var bodyParser = require('body-parser')
var _ = require('lodash')
var _db = require('underscore-db')
var low = require('lowdb')
var plural = require('./plural')
var nested = require('./nested')
var singular = require('./singular')
var mixins = require('../mixins')

module.exports = function (source) {

  // Create router
  var router = express.Router()

  // Add middlewares
  router.use(bodyParser.json({limit: '10mb'}))
  router.use(bodyParser.urlencoded({extended: false}))
  router.use(methodOverride())

  // Create database
  var db
  if (_.isObject(source)) {
    db = low()
    db.object = source
  } else {
    db = low(source)
  }

  // Add underscore-db methods to db
  db._.mixin(_db)

  // Add specific mixins
  db._.mixin(mixins)

  // Expose database
  router.db = db

  // Expose database
  router.db = db

  // Expose render
  router.render = function (req, res) {
    res.jsonp(res.locals.data)
  }

  // GET /db
  function showDatabase (req, res, next) {
    res.locals.data = db.object
    next()
  }

  router.get('/db', showDatabase)

  router.use(nested())

  // Create routes
  for (var prop in db.object) {
    var val = db.object[prop]

    if (_.isPlainObject(val)) {
      router.use('/' + prop, singular(db, prop))
      continue
    }

    if (_.isArray(val)) {
      router.use('/' + prop, plural(db, prop))
      continue
    }

    var msg =
      'Type of "' + prop + '" (' + typeof val + ') ' +
      (_.isObject(source) ? '' : 'in ' + source) + ' is not supported. ' +
      'Use objects or arrays of objects.'

    throw new Error(msg)
  }

  router.use(function (req, res) {
    if (!res.locals.data) {
      res.status(404)
      res.locals.data = {}
    }

    router.render(req, res)
  })

  return router
}
