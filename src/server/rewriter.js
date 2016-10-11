const express = require('express')
const url = require('url')
const _ = require('lodash')

module.exports = (routes) => {
  const router = express.Router()

  Object.keys(routes).forEach((route) => {
    if (route.indexOf(':') !== -1) {
      router.all(route, (req, res, next) => {
        // Rewrite target url using params
        let target = routes[route]
        for (let param in req.params) {
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
      router.all(route + '*', (req, res, next) => {
        // Rewrite url by replacing prefix
        req.url = req.url.replace(route, routes[route])
        next()
      })
    }
  })

  return router
}
