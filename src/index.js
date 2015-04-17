var express = require('express')

module.exports = {
  create: function () {
    var server = express()
    server.set('json spaces', 2)
    return server
  },
  defaults: require('./defaults'),
  router: require('./router')
}