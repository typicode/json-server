var express = require('express')
var pluralize = require('pluralize')
var utils = require('../utils')

module.exports = function () {

  var router = express.Router()

  // Rewrite url to /:nested?:resourceId=:id
  router.get('/:resource/:id/:nested', function (req, res, next) {
    var prop = pluralize.singular(req.params.resource)
    req.query[prop + 'Id'] = utils.toNative(req.params.id)
    req.url = '/' + req.params.nested
    next()
  })

  return router
}
