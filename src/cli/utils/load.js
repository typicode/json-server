const path = require('path')
const request = require('request')
const low = require('lowdb')
const fileAsync = require('lowdb/lib/storages/file-async')
const is = require('./is')

module.exports = function(source, cb) {
  if (is.URL(source)) {
    // Load remote data
    const opts = {
      url: source,
      json: true
    }

    request(opts, (err, response) => {
      if (err) return cb(err)
      cb(null, response.body)
    })
  } else if (is.JS(source)) {
    // Clear cache
    const filename = path.resolve(source)
    delete require.cache[filename]
    const dataFn = require(filename)

    if (typeof dataFn !== 'function') {
      throw new Error(
        'The database is a JavaScript file but the export is not a function.'
      )
    }

    // Run dataFn to generate data
    const data = dataFn()
    cb(null, data)
  } else if (is.JSON(source)) {
    // Load JSON using lowdb
    const data = low(source, { storage: fileAsync }).getState()
    cb(null, data)
  } else {
    throw new Error(`Unsupported source ${source}`)
  }
}
