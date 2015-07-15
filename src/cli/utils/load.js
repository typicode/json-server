var path = require('path')
var got = require('got')
var is = require('./is')

module.exports = function (source, cb) {
  if (is.URL(source)) {
      // Load URL
    got(source, { json: true }, function (err, data) {
      cb(err, data)
    })
  } else {
    // Load JS or JSON
    var filename = path.resolve(source)
    delete require.cache[filename]
    var data = is.JSON(source) ? require(filename) : require(filename)()
    cb(null, data)
  }
}
