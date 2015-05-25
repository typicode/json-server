var _ = require('lodash')
var uuid = require('node-uuid')
var pluralize = require('pluralize')

// Turns string to native.
// Example:
//   'true' -> true
//   '1' -> 1
function toNative (value) {
  if (typeof value === 'string') {
    if (value === ''
       || value.trim() !== value
       || (value.length > 1 && value[0] === '0')) {
      return value
    } else if (value === 'true' || value === 'false') {
      return value === 'true'
    } else if (!isNaN(+value)) {
      return +value
    }
  }
  return value
}

// Return incremented id or uuid
function createId (coll) {
  if (_.isEmpty(coll)) {
    return 1
  } else {
    var id = _.max(coll, function (doc) {
      return doc.id
    }).id

    if (_.isFinite(id)) {
      // Increment integer id
      return ++id
    } else {
      // Generate string id
      return uuid()
    }
  }
}

// Returns document ids that have unsatisfied relations
// Example: a comment that references a post that doesn't exist
function getRemovable (db) {
  var removable = []
  _.each(db, function (coll, collName) {
    _.each(coll, function (doc) {
      _.each(doc, function (value, key) {
        if (/Id$/.test(key)) {
          var refName = pluralize.plural(key.slice(0, -2))
          // Test if table exists
          if (db[refName]) {
            // Test if references is defined in table
            var ref = _.findWhere(db[refName], {id: value})
            if (_.isUndefined(ref)) {
              removable.push({name: collName, id: doc.id})
            }
          }
        }
      })
    })
  })

  return removable
}

function deepQuery (value, q) {
  if (value && q) {
    if (_.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        if (deepQuery(value[i], q)) {
          return true
        }
      }
    } else if (_.isObject(value) && !_.isArray(value)) {
      for (var k in value) {
        if (deepQuery(value[k], q)) {
          return true
        }
      }
    } else if (value.toString().toLowerCase().indexOf(q) !== -1) {
      return true
    }
  }
}

module.exports = {
  toNative: toNative,
  createId: createId,
  getRemovable: getRemovable,
  deepQuery: deepQuery
}
