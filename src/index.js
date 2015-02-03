var fs             = require('fs')
var path           = require('path')

// LowDB
var low            = require('lowdb')
var _db            = require('underscore-db')
var _inflections   = require('underscore.inflections')

low.mixin('_db')
low.mixin('_inflections')

// Express
var http           = require('http')
var express        = require('express')
var logger         = require('morgan')
var cors           = require('cors')
var methodOverride = require('method-override')
var bodyParser     = require('body-parser')
var serveStatic    = require('serve-static')
var errorhandler   = require('errorhandler')

// json-server
var utils          = require('./utils')
var createRoutes   = require('./create-routes')

low.mixin({ createId: utils.createId })

module.exports = function(object, filename) {
  var server = express()
  var routes = createRoutes(object, filename)

  // Don't use logger if json-server is mounted
  if (!module.parent) {
    server.use(logger('dev'))
  }

  server.use(bodyParser.json({limit: '10mb'}))
  server.use(bodyParser.urlencoded({ extended: false }))
  server.use(methodOverride())

  if (fs.existsSync(process.cwd() + '/public')) {
    server.use(serveStatic(process.cwd() + '/public'));
  } else {
    server.use(serveStatic(__dirname + '/public'));
  }

  server.use(cors({ origin: true, credentials: true }))

  server.get('/db', routes.showDatabase)

  server.route('/:resource')
    .get(routes.list)
    .post(routes.create)

  server.route('/:resource/:id')
    .get(routes.show)
    .put(routes.update)
    .patch(routes.update)
    .delete(routes.destroy)

  server.get('/:parent/:parentId/:resource', routes.list)

  if (process.env.NODE_ENV === 'development') {
    // only use in development
    server.use(errorhandler())
  }

  return server
}
