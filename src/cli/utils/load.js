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
    data = require(filename)()
    cb(null, data)

  } else if (is.JSON(source)) {

    data = low(source).object
    cb(null, data)

  } else {

    throw new Error('Unsupported source ' + source)

  }
}
