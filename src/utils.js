var low = require('lowdb') 
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

function withChild(resource, parent, _with) {
    var _mergedResource = []

    _.each(resource, function(value) {
        var relation = 'hasMany'
        var parentSingular = parent.slice(0, - 1)
        var parentId = parentSingular + '_id'

        var selfValues = [] // relational data

        if(!_.isArray(_with)) _with = [_with] // convert to object for _.each function

        //if it is an array, ex. _with=customers&_with=bills
        _.each(_with, function(selfWith) {

            var isPidExist = low(selfWith).first()[parentId] != undefined ? true : false // is parent id existing??

            // relation type
            if(!isPidExist) {
                relation = 'belongsToMany'
            } else {
                relation = "hasMany"
            }
            // where clause
            var props = []
            props[parentId] = value.id

            switch (relation) {
                case 'hasMany':
                    selfValues[selfWith] = low(selfWith).where(props).value()
                    break
                case 'belongsToMany':
                    var childId = selfWith.slice(0, - 1) + '_id'
                    var pivot = low(parentSingular + '_' + selfWith).where(props).value()
                    var ids = _.pluck(pivot, childId)
                    var pivotData = []
                    _.each(ids, function(id) {
                        pivotData.push(low(selfWith).where({id: id}).value())
                    })
                    selfValues[selfWith] = pivotData
                    break
            }
        })
        _mergedResource.push(_.extend(value, selfValues))
    })

    return _mergedResource
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
          var ref     = _.findWhere(db[refName], {id: value})
          if (_.isUndefined(ref)) {
            removable.push([collName, doc.id])
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
  getRemovable: getRemovable,
  withChild: withChild
}