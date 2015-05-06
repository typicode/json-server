var express = require('express')
var methodOverride = require('method-override')
var bodyParser = require('body-parser')
var _ = require('underscore')
var low = require('lowdb')
var utils = require('./utils')

low.mixin(require('underscore-db'))
low.mixin(require('underscore.inflections'))
low.mixin({
  createId: utils.createId
})

module.exports = function (source) {

  // Create router
  var router = express.Router()

  // Add middlewares
  router.use(bodyParser.json({
    limit: '10mb'
  }))
  router.use(bodyParser.urlencoded({
    extended: false
  }))
  router.use(methodOverride())

  // Create database
  if (_.isObject(source)) {
    var db = low()
    db.object = source
  } else {
    var db = low(source)
  }

  // Expose database
  router.db = db

  // GET /db
  function showDatabase(req, res, next) {
    res.jsonp(db.object)
  }

  // GET /:resource
  // GET /:resource?q=
  // GET /:resource?attr=&attr=
  // GET /:resource/:id
  // GET /:parent/:parentId/:resource
  // GET /:parent/:parentId/:resource/:resourceId etc. ad infinutum
  // GET /:parent/:parentId/:resource?attr=&attr=
  // GET /*?*&_end=
  // GET /*?*&_start=&_end=
  function parse(req, res, next) {


    // Test if resource exists
    if (!db.object.hasOwnProperty(req.params.resource)) {
      return res.sendStatus(404)
    }

    // Set internals
    req._internal = {}

    // Filters list
    req._internal.filters = {}

    // Result array
    var array

    // Remove _start, _end and _limit from req.query to avoid filtering using those
    // parameters. Attach to req._internal for use by future middleware
    req._internal._start = req.query._start
    req._internal._end = req.query._end
    req._internal._sort = req.query._sort
    req._internal._order = req.query._order
    req._internal._limit = req.query._limit
    delete req.query._start
    delete req.query._end
    delete req.query._sort
    delete req.query._order
    delete req.query._limit

    // Handle sub resources if present, and assign id if it's not already there.
    req._internal.subResources = []
    if (req.params['0']) { // If anything beyond the first resource is provided
      req._internal.subResources = req.params['0'].split('/')
      req._internal.subResources.shift()
      req._internal.subResourceMap = []
      req._internal.originalId = req._internal.subResources.shift() // set the resource's original to the first variadic parameter
      _.forEach(req._internal.subResources, function (value, index) { // build the subResource objects as provided
        var obj = {}
        if (index % 2 > 0) { // if this parameter is even, build an object with id, resource, and <parent>Id
          obj.id = value
          obj.resource = req._internal.subResources[index - 1]
          if (index > 1) {
            obj[req._internal.subResources[index - 3].slice(0, -1) + 'Id'] = req._internal.subResources[index - 2]
          } else {
            obj[req.params.resource.slice(0, -1) + 'Id'] = req._internal.originalId
          }
          req._internal.subResourceMap.push(obj)
        } else if (index === (req._internal.subResources.length - 1)) { // if this parameter is odd AND the last one, build an object without an ID
          obj.resource = value
          if (index > 1) {
            obj[req._internal.subResources[index - 2].slice(0, -1) + 'Id'] = req._internal.subResources[index - 1]
          }
          req._internal.subResourceMap.push(obj)
        }
      })
      if (req._internal.subResourceMap.length > 0) { // if there are any subResources at all (e.g. /posts/12/comments, /posts/12/comments/247, /posts/12/comments/247/user, ...)

        // Set up parents
        if (req._internal.subResourceMap.length < 2) { // if there is only one subResource (e.g. /posts/12/comments, /posts/12/comments/247)
          req._internal.parent = req.params.resource // Assign original resource and id to parent
          req._internal.parentId = req._internal.originalId
        } else { // if there is more than one subResource (e.g. /posts/12/comments/247/user, /posts/12/comments/247/user/25, ...)
          req._internal.parent = req._internal.subResourceMap[req._internal.subResourceMap.length - 2].resource // Assign the second to last subResource as parent
          req._internal.parentId = req._internal.subResourceMap[req._internal.subResourceMap.length - 2].id
        }
        req._internal.filters[req._internal.parent.slice(0, -1) + 'Id'] = +req._internal.parentId

        // Set up resource
        req.params.resource = req._internal.subResourceMap[req._internal.subResourceMap.length - 1].resource // assign the last subResource's data to resource and id
        if (req._internal.subResourceMap[req._internal.subResourceMap.length - 1].id) {
          req._internal.originalId = req._internal.subResourceMap[req._internal.subResourceMap.length - 1].id
        } else {
          delete req._internal.originalId // remove id if subResource doesn't have one
        }
      }
    }
    if (req._internal.originalId) {
      req._internal.filters.id = +req._internal.originalId // convert original ID to number and set as filter
      if (req._internal.filters.id.toString() === req._internal.originalId) {
        delete req._internal.originalId
      }
      if (isNaN(req._internal.filters.id)) {
        req._internal.filters.id = req._internal.originalId
      }
    }

    // Add query parameters filters
    // Convert query parameters to their native counterparts
    for (var key in req.query) {

      // don't take into account JSONP query parameters
      // jQuery adds a '_' query parameter too
      if (key !== 'callback' && key !== '_') {
        req._internal.filters[key] = utils.toNative(req.query[key])
      }
    }
    next()
  }

  // GET /:resource/:id
  function find(req, res, next) {
    if (req.query.q) {

      // Full-text search
      var q = req.query.q.toLowerCase()
      req._internal.resource = db(req.params.resource).filter(function (obj) {
        for (var key in obj) {
          var value = obj[key]
          if (_.isString(value) && value.toLowerCase().indexOf(q) !== -1) {
            return true
          }
        }
      })
      return next() // don't worry about filters or 404ing, just move along.
    }
    if (_(req._internal.filters).isEmpty() || typeof req._internal.filters === 'undefined') { // No filters at all, including ID
      req._internal.resource = db(req.params.resource).value()
    } else { // filters present
      req._internal.resource = db(req.params.resource).filter(req._internal.filters)
    }
    if (req._internal.resource) { // if there even is a resource found
      if (req._internal.filters.id && req._internal.resource.length === 1) {
        req._internal.resource = req._internal.resource[0]
      }
      if (req._internal.resource.length !== 0) {
        return next()
      }
    }
    res.status(404).jsonp({})
  }

  // Presentation layer: Apply sorting / pagination to response
  function present(req, res, next) {

    // Sort
    if (req._internal._sort) {
      req._internal._order = req._internal._order || 'ASC'
      req._internal.resource = _.sortBy(req._internal.resource, function (element) {
        return element[req._internal._sort]
      })
      if (req._internal._order === 'DESC') {
        req._internal.resource.reverse()
      }
    }

    // Slice result
    if (req._internal._end || req._internal._limit) {
      res.setHeader('X-Total-Count', req._internal.resource.length)
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count')
    }
    req._internal._start = parseInt(req._internal._start) || 0
    if (req._internal._end) {
      req._internal.resource = req._internal.resource.slice(req._internal._start, parseInt(req._internal._end))
    } else if (req._internal._limit) {

      // Convert strings to int and sum to get end value
      req._internal.resource = req._internal.resource.slice(req._internal._start, parseInt(req._internal._start) + parseInt(req._internal._limit))
    }
    res.jsonp(req._internal.resource)
  }

  // POST /:resource
  function create(req, res, next) {
    for (var key in req.body) {
      req.body[key] = utils.toNative(req.body[key])
    }
    var resource = db(req.params.resource)
      .insert(req.body)
    res.jsonp(resource)
  }

  // PUT /:resource/:id
  // PATCH /:resource/:id
  function update(req, res, next) {
    for (var key in req.body) {
      req.body[key] = utils.toNative(req.body[key])
    }
    var resource = db(req.params.resource)
      .update(utils.toNative(req._internal.filters.id), req.body)
    if (resource) {
      res.jsonp(resource)
    } else {
      res.status(404).jsonp({})
    }
  }

  // DELETE /:resource/:id
  function destroy(req, res, next) {
    db(req.params.resource).remove(utils.toNative(req._internal.filters.id))

    // Remove dependents documents
    var removable = utils.getRemovable(db.object)
    _(removable).each(function (item) {
      db(item.name).remove(item.id)
    })
    res.status(200).jsonp({})
  }


  router.get('/db', showDatabase)

  router.route('/:resource*')
    .get(parse, find, present)
    .post(parse, create)
    .put(parse, update)
    .patch(parse, update)
    .delete(parse, destroy)

  return router
}
