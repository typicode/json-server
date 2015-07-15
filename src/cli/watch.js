var fs = require('fs')
var path = require('path')
var is = require('./utils/is')

module.exports = watch

// Because JSON file can be modified by the server, we need to be able to
// distinguish between user modification vs server modification.
// When the server modifies the JSON file, it generates a rename event.
// When the user modifies the JSON file, it generate a change event.
function watchDB (file, cb) {
  var watchedDir = path.dirname(file)
  var watchedFile = path.basename(file)

  fs.watch(watchedDir, function (event, changedFile) {
    if (event === 'change' && changedFile === watchedFile) cb()
  })
}

function watchJS (file, cb) {
  fs.watchFile(file, cb)
}

function watchSource (source, cb) {
  if (is.JSON(source)) {
    return watchDB(source, cb)
  }
  if (is.JS(source)) return watchJS(source, cb)
  if (is.URL(source)) throw new Error('Can\'t watch URL')
}

function watch (argv, cb) {
  var source = argv._[0]

  watchSource(source, function () {
    cb(source)
  })

  if (argv.routes) {
    fs.watchFile(argv.routes, function () {
      cb(argv.routes)
    })
  }
}
