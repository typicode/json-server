var low = require('low') 
var _ = require('underscore')
_.mixin(require('underscore.inflections'))


// Turns string to native.
// Example:
//   'true' -> true
//   '1' -> 1
function toNative(value) {
  if (value === 'true' || value === 'false') {
    return value === 'true'
  } else if (!isNaN(+value)) {
    return +value
  } else {
    return value
  }
}

// Creates incremental id.
function createId(coll) {
  if (_.isEmpty(coll)) {
    return 1
  } else {
    return _.max(coll, function(doc) {
      return doc.id
    }).id + 1
  }
}

// Removes empty relations
function clean() {
  var toBeRemoved = []

  _(low.db).each(function(coll, collName) {
    _(coll).each(function(doc) {
      _(doc).each(function(value, key) {
        if (/Id$/.test(key)) {
          var reference = _.pluralize(key.slice(0, - 2))
          if (!_.isUndefined(low(reference).get(doc[key]).value())) {
            toBeRemoved.push({
              collName: collName,
              id: doc.id
            })
          }
        }
      })
    })
  })

  _(toBeRemoved).each(function(item) {
    low(item.collName).remove(item.id);
  })
}

module.exports = {
  toNative: toNative,
  createId: createId,
  clean: clean
}