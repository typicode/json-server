var yargv   = require('yargs')
var request = require('request')
var low     = require('low')
var server  = require('./server')

function show() {
  for (var prop in low.db) {
    console.log(server.url + '/' + prop)
  }
}

function start(port) {
  server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url);
  })
}

function run() {
  var argv = yargv.usage('Usage: $0 <source>')
    .demand(1)
    .default('port', 3000)
    .argv

  var source = argv._[0]

  if (/\.json$/.test(source)) {
    var path = process.cwd() + '/' + source
    low.path = path
    low.db   = require(path);
    show()
    start()
  }

  if (/\.js$/.test(source)) {
    var path = process.cwd() + '/' + source
    low.db   = require(path).run();
    show()
    start(argv.port)
  }

  if (/^http/.test(source)) {
    request.get(source)
      .end(function(err, res) {
        if (err) {
          console.error(err)
        } else {
          low.db = JSON.parse(res.text)
        }
      })
    show()
    start()
  }

  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', function (chunk) {
    if (chunk.trim().toLowerCase() === 's') {
      low.save('db-' + Date.now() + '.json')
    }
  })
}

module.exports.run = run
