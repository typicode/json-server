#!/usr/bin/env node
var updateNotifier = require('update-notifier')
var _db = require('underscore-db')
var yargs = require('yargs')
var chalk = require('chalk')
var got = require('got')
var pkg = require('../package.json')
var server = require('../src')

updateNotifier({packageName: pkg.name, packageVersion: pkg.version}).notify()

var argv = yargs
  .usage('$0 <source>')
  .help('help').alias('help', 'h')
  .version(pkg.version, 'version').alias('version', 'v')
  .options({
    port: {
      alias: 'p',
      description: 'Set port',
      default: 3000
    }
  })
  .example('$0 db.json', '')
  .example('$0 file.js', '')
  .example('$0 http://example.com/db.json', '')
  .require(1, 'Missing <source> argument')
  .argv

function start(object, filename) {
  for (var prop in object) {
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
      _db.save(object, filename)
      console.log('\nSaved snapshot to ' + chalk.green(file) + '\n')
    }
  })

  server(object, filename).listen(port)
}

var source = argv._[0]
var port = process.env.PORT || argv.port

console.log(chalk.green('\n{^ ^} Yo!\n'))
console.log('Loading database from ' + source + '\n')

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