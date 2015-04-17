var _ = require('underscore')
var uuid = require('node-uuid')
var _inflections = require('underscore.inflections')
_.mixin(_inflections)

// Turns string to native.
// Example:
//   'true' -> true
//   '1' -> 1
function toNative(value) {
  if (typeof value === 'string') {
    if (value === '' || value.trim() !== value) {
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
function createId(coll) {
  if (_.isEmpty(coll)) {
    return 1
  } else {
    var id = _.max(coll, function(doc) {
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
function getRemovable(db) {
  var removable = []

  _(db).each(function(coll, collName) {
    _(coll).each(function(doc) {
      _(doc).each(function(value, key) {
        if (/Id$/.test(key)) {
          var refName = _.pluralize(key.slice(0, - 2))
          // Test if table exists
          if (db[refName]) {
            // Test if references is defined in table
            var ref = _.findWhere(db[refName], {id: value})
            if (_.isUndefined(ref)) {
              removable.push({ name: collName, id: doc.id })
            }
          }
        }
      })
    })
  })

  return removable
}

module.exports = {
  toNative: toNative,
  createId: createId,
  getRemovable: getRemovable
}