var path = require('path')
var request = require('request')
var low = require('lowdb')
var fileAsync = require('lowdb/lib/file-async')
var is = require('./is')

module.exports = function (source, cb) {
  var data

  if (is.URL(source)) {
    request({ url: source, json: true }, function (err, response) {
      if (err) return cb(err)
      cb(null, response.body)
    })
  } else if (is.JS(source)) {
    var filename = path.resolve(source)
    delete require.cache[filename]
    var dataFn = require(filename)

    if (typeof dataFn !== 'function') {
      throw new Error('The database is a JavaScript file but the export is not a function.')
    }

    data = dataFn()
    cb(null, data)
  } else if (is.JSON(source)) {
    data = low(source, { storage: fileAsync }).getState()
    cb(null, data)
  } else {
    throw new Error('Unsupported source ' + source)
  }
}
