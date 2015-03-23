var fs = require('fs')
var http = require('http')
var express = require('express')
var logger = require('morgan')
var cors = require('cors')
var serveStatic = require('serve-static')
var errorhandler = require('errorhandler')

module.exports = function() {
  var server = express()

  // Logger
  server.use(logger('dev', {
    skip: function(req, res) { return req.path === '/favicon.ico' }
  }))

  // Beautify JSON
  server.set('json spaces', 2)

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