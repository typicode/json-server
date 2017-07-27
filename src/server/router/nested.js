const express = require('express')
const pluralize = require('pluralize')
// const utils = require('../utils')

module.exports = opts => {
  const router = express.Router()
  const toProp = resource => {
    const propName = opts.resourceToPropName(pluralize.singular(resource))
    return `${propName}${opts.foreignKeySuffix}`
  }

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request query
  function get(req, res, next) {
    const prop = toProp(req.params.resource)
    req.query[prop] = req.params.id
    req.url = `/${req.params.nested}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request body
  function post(req, res, next) {
    const prop = toProp(req.params.resource)
    // req.body[prop] = utils.paramIdToId(req.params.id)
    req.body[prop] = req.params.id
    req.url = `/${req.params.nested}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested/:nestedId -> /:nested) and request body
  function del(req, res, next) {
    // req.url = `/${req.params.nested}/${utils.paramIdToId(req.params.nestedId)}`
    req.url = `/${req.params.nested}/${req.params.nestedId}`
    next()
  }

  return router
    .get('/:resource/:id/:nested', get)
    .post('/:resource/:id/:nested', post)
    .delete('/:resource/:id/:nested/:nestedId', del)
}
