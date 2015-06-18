var fs = require('fs')
var express = require('express')
var logger = require('morgan')
var cors = require('cors')
var errorhandler = require('errorhandler')

var arr = []

// Logger
arr.push(logger('dev', {
  skip: function (req, res) { return req.path === '/favicon.ico' }
}))

// Enable CORS for all the requests, including static files
arr.push(cors({ origin: true, credentials: true }))

if (process.env.NODE_ENV === 'development') {
  // only use in development
  arr.push(errorhandler())
}

// Serve static files
if (fs.existsSync(process.cwd() + '/public')) {
  arr.push(express.static(process.cwd() + '/public'))
} else {
  arr.push(express.static(__dirname + '/public'))
}

// No cache for IE
// https://support.microsoft.com/en-us/kb/234067
arr.push(function (req, res, next) {
  res.header('Cache-Control', 'no-cache')
  res.header('Pragma', 'no-cache')
  res.header('Expires', '-1')
  next()
})

module.exports = arr
