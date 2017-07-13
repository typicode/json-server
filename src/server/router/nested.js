const express = require('express')
const pluralize = require('pluralize')

module.exports = opts => {
  const router = express.Router()

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request query
  function get(req, res, next) {
    const prop = pluralize.singular(req.params.resource)
    req.query[`${prop}${opts.foreignKeySuffix}`] = req.params.id
    req.url = `/${req.params.nested}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request body
  function post(req, res, next) {
    const prop = pluralize.singular(req.params.resource)
    req.body[`${prop}${opts.foreignKeySuffix}`] = req.params.id
    req.url = `/${req.params.nested}`
    next()
  }

  return router
    .get('/:resource/:id/:nested', get)
    .post('/:resource/:id/:nested', post)
}
