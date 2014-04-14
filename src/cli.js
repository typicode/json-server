var fs       = require('fs')
var chalk    = require('chalk')
var minimist = require('minimist')
var request  = require('superagent')
var low      = require('lowdb')
var server   = require('./server')

// Output version
function version() {
  var pkg = require('../package.json')
  console.log(pkg.version)
}

// Output help.txt with some colors
function help() {
  var txt = fs.readFileSync(__dirname + '/help.txt').toString()
  txt = txt.replace(/json-server/g, chalk.green('json-server'))
  console.log(txt)
}

// Start server
function start(port) {
  for (var prop in low.db) {
    console.log('http://localhost:' + port + '/' + chalk.green(prop))
  }

  console.log(
    '\nEnter ' + chalk.green('`s`') + ' at any time to create a snapshot of the db\n'
  )
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', function (chunk) {
    if (chunk.trim().toLowerCase() === 's') {
      var file = 'db-' + Date.now() + '.json'
      low.save(file)
      console.log('\nSaved snapshot to ' + chalk.green(file) + '\n')
    }
  })

  server.listen(port)
}

// Load source
function load(source, port) {
  console.log(chalk.green('\n{^ ^} Heya!\n'))

  console.log('Loading database from ' + source + '\n')

  if (/\.json$/.test(source)) {
    var path = process.cwd() + '/' + source
    low.path = path
    low.db   = require(path);
    start(port)
  }

  if (/\.js$/.test(source)) {
    var path = process.cwd() + '/' + source
    low.db   = require(path).run();
    start(port)
  }

  if (/^http/.test(source)) {
    request
      .get(source)
      .end(function(err, res) {
        if (err) {
          console.error(err)
        } else {
          low.db = JSON.parse(res.text)
          start(port)
        }
      })
  }
}

// Uses minimist parsed argv
function run(argv) {
  var source = argv._[0]
  var port   = argv.port || 3000

  if (argv.version) return version()
  if (source)       return load(source, port)

  help()
}

module.exports.run = run
