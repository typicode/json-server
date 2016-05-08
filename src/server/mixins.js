var uuid = require('node-uuid')
var pluralize = require('pluralize')

module.exports = {
  getRemovable: getRemovable,
  createId: createId,
  deepQuery: deepQuery
}

// Returns document ids that have unsatisfied relations
// Example: a comment that references a post that doesn't exist
function getRemovable (db) {
  var _ = this
  var removable = []
  _.each(db, function (coll, collName) {
    _.each(coll, function (doc) {
      _.each(doc, function (value, key) {
        if (/Id$/.test(key)) {
          var refName = pluralize.plural(key.slice(0, -2))
          // Test if table exists
          if (db[refName]) {
            // Test if references is defined in table
            var ref = _.getById(db[refName], value)
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

// Return incremented id or uuid
// Used to override underscore-db's createId with utils.createId
function createId (coll) {
  var _ = this
  var idProperty = _.__id()
  if (_.isEmpty(coll)) {
    return 1
  } else {
    var id = _.maxBy(coll, function (doc) {
      return doc[idProperty]
    })[idProperty]

    if (_.isFinite(id)) {
      // Increment integer id
      return ++id
    } else {
      // Generate string id
      return uuid()
    }
  }
}

function deepQuery (value, q) {
  var _ = this
  if (value && q) {
    if (_.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        if (_.deepQuery(value[i], q)) {
          return true
        }
      }
    } else if (_.isObject(value) && !_.isArray(value)) {
      for (var k in value) {
        if (_.deepQuery(value[k], q)) {
          return true
        }
      }
    } else if (value.toString().toLowerCase().indexOf(q) !== -1) {
      return true
    }
  }
}
