
var chalk   = require('chalk')
var request = require('request')
var low     = require('low')
var server  = require('./server')

function hello() {
  console.log(
    chalk.green('\n{^ ^} Heya!\n')
  )
}

function start(port) {
  for (var prop in low.db) {
    console.log('http://localhost:' + port + '/' + chalk.green(prop))
  }

  server.listen(port)
}

function run(argv) {
  hello();

  var source = argv._[0]

  console.log('Loading database from ' + source + '\n')

  if (/\.json$/.test(source)) {
    var path = process.cwd() + '/' + source
    low.path = path
    low.db   = require(path);
    start(argv.port)
  }

  if (/\.js$/.test(source)) {
    var path = process.cwd() + '/' + source
    low.db   = require(path).run();
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
    start(argv.port)
  }

  console.log(
    '\nEnter ' + chalk.green('`s`') + ' at any time to create a snapshot of the db\n'
  )
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', function (chunk) {
    if (chunk.trim().toLowerCase() === 's') {
      low.save('db-' + Date.now() + '.json')
    }
  })
}

module.exports.run = run
