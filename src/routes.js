var _ = require('underscore')
var low = require('lowdb')
var utils = require('./utils')

var routes = {}

// GET /db
routes.db = function(req, res, next) {
  res.jsonp(low.db)
}

// GET /:resource
// GET /:resource?q=
// GET /:resource?attr=&attr=
// GET /:parent/:parentId/:resource?attr=&attr=
// GET /*?*&_end=
// GET /*?*&_start=&_end=
routes.list = function(req, res, next) {

  // Filters list
  var filters = {}

  // Result array
  var array

  // Remove _start and _end from req.query to avoid filtering using those
  // parameters
  var _start = req.query._start
  var _end = req.query._end
  var _sort = req.query._sort
  var _sortDir = req.query._sortDir

  delete req.query._start
  delete req.query._end
  delete req.query._sort
  delete req.query._sortDir

  if (req.query.q) {

    // Full-text search
    var q = req.query.q.toLowerCase()

    array = low(req.params.resource).where(function(obj) {
      for (var key in obj) {
        var value = obj[key]
        if (_.isString(value) && value.toLowerCase().indexOf(q) !== -1) {
          return true
        }
      }
    }).value()

  } else {

    // Add :parentId filter in case URL is like /:parent/:parentId/:resource
    if (req.params.parent) {
      filters[req.params.parent.slice(0, - 1) + 'Id'] = +req.params.parentId
    }

    // Add query parameters filters
    // Convert query parameters to their native counterparts
    for (var key in req.query) {
      if (key !== 'callback') {
        filters[key] = utils.toNative(req.query[key])
      }
    }

    // Filter
    if (_(filters).isEmpty()) {
      array = low(req.params.resource).value()
    } else {
      array = low(req.params.resource).where(filters).value()
    }
  }

  if(_sort) {
      _sortDir = _sortDir || 'ASC'

      array = _.sortBy(array, function(element) {
          return element[_sort];
      })

      if (_sortDir === 'DESC') {
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
routes.show = function(req, res, next) {
  var resource = low(req.params.resource)
    .get(+req.params.id)
    .value()

  if (resource) {
    res.jsonp(resource)
  } else {
    res.status(404).jsonp({})
  }
}

// POST /:resource
routes.create = function(req, res, next) {
  for (var key in req.body) {
    req.body[key] = utils.toNative(req.body[key])
  }

  var resource = low(req.params.resource)
    .insert(req.body)
    .value()

  res.jsonp(resource)
}

// PUT /:resource/:id
// PATCH /:resource/:id
routes.update = function(req, res, next) {
  for (var key in req.body) {
    req.body[key] = utils.toNative(req.body[key])
  }

  var resource = low(req.params.resource)
    .update(+req.params.id, req.body)
    .value()

  if (resource) {
    res.jsonp(resource)
  } else {
    res.status(404).jsonp({})
  }
}

// DELETE /:resource/:id
routes.destroy = function(req, res, next) {
  low(req.params.resource).remove(+req.params.id)

  // Remove dependents documents
  var removable = utils.getRemovable(low.db)

  _(removable).each(function(item) {
    low(item[0]).remove(item[1]);
  })

  res.status(204).end()
}

module.exports = routes
