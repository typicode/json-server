var express = require('express')
var methodOverride = require('method-override')
var bodyParser = require('body-parser')
var _ = require('lodash')
var low = require('lowdb')
var pluralize = require('pluralize')
var utils = require('./utils')

// Add underscore-db methods to lowdb
low.mixin(require('underscore-db'))

// Override underscore-db's createId with utils.createId
// utils.createId can generate incremental id or uuid
low.mixin({createId: utils.createId})

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

  // Expose database
  router.db = db

  // GET /db
  function showDatabase (req, res, next) {
    res.jsonp(db.object)
  }

  // GET /:resource
  // GET /:resource?q=
  // GET /:resource?attr=&attr=
  // GET /:parent/:parentId/:resource?attr=&attr=
  // GET /*?*&_end=
  // GET /*?*&_start=&_end=
  function list (req, res, next) {
    // Test if resource exists
    if (!db.object.hasOwnProperty(req.params.resource)) {
      return res.sendStatus(404)
    }

    // Filters list
    var filters = {}

    // Result array
    var array

    // Remove _start, _end and _limit from req.query to avoid filtering using those
    // parameters
    var _start = req.query._start
    var _end = req.query._end
    var _sort = req.query._sort
    var _order = req.query._order
    var _limit = req.query._limit
    delete req.query._start
    delete req.query._end
    delete req.query._sort
    delete req.query._order
    delete req.query._limit

    if (req.query.q) {

      // Full-text search
      var q = req.query.q.toLowerCase()

      array = db(req.params.resource).filter(function (obj) {
        for (var key in obj) {
          var value = obj[key]
          if (utils.deepQuery(value, q)) {
            return true
          }
        }
      })

    } else {

      // Add :parentId filter in case URL is like /:parent/:parentId/:resource
      if (req.params.parent) {
        var parent = pluralize.singular(req.params.parent)
        filters[parent + 'Id'] = +req.params.parentId
      }

      // Add query parameters filters
      // Convert query parameters to their native counterparts
      for (var key in req.query) {
        // don't take into account JSONP query parameters
        // jQuery adds a '_' query parameter too
        if (key !== 'callback' && key !== '_') {
          filters[key] = utils.toNative(req.query[key])
        }
      }

      // Filter
      if (_(filters).isEmpty()) {
        array = db(req.params.resource).value()
      } else {
        array = db(req.params.resource).filter(filters)
      }
    }

    // Sort
    if (_sort) {
      _order = _order || 'ASC'

      array = _.sortBy(array, function (element) {
        return element[_sort]
      })

      if (_order === 'DESC') {
        array.reverse()
      }
    }

    // Slice result
    if (_end || _limit) {
      res.setHeader('X-Total-Count', array.length)
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    }

    _start = parseInt(_start, 10) || 0

    if (_end) {
      _end = parseInt(_end, 10)
      array = array.slice(_start, _end)
    } else if (_limit) {
      _limit = parseInt(_limit, 10)
      array = array.slice(_start, _start + _limit)
    }

    res.jsonp(array)
  }

  // GET /:resource/:id
  function show (req, res, next) {
    var _embed = req.query._embed
    var resource = db(req.params.resource)
      .get(utils.toNative(req.params.id))

    if (resource) {
      // Always use an array
      _embed = _.isArray(_embed) ? _embed : [_embed]

      // Embed other resources based on resource id
      _embed.forEach(function (otherResource) {
        if (otherResource && otherResource.trim().length > 0) {
          var query = {}
          query[req.params.resource + 'Id'] = req.params.id
          resource[otherResource] = db(otherResource).where(query)
        }
      })

      // Return resource
      res.jsonp(resource)
    } else {
      res.status(404).jsonp({})
    }
  }

  // POST /:resource
  function create (req, res, next) {
    for (var key in req.body) {
      req.body[key] = utils.toNative(req.body[key])
    }

    var resource = db(req.params.resource)
      .insert(req.body)

    res.status(201).jsonp(resource)
  }

  // PUT /:resource/:id
  // PATCH /:resource/:id
  function update (req, res, next) {
    for (var key in req.body) {
      req.body[key] = utils.toNative(req.body[key])
    }

    var resource = db(req.params.resource)
      .update(utils.toNative(req.params.id), req.body)

    if (resource) {
      res.jsonp(resource)
    } else {
      res.status(404).jsonp({})
    }
  }

  // DELETE /:resource/:id
  function destroy (req, res, next) {
    db(req.params.resource).remove(utils.toNative(req.params.id))

    // Remove dependents documents
    var removable = utils.getRemovable(db.object)

    _.each(removable, function (item) {
      db(item.name).remove(item.id)
    })

    res.status(200).jsonp({})
  }

  router.get('/db', showDatabase)

  router.route('/:resource')
    .get(list)
    .post(create)

  router.route('/:resource/:id')
    .get(show)
    .put(update)
    .patch(update)
    .delete(destroy)

  router.get('/:parent/:parentId/:resource', list)

  return router
}
