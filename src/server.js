var fs             = require('fs')
var path           = require('path')
var http           = require('http')
var express        = require('express')
var logger         = require('morgan')
var cors           = require('cors')
var methodOverride = require('method-override')
var bodyParser     = require('body-parser')
var serveStatic    = require('serve-static')
var errorhandler   = require('errorhandler')
var low            = require('lowdb')

var utils          = require('./utils')
var routes         = require('./routes')

low._.createId = utils.createId

var server = express()

server.set('port', process.env.PORT || 3000)

// Don't use logger if json-server is mounted
if (!module.parent) {
  server.use(logger('dev'))
}

server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: false }))
server.use(methodOverride())

if (fs.existsSync(process.cwd() + '/public')) {
  server.use(serveStatic(process.cwd() + '/public'));
} else {
  server.use(serveStatic(path.join(__dirname, './public')));
}

server.use(cors({ origin: true, credentials: true }))

server.get('/db', routes.db)

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

server.low = low

module.exports = server