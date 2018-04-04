const nanoid = require('nanoid')

module.exports = {
  getDependents,
  createId,
  deepQuery
}

/**
 * Return documents which are dependent on the specified foreign field
 * Example: a comment that references a post that doesn't exist
 *
 * @param {object} db - The entire database object
 * @param {string} foreignField - The foreign field name. e.g. "postId"
 * @param {string|number} foreignId - The foreign field id to match
 * @return {[{name: string, id: string|number]} - Array of dependent objects with resource names and ids
 */
function getDependents(db, foreignField, foreignId) {
  const _ = this
  return _.reduce(
    db,
    (acc, table, tableName) =>
      // only work on arrays; object are irrelevant
      !_.isArray(table)
        ? acc
        : table
            .filter(
              doc =>
                // perform a type-insensitive comparison (so we could compare '2' to 2
                _.get(doc, foreignField, '').toString() === foreignId.toString()
            )
            .map(doc => ({ name: tableName, id: doc.id }))
            .concat(acc),
    []
  )
}

// Return incremented id or uuid
// Used to override lodash-id's createId with utils.createId
function createId(coll) {
  const _ = this
  const idProperty = _.__id()
  if (_.isEmpty(coll)) {
    return 1
  } else {
    let id = _(coll).maxBy(idProperty)[idProperty]

    // Increment integer id or generate string id
    return _.isFinite(id) ? ++id : nanoid(7)
  }
}

function deepQuery(value, q) {
  const _ = this
  if (value && q) {
    if (_.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (_.deepQuery(value[i], q)) {
          return true
        }
      }
    } else if (_.isObject(value) && !_.isArray(value)) {
      for (let k in value) {
        if (_.deepQuery(value[k], q)) {
          return true
        }
      }
    } else if (
      value
        .toString()
        .toLowerCase()
        .indexOf(q) !== -1
    ) {
      return true
    }
  }
}
