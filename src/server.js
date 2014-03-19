var express = require('express')
var http    = require('http')
var path    = require('path')
var _       = require('underscore')
var low     = require('low')
var utils   = require('./utils')

low._.createId = utils.createId

var server = express()

server.set('port', process.env.PORT || 3000)
server.use(express.logger('dev'))
server.use(express.json())
server.use(express.urlencoded())
server.use(express.methodOverride())
server.use(express.static(path.join(__dirname, '../public')))
server.use(server.router)

if ('development' == server.get('env')) {
  server.use(express.errorHandler());
}

routes = {}

// GET /db
routes.db = function(req, res, next) {
  res.jsonp(low.db)
}

// GET /:resource?attr=&attr=
routes.list = function(req, res, next) {
  var properties = {}
  var query

  Object.keys(req.query).forEach(function (key) {
    var value = req.query[key]
    properties[key] = utils.toNative(value)
  })

  if (_(properties).isEmpty()) {
    query = low(req.params.resource)
  } else {
    query = low(req.params.resource).where(properties)
  }

  res.jsonp(query.value())
}

// GET /:parent/:parentId/:resource
routes.nestedList = function(req, res, next) {
  var properties = {}
  var resource

  // Set parentID
  properties[req.params.parent.slice(0, - 1) + 'Id'] = +req.params.parentId

  // Filter using parentID
  resource = low(req.params.resource)
    .where(properties)
    .value()

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
  var resource = low(req.params.resource)
    .insert(req.body)
    .value()

  res.jsonp(resource)
}

// PUT /:resource/:id
// PATCH /:resource/:id
routes.update = function(req, res, next) {
  var resource = low(req.params.resource)
    .update(+req.params.id, req.body)
    .value()
  
  res.jsonp(resource)
}

// DELETE /:resource/:id
routes.destroy = function(req, res, next) {
  low(req.params.resource).remove(+req.params.id)
  utils.clean()

  res.send(204)
}

server.get('/db', routes.db)
server.get('/:resource', routes.list)
server.get('/:parent/:parentId/:resource', routes.nestedList)
server.get('/:resource/:id', routes.show)
server.post('/:resource', routes.create)
server.put('/:resource/:id', routes.update)
server.patch('/:resource/:id', routes.update)
server.del('/:resource/:id', routes.destroy)

server.on('after',  function (req, res, route, err) {
  var latency = Date.now() - req.time()
  console.log('%s %s %s - %sms', 
    req.method, req.url, res.statusCode, latency
  )
})

module.exports = server