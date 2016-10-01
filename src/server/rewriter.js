var express = require('express')
var url = require('url')
var _ = require('lodash')

module.exports = function (routes) {
  var router = express.Router()

  Object.keys(routes).forEach(function (route) {
    if (route.indexOf(':') !== -1) {
      router.all(route, function (req, res, next) {
        // Rewrite target url using params
        var target = routes[route]
        for (var param in req.params) {
          target = target.replace(':' + param, req.params[param])
        }
        req.url = target
        if (target.indexOf('?')) {
          // create query from target
          _.assign(req.query, url.parse(target, true).query)
        }
        next()
      })
    } else {
      router.all(route + '*', function (req, res, next) {
        // Rewrite url by replacing prefix
        req.url = req.url.replace(route, routes[route])
        next()
      })
    }
  })

  return router
}
