var fs = require('fs')
var chalk = require('chalk')
var is = require('./utils/is')
var load = require('./utils/load')
var watch = require('./watch')
var jsonServer = require('../server')

function prettyPrint (argv, object, rules) {
  var host = argv.host === '0.0.0.0' ? 'localhost' : argv.host
  var port = argv.port
  var root = 'http://' + host + ':' + port

  console.log()
  console.log(chalk.bold('  Resources'))
  for (var prop in object) {
    console.log('  ' + root + '/' + prop)
  }

  if (rules) {
    console.log()
    console.log(chalk.bold('  Other routes'))
    for (var rule in rules) {
      console.log('  ' + rule + ' -> ' + rules[rule])
    }
  }

  console.log()
  console.log(chalk.bold('  Home'))
  console.log('  ' + root)
  console.log()
}

function createServer (source, object, routes) {
  var server = jsonServer.create()

  var router = jsonServer.router(
    is.JSON(source) ?
    source :
    object
  )

  server.use(jsonServer.defaults)

  if (routes) {
    var rewriter = jsonServer.rewriter(routes)
    server.use(rewriter)
  }

  server.use(router)

  return server
}

module.exports = function (argv) {

  var source = argv._[0]
  var server

  console.log()
  console.log(chalk.cyan('  \\{^_^}/ hi!'))

  function start () {
    console.log()
    console.log(chalk.gray('  Loading', source))

    // Load JSON, JS or HTTP database
    load(source, function (err, data) {

      if (err) throw err

      // Load additional routes
      if (argv.routes) {
        console.log(chalk.gray('  Loading', argv.routes))
        var routes = JSON.parse(fs.readFileSync(argv.routes))
      }

      console.log(chalk.gray('  Done'))

      // Create server and listen
      server = createServer(source, data, routes).listen(argv.port, argv.host)

      // Display server informations
      prettyPrint(argv, data, routes)
    })
  }

  // Start server
  start()

  // Watch files
  if (argv.watch) {
    console.log(chalk.gray('  Watching...'))
    console.log()
    watch(argv, function (file) {
      console.log(chalk.gray('  ' + file + ' has changed, reloading...'))
      // Restart server
      server && server.close()
      start()
    })
  }

}
