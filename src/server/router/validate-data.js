const _ = require('lodash')

function validateKey (key) {
  if (key.indexOf('/') !== -1) {
    const msg =
      `Oops, found / character in data property ${key} which is not` +
      'supported and may results in errors.\n' +
      'If you need to add a prefix to your routes, see\n' +
      'https://github.com/typicode/json-server/tree/next#add-routes'
    throw new Error(msg)
  }
}

module.exports = (obj) => {
  if (_.isPlainObject(obj)) {
    Object
      .keys(obj)
      .forEach(validateKey)
  } else {
    throw new Error(`Data must be an object. Found ${typeof obj}.`)
  }
}
