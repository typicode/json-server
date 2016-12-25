const express = require('express')
const url = require('url')
const _ = require('lodash')
function updateQueryString (target, sourceUrl) {
  return ~sourceUrl.indexOf('?') ? _.assign(target, url.parse(sourceUrl, true).query) : {}
}
module.exports = (routes) => {
  const router = express.Router()

  router.get('/__rules', (req, res) => {
    res.json(routes)
  })

  Object.keys(routes).forEach((route) => {
    if (route.indexOf(':') !== -1) {
      router.all(route, (req, res, next) => {
        // Rewrite target url using params
        let target = routes[route]
        for (let param in req.params) {
          target = target.replace(':' + param, req.params[param])
        }
        req.url = target
        req.query = updateQueryString(req.query, req.url)
        next()
      })
    } else {
      router.all(route + '*', (req, res, next) => {
        // Rewrite url by replacing prefix
        req.url = req.url.replace(route, routes[route])
        req.query = updateQueryString(req.query, req.url)
        next()
      })
    }
  })

  return router
}
