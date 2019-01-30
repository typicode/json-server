const express = require('express')
const _ = require('lodash')
const pluralize = require('pluralize')
const write = require('./write')
const getFullURL = require('./get-full-url')
const utils = require('../utils')
const delay = require('./delay')

module.exports = (db, name, opts) => {
  // Create router
  const router = express.Router()
  router.use(delay)

  // Embed function used in GET /name and GET /name/id
  function _embed(resource, e) {
    e &&
      [].concat(e).forEach(externalResource => {
        if (db.get(externalResource).value) {
          var query = {}
          const singularResource = pluralize.singular(name)
          query[`${singularResource}${opts.foreignKeySuffix}`] = resource.id
          var results = db
            .get(externalResource)
            .filter(query)
            .value()
          // check for one to many relationships
          if (results.length === 0) {
            query = {}
            query[`${name}${opts.foreignKeySuffix}`] = [resource.id]
            results = db
              .get(externalResource)
              .filter(query)
              .value()
          }
          resource[externalResource] = results
        }
      })
  }

  // Expand function used in GET /name and GET /name/id
  function _expand(resource, e) {
    e &&
      [].concat(e).forEach(function(innerResource) {
        var plural = pluralize(innerResource)
        if (db.get(plural).value()) {
          var prop = `${innerResource}${opts.foreignKeySuffix}`
          if (_.isArray(resource[prop])) {
            resource[innerResource] = resource[prop].map(function(id) {
              return db
                .get(plural)
                .getById(id)
                .value()
            })
          } else {
            resource[innerResource] = db
              .get(plural)
              .getById(resource[prop])
              .value()
          }
        }
      })
  }

  function _include(resource, r, e) {
    if (resource === null || resource === undefined) return
    e &&
      [].concat(e).forEach(relationship => {
        if (db.get(relationship).value) {
          let singularResource = pluralize.singular(r)
          let singularRelationship = pluralize.singular(relationship)
          let manyMany = null

          // this table lookup could be cached

          if (`${singularResource}_${singularRelationship}` in db.__wrapped__) {
            // e.g. user_group
            manyMany = `${singularResource}_${singularRelationship}`
          } else if (
            `${singularRelationship}_${singularResource}` in db.__wrapped__
          ) {
            // e.g. group_user
            manyMany = `${singularRelationship}_${singularResource}`
          } else if (`${r}_${relationship}` in db.__wrapped__) {
            // e.g. users_groups
            manyMany = `${r}_${relationship}`
          } else if (`${relationship}_${r}` in db.__wrapped__) {
            // e.g. groups_users
            manyMany = `${relationship}_${r}`
          }

          if (manyMany == null) return

          // assumes many-many tables are firstId, secondId relations.
          const relationshipKey = `${singularRelationship}Id`
          const resourceKey = `${singularResource}Id`

          const joinQuery = {}
          joinQuery[resourceKey] = resource.id

          const items = db
            .get(manyMany)
            .filter(joinQuery)
            .value()
          if (items === null || items === undefined) {
            // not found
            resource[relationship] = []
            return
          }
          const ids = items.map(item => item[relationshipKey])

          const related = db
            .get(relationship)
            .filter(elem => {
              return ids.includes(elem.id)
            })
            .value()

          resource[relationship] = related
        }
      })
  }

  // GET /name
  // GET /name?q=
  // GET /name?attr=&attr=
  // GET /name?end=&
  // GET /name?start=&end=&
  // GET /name?embed=&expand=
  function list(req, res, next) {
    // Resource chain
    let chain = db.get(name)

    // Remove q, start, end, ... from req.query to avoid filtering using those
    // parameters
    let q = req.query.q
    let start = req.query.start
    let end = req.query.end
    let page = req.query.page
    let sort = req.query.sort
    let order = req.query.order
    let limit = req.query.limit
    let embed = req.query.embed
    let expand = req.query.expand
    let include = req.query.include
    delete req.query.q
    delete req.query.start
    delete req.query.end
    delete req.query.sort
    delete req.query.order
    delete req.query.limit
    delete req.query.embed
    delete req.query.expand
    delete req.query.include

    // Automatically delete query parameters that can't be found
    // in the database
    Object.keys(req.query).forEach(query => {
      const arr = db.get(name).value()
      for (let i in arr) {
        if (
          _.has(arr[i], query) ||
          query === 'callback' ||
          query === '_' ||
          /_lte$/.test(query) ||
          /_gte$/.test(query) ||
          /_ne$/.test(query) ||
          /_like$/.test(query)
        )
          return
      }
      delete req.query[query]
    })

    if (q) {
      // Full-text search
      if (Array.isArray(q)) {
        q = q[0]
      }

      q = q.toLowerCase()

      chain = chain.filter(obj => {
        for (let key in obj) {
          const value = obj[key]
          if (db._.deepQuery(value, q)) {
            return true
          }
        }
      })
    }

    Object.keys(req.query).forEach(key => {
      // Don't take into account JSONP query parameters
      // jQuery adds a '_' query parameter too
      if (key !== 'callback' && key !== '_') {
        // Always use an array, in case req.query is an array
        const arr = [].concat(req.query[key])

        chain = chain.filter(element => {
          return arr
            .map(function(value) {
              const isDifferent = /_ne$/.test(key)
              const isRange = /_lte$/.test(key) || /_gte$/.test(key)
              const isLike = /_like$/.test(key)
              const path = key.replace(/(_lte|_gte|_ne|_like)$/, '')
              // get item value based on path
              // i.e post.title -> 'foo'
              const elementValue = _.get(element, path)

              // Prevent toString() failing on undefined or null values
              if (elementValue === undefined || elementValue === null) {
                return
              }

              if (isRange) {
                const isLowerThan = /_gte$/.test(key)

                return isLowerThan
                  ? value <= elementValue
                  : value >= elementValue
              } else if (isDifferent) {
                return value !== elementValue.toString()
              } else if (isLike) {
                return new RegExp(value, 'i').test(elementValue.toString())
              } else {
                return value === elementValue.toString()
              }
            })
            .reduce((a, b) => a || b)
        })
      }
    })

    // Sort
    if (sort) {
      const sortSet = sort.split(',')
      const orderSet = (order || '').split(',').map(s => s.toLowerCase())
      chain = chain.orderBy(sortSet, orderSet)
    }

    // Slice result
    if (end || limit || page) {
      res.setHeader('X-Total-Count', chain.size())
      res.setHeader(
        'Access-Control-Expose-Headers',
        `X-Total-Count${page ? ', Link' : ''}`
      )
    }

    if (page) {
      page = parseInt(page, 10)
      page = page >= 1 ? page : 1
      limit = parseInt(limit, 10) || 10
      const _page = utils.getPage(chain.value(), page, limit)
      const links = {}
      const fullURL = getFullURL(req)

      if (_page.first) {
        links.first = fullURL.replace(
          `page=${_page.current}`,
          `page=${_page.first}`
        )
      }

      if (_page.prev) {
        links.prev = fullURL.replace(
          `page=${_page.current}`,
          `page=${_page.prev}`
        )
      }

      if (_page.next) {
        links.next = fullURL.replace(
          `page=${_page.current}`,
          `page=${_page.next}`
        )
      }

      if (_page.last) {
        links.last = fullURL.replace(
          `page=${_page.current}`,
          `page=${_page.last}`
        )
      }

      res.links(links)
      chain = _.chain(_page.items)
    } else if (end) {
      start = parseInt(start, 10) || 0
      end = parseInt(end, 10)
      chain = chain.slice(start, end)
    } else if (limit) {
      start = parseInt(start, 10) || 0
      limit = parseInt(limit, 10)
      chain = chain.slice(start, start + limit)
    }

    // embed and expand
    chain = chain.cloneDeep().forEach(function(element) {
      _embed(element, embed)
      _expand(element, expand)
      _include(element, name, include)
    })

    res.locals.data = chain.value()
    next()
  }

  // GET /name/:id
  // GET /name/:id?embed=&expand
  function show(req, res, next) {
    const embed = req.query.embed
    const expand = req.query.expand
    const include = req.query.include
    const resource = db
      .get(name)
      .getById(req.params.id)
      .value()

    if (resource) {
      // Clone resource to avoid making changes to the underlying object
      const clone = _.cloneDeep(resource)

      // Embed other resources based on resource id
      // /posts/1?embed=comments
      _embed(clone, embed)

      // Expand inner resources based on id
      // /posts/1?expand=user
      _expand(clone, expand)

      // Include many to many resources based on id
      // /posts/1?include=users
      _include(clone, name, include)

      res.locals.data = clone
    }

    next()
  }

  // POST /name
  function create(req, res, next) {
    const resource = db
      .get(name)
      .insert(req.body)
      .value()

    res.setHeader('Access-Control-Expose-Headers', 'Location')
    res.location(`${getFullURL(req)}/${resource.id}`)

    res.status(201)
    res.locals.data = resource

    next()
  }

  // PUT /name/:id
  // PATCH /name/:id
  function update(req, res, next) {
    const id = req.params.id
    let chain = db.get(name)

    chain =
      req.method === 'PATCH'
        ? chain.updateById(id, req.body)
        : chain.replaceById(id, req.body)

    const resource = chain.value()

    if (resource) {
      res.locals.data = resource
    }

    next()
  }

  // DELETE /name/:id
  function destroy(req, res, next) {
    const resource = db
      .get(name)
      .removeById(req.params.id)
      .value()

    // Remove dependents documents
    const removable = db._.getRemovable(db.getState(), opts)
    removable.forEach(item => {
      db.get(item.name)
        .removeById(item.id)
        .value()
    })

    if (resource) {
      res.locals.data = {}
    }

    next()
  }

  const w = write(db)

  router
    .route('/')
    .get(list)
    .post(create, w)

  router
    .route('/:id')
    .get(show)
    .put(update, w)
    .patch(update, w)
    .delete(destroy, w)

  return router
}
