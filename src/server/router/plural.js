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
  function embed(resource, e) {
    e &&
      [].concat(e).forEach(externalResource => {
        if (db.get(externalResource).value) {
          const query = {}
          const singularResource = pluralize.singular(name)
          query[`${singularResource}${opts.foreignKeySuffix}`] = resource.id
          resource[externalResource] = db
            .get(externalResource)
            .filter(query)
            .value()
        }
      })
  }

  // Expand function used in GET /name and GET /name/id
  function expand(resource, e) {
    e &&
      [].concat(e).forEach(innerResource => {
        const plural = pluralize(innerResource)
        if (db.get(plural).value()) {
          const prop = `${innerResource}${opts.foreignKeySuffix}`
          resource[innerResource] = db
            .get(plural)
            .getById(resource[prop])
            .value()
        }
      })
  }

  // GET /name
  // GET /name?q=
  // GET /name?attr=&attr=
  // GET /name?_end=&
  // GET /name?_start=&_end=&
  // GET /name?_embed=&_expand=
  function list(req, res, next) {
    // Resource chain
    let chain = db.get(name)

    // Remove q, _start, _end, ... from req.query to avoid filtering using those
    // parameters
    let q = req.query.q
    let _start = req.query._start
    let _end = req.query._end
    let _page = req.query._page
    let _sort = req.query._sort
    let _order = req.query._order
    let _limit = req.query._limit
    let _embed = req.query._embed
    let _expand = req.query._expand
    delete req.query.q
    delete req.query._start
    delete req.query._end
    delete req.query._sort
    delete req.query._order
    delete req.query._limit
    delete req.query._embed
    delete req.query._expand

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
    if (_sort) {
      const _sortSet = _sort.split(',')
      const _orderSet = (_order || '').split(',').map(s => s.toLowerCase())
      chain = chain.orderBy(_sortSet, _orderSet)
    }

    // Slice result
    if (_end || _limit || _page) {
      res.setHeader('X-Total-Count', chain.size())
      res.setHeader(
        'Access-Control-Expose-Headers',
        `X-Total-Count${_page ? ', Link' : ''}`
      )
    }

    if (_page) {
      _page = parseInt(_page, 10)
      _page = _page >= 1 ? _page : 1
      _limit = parseInt(_limit, 10) || 10
      const page = utils.getPage(chain.value(), _page, _limit)
      const links = {}
      const fullURL = getFullURL(req)

      if (page.first) {
        links.first = fullURL.replace(
          `page=${page.current}`,
          `page=${page.first}`
        )
      }

      if (page.prev) {
        links.prev = fullURL.replace(
          `page=${page.current}`,
          `page=${page.prev}`
        )
      }

      if (page.next) {
        links.next = fullURL.replace(
          `page=${page.current}`,
          `page=${page.next}`
        )
      }

      if (page.last) {
        links.last = fullURL.replace(
          `page=${page.current}`,
          `page=${page.last}`
        )
      }

      res.links(links)
      chain = _.chain(page.items)
    } else if (_end) {
      _start = parseInt(_start, 10) || 0
      _end = parseInt(_end, 10)
      chain = chain.slice(_start, _end)
    } else if (_limit) {
      _start = parseInt(_start, 10) || 0
      _limit = parseInt(_limit, 10)
      chain = chain.slice(_start, _start + _limit)
    }

    // embed and expand
    chain = chain.cloneDeep().forEach(function(element) {
      embed(element, _embed)
      expand(element, _expand)
    })

    res.locals.data = chain.value()
    next()
  }

  // GET /name/:id
  // GET /name/:id?_embed=&_expand
  function show(req, res, next) {
    const _embed = req.query._embed
    const _expand = req.query._expand
    const resource = db
      .get(name)
      .getById(req.params.id)
      .value()

    if (resource) {
      // Clone resource to avoid making changes to the underlying object
      const clone = _.cloneDeep(resource)

      // Embed other resources based on resource id
      // /posts/1?_embed=comments
      embed(clone, _embed)

      // Expand inner resources based on id
      // /posts/1?_expand=user
      expand(clone, _expand)

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
