var express = require('express')
var methodOverride = require('method-override')
var bodyParser = require('body-parser')
var _ = require('lodash')
var _db = require('underscore-db')
var low = require('lowdb')
var pluralize = require('pluralize')
var utils = require('./utils')
var mixins = require('./mixins')

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

  // Expose render
  router.render = function (req, res) {
    res.jsonp(res.locals.data)
  }

  // GET /db
  function showDatabase (req, res, next) {
    res.locals.data = db.object
    next()
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
      res.status(404)
      return next()
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
          if (db._.deepQuery(value, q)) {
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
        var chain = db(req.params.resource).chain()
        for (var f in filters) {
          // This syntax allow for deep filtering using lodash (i.e. a.b.c[0])
          chain = chain.filter(f, filters[f])
        }
        array = chain.value()
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

    res.locals.data = array
    next()
  }

  // GET /:resource/:id
  function show (req, res, next) {
    var _embed = req.query._embed
    var id = utils.toNative(req.params.id)
    var resource = db(req.params.resource)
      .getById(id)

    if (resource) {
      // Clone resource to avoid making changes to the underlying object
      resource = _.cloneDeep(resource)
      // Always use an array
      _embed = _.isArray(_embed) ? _embed : [_embed]

      // Embed other resources based on resource id
      _embed.forEach(function (otherResource) {

        if (otherResource
          && otherResource.trim().length > 0
          && db.object[otherResource]) {
          var query = {}
          var prop = pluralize.singular(req.params.resource) + 'Id'
          query[prop] = id
          resource[otherResource] = db(otherResource).where(query)

        }
      })

      res.locals.data = resource
    } else {
      res.status(404)
      res.locals.data = {}
    }

    next()
  }

  // POST /:resource
  function create (req, res, next) {
    for (var key in req.body) {
      req.body[key] = utils.toNative(req.body[key])
    }

    var resource = db(req.params.resource)
      .insert(req.body)

    res.status(201)
    res.locals.data = resource
    next()
  }

  // PUT /:resource/:id
  // PATCH /:resource/:id
  function update (req, res, next) {
    for (var key in req.body) {
      req.body[key] = utils.toNative(req.body[key])
    }

    var resource = db(req.params.resource)
      .updateById(utils.toNative(req.params.id), req.body)

    if (resource) {
      res.locals.data = resource
    } else {
      res.status(404)
      res.locals.data = {}
    }

    next()
  }

  // DELETE /:resource/:id
  function destroy (req, res, next) {
    db(req.params.resource).removeById(utils.toNative(req.params.id))

    // Remove dependents documents
    var removable = db._.getRemovable(db.object)

    _.each(removable, function (item) {
      db(item.name).removeById(item.id)
    })

    res.locals.data = {}
    next()
  }

  router.get('/db', showDatabase, router.render)

  router.route('/:resource')
    .get(list)
    .post(create)

  router.route('/:resource/:id')
    .get(show)
    .put(update)
    .patch(update)
    .delete(destroy)

  router.get('/:parent/:parentId/:resource', list)

  router.all('*', function (req, res) {
    router.render(req, res)
  })

  return router
}
