var express = require('express')

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
