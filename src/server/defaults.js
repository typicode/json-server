var fs = require('fs')
var path = require('path')
var express = require('express')
var logger = require('morgan')
var cors = require('cors')
var errorhandler = require('errorhandler')

module.exports = function (opts) {
  var userDir = path.join(process.cwd(), 'public')
  var defaultDir = path.join(__dirname, 'public')
  var staticDir = fs.existsSync(userDir) ?
    userDir :
    defaultDir

  opts = opts || { static: staticDir }

  var arr = []

  // Logger
  arr.push(logger('dev', {
    skip: function (req, res) {
      return process.env.NODE_ENV === 'test' ||
        req.path === '/favicon.ico'
    }
  }))

  // Enable CORS for all the requests, including static files
  arr.push(cors({ origin: true, credentials: true }))

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

  return arr
}
