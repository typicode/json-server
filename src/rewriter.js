var express = require('express')

module.exports = function (routes) {
  var router = express.Router()

  for (var route in routes) {
    router.all(route, function (req, res, next) {
      var target = routes[route]
      for (var param in req.params) {
        target = target.replace(':' + param, req.params[param])
      }
      console.log(target)
      req.url = target
      next()
    })
  }

  return router
}
