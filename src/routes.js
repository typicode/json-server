var _     = require('underscore')
var low   = require('lowdb')
var utils = require('./utils')

var routes = {}

// GET /db
routes.db = function(req, res, next) {
  res.jsonp(low.db)
}

// GET /:resource?attr=&attr=
// GET /:parent/:parentId/:resource
routes.list = function(req, res, next) {
  var props = {}
  var resource

  var _start = req.query._start
  var _end   = req.query._end

  delete req.query._start
  delete req.query._end

  if (req.params.parent) {
    props[req.params.parent.slice(0, - 1) + 'Id'] = +req.params.parentId
  }

  for (var key in req.query) {
    if (key !== 'callback') props[key] = utils.toNative(req.query[key])
  }

  if (_(props).isEmpty()) {
    resource = low(req.params.resource).value()
  } else {
    resource = low(req.params.resource).where(props).value()
  }

  if (_start) {
    resource = resource.slice(_start, _end)
  }

  res.jsonp(resource)
}

// GET /:resource/:id
routes.show = function(req, res, next) {
  var resource = low(req.params.resource)
    .get(+req.params.id)
    .value()

  res.jsonp(resource)
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
  
  res.jsonp(resource)
}

// DELETE /:resource/:id
routes.destroy = function(req, res, next) {
  low(req.params.resource).remove(+req.params.id)
  
  // Remove dependents documents
  var removable = utils.getRemovable(low.db)

  _(removable).each(function(item) {
    low(item[0]).remove(item[1]);
  })

  res.send(204)
}

module.exports = routes