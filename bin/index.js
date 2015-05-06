#!/usr/bin/env node
var updateNotifier = require('update-notifier')
var _db = require('underscore-db')
var yargs = require('yargs')
var chalk = require('chalk')
var got = require('got')
var pkg = require('../package.json')
var jsonServer = require('../src')

updateNotifier({packageName: pkg.name, packageVersion: pkg.version}).notify()

// Parse arguments
var argv = yargs
  .usage('$0 <source>')
  .help('help').alias('help', 'h')
  .version(pkg.version, 'version').alias('version', 'v')
  .options({
    port: {
      alias: 'p',
      description: 'Set port',
      default: 3000
    },
    host: {
      alias: 'H',
      description: 'Set host',
      default: '0.0.0.0'
    }
  })
  .example('$0 db.json', '')
  .example('$0 file.js', '')
  .example('$0 http://example.com/db.json', '')
  .require(1, 'Missing <source> argument')
  .argv

// Start server function
function start(object, filename) {
  var port = process.env.PORT || argv.port
  var hostname = argv.host === '0.0.0.0' ? 'localhost' : argv.host

  for (var prop in object) {
    console.log(chalk.gray('  http://' + hostname +  ':' + port + '/') + chalk.cyan(prop))
  }

  console.log(
    '\nYou can now go to ' + chalk.gray('http://' + hostname + ':' + port + '/\n')
  )

  console.log(
    'Enter ' + chalk.cyan('`s`') + ' at any time to create a snapshot of the db\n'
  )

  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', function (chunk) {
    if (chunk.trim().toLowerCase() === 's') {
      var file = 'db-' + Date.now() + '.json'
      _db.save(object, file)
      console.log('\nSaved snapshot to ' + chalk.cyan(file) + '\n')
    }
  })

  if (filename) {
    var router = jsonServer.router(filename)
  } else {
    var router = jsonServer.router(object)
  }

  var server = jsonServer.create()
  server.use(jsonServer.defaults)
  server.use(router)
  server.listen(port, argv.host)
}

// Set file and port
var source = argv._[0]

// Say hi, load file and start server
console.log(chalk.cyan('{^_^} Hi!\n'))
console.log('Loading database from ' + chalk.cyan(source))

if (/\.json$/.test(source)) {
  var filename = process.cwd() + '/' + source
  var object = require(filename)
  start(object, filename)
}

if (/\.js$/.test(source)) {
  var object = require(process.cwd() + '/' + source)()
  start(object)
}

if (/^http/.test(source)) {
  got(source, function(err, data) {
    if (err) throw err
    var object = JSON.parse(data)
    start(object)
  })
}
