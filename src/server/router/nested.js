var express = require('express')
var pluralize = require('pluralize')
var utils = require('../utils')

module.exports = function () {
  var router = express.Router()

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request query
  function get (req, res, next) {
    var prop = pluralize.singular(req.params.resource)
    req.query[prop + 'Id'] = utils.toNative(req.params.id)
    req.url = '/' + req.params.nested
    next()
  }

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request body
  function post (req, res, next) {
    var prop = pluralize.singular(req.params.resource)
    req.body[prop + 'Id'] = utils.toNative(req.params.id)
    req.url = '/' + req.params.nested
    next()
  }

  return router
    .get('/:resource/:id/:nested', get)
    .post('/:resource/:id/:nested', post)
}
