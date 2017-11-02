const fs = require('fs')
const path = require('path')
const express = require('express')
const logger = require('morgan')
const cors = require('cors')
const compression = require('compression')
const errorhandler = require('errorhandler')
const objectAssign = require('object-assign')
const bodyParser = require('./body-parser')

module.exports = function(opts) {
  const userDir = path.join(process.cwd(), 'public')
  const defaultDir = path.join(__dirname, 'public')
  const staticDir = fs.existsSync(userDir) ? userDir : defaultDir

  opts = objectAssign({ logger: true, static: staticDir }, opts)

  const arr = []

  // Compress all requests
  if (!opts.noGzip) {
    arr.push(compression())
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

  // Logger
  if (opts.logger) {
    arr.push(
      logger('dev', {
        skip: req =>
          process.env.NODE_ENV === 'test' || req.path === '/favicon.ico'
      })
    )
  }

  // No cache for IE
  // https://support.microsoft.com/en-us/kb/234067
  arr.push((req, res, next) => {
    res.header('Cache-Control', 'no-cache')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')
    next()
  })

  // Read-only
  if (opts.readOnly) {
    arr.push((req, res, next) => {
      if (req.method === 'GET') {
        next() // Continue
      } else {
        res.sendStatus(403) // Forbidden
      }
    })
  }

  // Add middlewares
  if (opts.bodyParser) {
    arr.push(bodyParser)
  }

  return arr
}
