var fs = require('fs')
var logger = require('morgan')
var cors = require('cors')
var serveStatic = require('serve-static')
var errorhandler = require('errorhandler')

var arr = []

// Logger
arr.push(logger('dev', {
  skip: function(req, res) { return req.path === '/favicon.ico' }
}))

// Serve static files
if (fs.existsSync(process.cwd() + '/public')) {
  arr.push(serveStatic(process.cwd() + '/public'));
} else {
  arr.push(serveStatic(__dirname + '/public'));
}

// CORS
arr.push(cors({ origin: true, credentials: true }))

if (process.env.NODE_ENV === 'development') {
  // only use in development
  arr.push(errorhandler())
}

module.exports = arr