"use strict";

const {
  nanoid
} = require('nanoid');

const pluralize = require('pluralize');

module.exports = {
  getRemovable,
  createId,
  deepQuery
}; // Returns document ids that have unsatisfied relations
// Example: a comment that references a post that doesn't exist

function getRemovable(db, opts) {
  const _ = this;

  const removable = [];

  _.each(db, (coll, collName) => {
    _.each(coll, doc => {
      _.each(doc, (value, key) => {
        if (new RegExp(`${opts.foreignKeySuffix}$`).test(key)) {
          // Remove foreign key suffix and pluralize it
          // Example postId -> posts
          const refName = pluralize.plural(key.replace(new RegExp(`${opts.foreignKeySuffix}$`), '')); // Test if table exists

          if (db[refName]) {
            // Test if references is defined in table
            const ref = _.getById(db[refName], value);

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
  const _ = this;

  const idProperty = _.__id();

  if (_.isEmpty(coll)) {
    return 1;
  } else {
    let id = _(coll).maxBy(idProperty)[idProperty]; // Increment integer id or generate string id


    return _.isFinite(id) ? ++id : nanoid(7);
  }
}

function deepQuery(value, q) {
  const _ = this;

  if (value && q) {
    if (_.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (_.deepQuery(value[i], q)) {
          return true;
        }
      }
    } else if (_.isObject(value) && !_.isArray(value)) {
      for (const k in value) {
        if (_.deepQuery(value[k], q)) {
          return true;
        }
      }
    } else if (value.toString().toLowerCase().indexOf(q) !== -1) {
      return true;
    }
  }
}