var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var is = require('./utils/is')
var load = require('./utils/load')
var watch = require('./watch')
var pause = require('connect-pause')
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

function createApp (source, object, routes, argv) {
  var app = jsonServer.create()

  var router = jsonServer.router(
    is.JSON(source) ?
    source :
    object
  )

  var defaults
  if (argv.static) {
    defaults = jsonServer.defaults({
      static: path.join(process.cwd(), argv.static)
    })
  } else {
    defaults = jsonServer.defaults()
  }

  app.use(defaults)

  if (routes) {
    var rewriter = jsonServer.rewriter(routes)
    app.use(rewriter)
  }

  if (argv.delay) {
    app.use(pause(argv.delay))
  }

  router.db._.id = argv.id
  app.db = router.db
  app.use(router)

  return app
}

module.exports = function (argv) {

  var source = argv._[0]
  var app
  var server

  if (!fs.existsSync(argv.snapshots)) {
    console.log('Error: snapshots directory ' + argv.snapshots + ' doesn\'t exist')
    process.exit(1)
  }

  console.log()
  console.log(chalk.cyan('  \\{^_^}/ hi!'))

  function start (cb) {
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

      // Create app and server
      app = createApp(source, data, routes, argv)
      server = app.listen(argv.port, argv.host)

      // Display server informations
      prettyPrint(argv, data, routes)

      cb && cb()
    })
  }

  // Start server
  start(function () {

    // Snapshot
    console.log(
      chalk.gray('  Type s + enter at any time to create a snapshot of the database')
    )

    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', function (chunk) {
      if (chunk.trim().toLowerCase() === 's') {
        var filename = 'db-' + Date.now() + '.json'
        var file = path.join(argv.snapshots, filename)
        app.db.saveSync(file)
        console.log('  Saved snapshot to ' + path.relative(process.cwd(), file) + '\n')
      }
    })

    // Watch files
    if (argv.watch) {
      console.log(chalk.gray('  Watching...'))
      console.log()
      watch(argv, function (file) {
        console.log(chalk.gray('  ' + file + ' has changed, reloading...'))
        server && server.close()
        start()
      })
    }

  })

}
