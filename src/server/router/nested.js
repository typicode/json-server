const express = require('express')
const pluralize = require('pluralize')
const utils = require('../utils')

module.exports = opts => {
  const router = express.Router()
  const toProp = resource => {
    const propName = opts.resourceToPropName(pluralize.singular(resource))
    return `${propName}${opts.foreignKeySuffix}`
  }
  const toId = paramId => {
    return opts.prepareId(utils.paramIdToId(paramId))
  }

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request query
  function get(req, res, next) {
    const prop = toProp(req.params.resource)
    req.query[prop] = toId(req.params.id)
    req.url = `/${req.params.nested}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request body
  function post(req, res, next) {
    const prop = toProp(req.params.resource)
    req.body[prop] = toId(req.params.id)
    req.url = `/${req.params.nested}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested/:nestedId -> /:nested) and request body
  function getOne(req, res, next) {
    req.url = `/${req.params.nested}/${req.params.nestedId}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested/:nestedId -> /:nested) and request body
  function put(req, res, next) {
    req.url = `/${req.params.nested}/${req.params.nestedId}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested/:nestedId -> /:nested) and request body
  function del(req, res, next) {
    req.url = `/${req.params.nested}/${req.params.nestedId}`
    next()
  }

  return router
    .get('/:resource/:id/:nested', get)
    .post('/:resource/:id/:nested', post)
    .get('/:resource/:id/:nested/:nestedId', getOne)
    .put('/:resource/:id/:nested/:nestedId', put)
    .delete('/:resource/:id/:nested/:nestedId', del)
}
