var fs = require('fs')
var path = require('path')
var express = require('express')
var logger = require('morgan')
var cors = require('cors')
var compression = require('compression')
var errorhandler = require('errorhandler')
var objectAssign = require('object-assign')
var common = require('./common')

module.exports = function (opts) {
  var userDir = path.join(process.cwd(), 'public')
  var defaultDir = path.join(__dirname, 'public')
  var staticDir = fs.existsSync(userDir)
    ? userDir
    : defaultDir

  opts = objectAssign({ logger: true, static: staticDir }, opts)

  var arr = []

  // Compress all requests
  if (!opts.noGzip) {
    arr.push(compression())
  }

  // Logger
  if (opts.logger) {
    arr.push(logger('dev', {
      skip: function (req, res) {
        return process.env.NODE_ENV === 'test' ||
          req.path === '/favicon.ico'
      }
    }))
  }

  // Enable CORS for all the requests, including static files
  if (!opts.noCors) {
    arr.push(cors({ origin: true, credentials: true }))
  }

  if (process.env.NODE_ENV === 'development') {
    // only use in development
    arr.push(errorhandler())
  }

  // Serve static files
  arr.push(express.static(opts.static))

  // No cache for IE
  // https://support.microsoft.com/en-us/kb/234067
  arr.push(function (req, res, next) {
    res.header('Cache-Control', 'no-cache')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')
    next()
  })

  // Read-only
  if (opts.readOnly) {
    arr.push(function (req, res, next) {
      if (req.method === 'GET') {
        next() // Continue
      } else {
        res.sendStatus(403) // Forbidden
      }
    })
  }

  return arr.concat(common)
}
