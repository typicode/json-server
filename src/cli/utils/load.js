var path = require('path')
var got = require('got')
var low = require('lowdb')
var is = require('./is')

module.exports = function (source, cb) {
  var data

  if (is.URL(source)) {

    got(source, { json: true }, function (err, data) {
      cb(err, data)
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

    data = low(source).object
    cb(null, data)

  } else {

    throw new Error('Unsupported source ' + source)

  }
}
