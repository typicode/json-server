var express = require('express')
var methodOverride = require('method-override')
var bodyParser = require('body-parser')
var _ = require('underscore')
var low = require('lowdb')
var utils = require('./utils')

low.mixin(require('underscore-db'))
low.mixin(require('underscore.inflections'))
low.mixin({ createId: utils.createId })

module.exports = function(source) {
  // Create router
  var router = express.Router()

  // Add middlewares
  router.use(bodyParser.json({limit: '10mb'}))
  router.use(bodyParser.urlencoded({ extended: false }))
  router.use(methodOverride())

  // Create database
  if (_.isObject(source)) {
    var db = low()
    db.object = source
  } else {
    var db = low(source)
  }

  // Expose database
  router.db = db

  // GET /db
  function showDatabase(req, res, next) {
    res.jsonp(db.object)
  }

  // GET /:resource
  // GET /:resource?q=
  // GET /:resource?attr=&attr=
  // GET /:parent/:parentId/:resource?attr=&attr=
  // GET /*?*&_end=
  // GET /*?*&_start=&_end=
  function list(req, res, next) {
    // Test if resource exists
    if (!db.object.hasOwnProperty(req.params.resource)) {
      return res.sendStatus(404)
    }

    // Filters list
    var filters = {}

    // Result array
    var array

    // Remove _start and _end from req.query to avoid filtering using those
    // parameters
    var _start = req.query._start
    var _end = req.query._end
    var _sort = req.query._sort
    var _order = req.query._order

    delete req.query._start
    delete req.query._end
    delete req.query._sort
    delete req.query._order

    if (req.query.q) {

      // Full-text search
      var q = req.query.q.toLowerCase()

      array = db(req.params.resource).filter(function(obj) {
        for (var key in obj) {
          var value = obj[key]
          if (_.isString(value) && value.toLowerCase().indexOf(q) !== -1) {
            return true
          }
        }
      })

    } else {

      // Add :parentId filter in case URL is like /:parent/:parentId/:resource
      if (req.params.parent) {
        filters[req.params.parent.slice(0, - 1) + 'Id'] = +req.params.parentId
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
    if(_sort) {
      _order = _order || 'ASC'

      array = _.sortBy(array, function(element) {
        return element[_sort];
      })

      if (_order === 'DESC') {
        array.reverse();
      }
    }

    // Slice result
    if (_end) {
      res.setHeader('X-Total-Count', array.length)
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count')

      _start = _start || 0

      array = array.slice(_start, _end)
    }

    res.jsonp(array)
  }

  // GET /:resource/:id
  function show(req, res, next) {
    var resource = db(req.params.resource)
      .get(utils.toNative(req.params.id))

    if (resource) {
      res.jsonp(resource)
    } else {
      res.status(404).jsonp({})
    }
  }

  // POST /:resource
  function create(req, res, next) {
    for (var key in req.body) {
      req.body[key] = utils.toNative(req.body[key])
    }

    var resource = db(req.params.resource)
      .insert(req.body)

    res.jsonp(resource)
  }

  // PUT /:resource/:id
  // PATCH /:resource/:id
  function update(req, res, next) {
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
  function destroy(req, res, next) {
    db(req.params.resource).remove(utils.toNative(req.params.id))

    // Remove dependents documents
    var removable = utils.getRemovable(db.object)

    _(removable).each(function(item) {
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
