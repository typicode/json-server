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
// GET /*?*&limit=
// GET /*?*&offset=&limit=
routes.list = function(req, res, next) {

  // Filters list
  var filters = {}

  // Result array
  var array

  // Remove offset and limit from req.query to avoid filtering using those
  // parameters
  var offset = req.query.offset
  var limit = req.query.limit

  delete req.query.offset
  delete req.query.limit

  if (req.query.q) {

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

  // Slicing result
  if (limit) {
  	res.setHeader('X-Total-Count', array.length)
  	res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count')

    offset = offset || 0

    array = array.slice(offset, limit)
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
