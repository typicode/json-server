"use strict";

var _require = require('nanoid'),
    nanoid = _require.nanoid;

var pluralize = require('pluralize');

module.exports = {
  getRemovable: getRemovable,
  createId: createId,
  deepQuery: deepQuery
}; // Returns document ids that have unsatisfied relations
// Example: a comment that references a post that doesn't exist

function getRemovable(db, opts) {
  var _ = this;

  var removable = [];

  _.each(db, function (coll, collName) {
    _.each(coll, function (doc) {
      _.each(doc, function (value, key) {
        if (new RegExp("".concat(opts.foreignKeySuffix, "$")).test(key)) {
          // Remove foreign key suffix and pluralize it
          // Example postId -> posts
          var refName = pluralize.plural(key.replace(new RegExp("".concat(opts.foreignKeySuffix, "$")), '')); // Test if table exists

          if (db[refName]) {
            // Test if references is defined in table
            var ref = _.getById(db[refName], value);

            if (_.isUndefined(ref)) {
              removable.push({
                name: collName,
                id: doc.id
              });
            }
          }
        }
      });
    });
  });

  return removable;
} // Return incremented id or uuid
// Used to override lodash-id's createId with utils.createId


function createId(coll) {
  var _ = this;

  var idProperty = _.__id();

  if (_.isEmpty(coll)) {
    return 1;
  } else {
    var id = _(coll).maxBy(idProperty)[idProperty]; // Increment integer id or generate string id


    return _.isFinite(id) ? ++id : nanoid(7);
  }
}

function deepQuery(value, q) {
  var _ = this;

  if (value && q) {
    if (_.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        if (_.deepQuery(value[i], q)) {
          return true;
        }
      }
    } else if (_.isObject(value) && !_.isArray(value)) {
      for (var k in value) {
        if (_.deepQuery(value[k], q)) {
          return true;
        }
      }
    } else if (value.toString().toLowerCase().indexOf(q) !== -1) {
      return true;
    }
  }
}