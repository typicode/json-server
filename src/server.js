var fs = require('fs')
var http = require('http')
var express = require('express')
var logger = require('morgan')
var cors = require('cors')
var methodOverride = require('method-override')
var bodyParser = require('body-parser')
var serveStatic = require('serve-static')
var errorhandler = require('errorhandler')

module.exports = function(options) {
  options = options || {}
  if (typeof options.logger === 'undefined') {
    options.logger = 'dev'
  }
  var server = express()

  // Don't use logger if json-server is mounted
  if (!module.parent || options.logger) {
    server.use(logger(options.logger))
  }

  server.set('json spaces', 2)
  server.use(bodyParser.json({limit: '10mb'}))
  server.use(bodyParser.urlencoded({ extended: false }))
  server.use(methodOverride())

  // Serve static files
  if (fs.existsSync(process.cwd() + '/public')) {
    server.use(serveStatic(process.cwd() + '/public'));
  } else {
    server.use(serveStatic(__dirname + '/public'));
  }

  // CORS
  server.use(cors({ origin: true, credentials: true }))

  if (process.env.NODE_ENV === 'development') {
    // only use in development
    server.use(errorhandler())
  }

  return server
}
