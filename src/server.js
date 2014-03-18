var _ = require('underscore')
var low = require('low')
var restify = require('restify')
var utils = require('./utils')

low._.createId = utils.createId

var server = restify.createServer()

server.use(restify.acceptParser(server.acceptable))
server.use(restify.queryParser())
server.use(restify.bodyParser())
server.use(restify.CORS())
server.use(restify.jsonp())
server.use(restify.gzipResponse())

routes = {}

// GET /db
routes.db = function(req, res, next) {
  res.send(low.db)
  next()
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

  res.send(query.value())
  next()
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

  res.send(resource)
  next()
}

// GET /:resource/:id
routes.show = function(req, res, next) {
  var resource = low(req.params.resource)
    .get(+req.params.id)
    .value()

  res.send(resource)
  next()
}

// POST /:resource
routes.create = function(req, res, next) {
  var resource = low(req.params.resource)
    .insert(req.body)
    .value()

  res.send(resource)
  next()
}

// PUT /:resource/:id
// PATCH /:resource/:id
routes.update = function(req, res, next) {
  var resource = low(req.params.resource)
    .update(+req.params.id, req.body)
    .value()
  
  res.send(resource)
  next()
}

// DELETE /:resource/:id
routes.destroy = function(req, res, next) {
  try {
    low(req.params.resource).remove(+req.params.id)
    utils.clean()

    res.send(204)
    next()
  } catch(e) {
    console.trace(e)
  }
}

server.get('/db', routes.db)
server.get('/:resource', routes.list)
server.get('/:parent/:parentId/:resource', routes.nestedList)
server.get('/:resource/:id', routes.show)
server.post('/:resource', routes.create)
server.put('/:resource/:id', routes.update)
server.patch('/:resource/:id', routes.update)
server.del('/:resource/:id', routes.destroy)

server.get('/', restify.serveStatic({
  directory: './public',
  default: 'index.html'
}));

server.on('after',  function (req, res, route, err) {
  var latency = Date.now() - req.time()
  console.log('%s %s %s - %sms', 
    req.method, req.url, res.statusCode, latency
  )
})

module.exports = server