const _ = require('lodash')
const pluralize = require('pluralize')

module.exports = {
  fields,
  embed,
  expand,
  getPage
}

// Filter result fields by a given array
function fields(resource, e) {
  if (!e || e === '') {
    return resource
  }

  const isChain = resource.__chain__
  const value = isChain ? resource.value() : resource

  const _fieldSet = e.split(',')
  const result = _.isArray(value)
    ? _.map(value, r => _.pick(r, _fieldSet))
    : _.pick(value, _fieldSet)
  return isChain ? _.chain(result) : result
}

// Embed function used in GET /name and GET /name/id
function embed(resource, name, db, opts, e) {
  if (!e) {
    return resource
  }

  ;[].concat(e).forEach(externalResource => {
    const ext = db.get(externalResource)
    if (ext.value()) {
      const query = {}
      const singularResource = pluralize.singular(name)
      query[`${singularResource}${opts.foreignKeySuffix}`] =
        resource.id || resource.get('id').value()
      const filteredValue = ext.filter(query).value()
      if (resource.__chain__) {
        resource.set(externalResource, filteredValue).write()
      } else {
        resource[externalResource] = filteredValue
      }
    }
  })

  return resource
}

// Expand function
function expand(resource, db, opts, e) {
  if (!e) {
    return resource
  }

  ;[].concat(e).forEach(innerResource => {
    const plural = pluralize(innerResource)
    const prop = `${innerResource}${opts.foreignKeySuffix}`
    const resId = resource[prop] || resource.get(prop).value()
    if (!_.isUndefined(resId) && db.get(plural).value()) {
      const value = db
        .get(plural)
        .getById(resId)
        .value()
      if (resource.__chain__) {
        resource.set(innerResource, value).write()
      } else {
        resource[innerResource] = value
      }
    }
  })

  return resource
}

// Get pagination object
function getPage(array, page, perPage) {
  var obj = {}
  var start = (page - 1) * perPage
  var end = page * perPage

  obj.items = array.slice(start, end)
  if (obj.items.length === 0) {
    return obj
  }

  if (page > 1) {
    obj.prev = page - 1
  }

  if (end < array.length) {
    obj.next = page + 1
  }

  if (obj.items.length !== array.length) {
    obj.current = page
    obj.first = 1
    obj.last = Math.ceil(array.length / perPage)
  }

  return obj
}
