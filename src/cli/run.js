var fs = require('fs')
var path = require('path')
var _ = require('lodash')
var chalk = require('chalk')
var chokidar = require('chokidar')
var enableDestroy = require('server-destroy')
var pause = require('connect-pause')
var is = require('./utils/is')
var load = require('./utils/load')
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

function createApp (source, object, routes, middlewares, argv) {
  var app = jsonServer.create()

  var router = jsonServer.router(
    is.JSON(source)
    ? source
    : object
  )

  var defaultsOpts = {
    logger: !argv.quiet,
    readOnly: argv.readOnly,
    noCors: argv.noCors,
    noGzip: argv.noGzip
  }

  if (argv.static) {
    defaultsOpts.static = path.join(process.cwd(), argv.static)
  }

  var defaults = jsonServer.defaults(defaultsOpts)
  app.use(defaults)

  if (routes) {
    var rewriter = jsonServer.rewriter(routes)
    app.use(rewriter)
  }

  if (middlewares) {
    app.use(middlewares)
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

  // noop log fn
  if (argv.quiet) {
    console.log = function () {}
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

      // Load middlewares
      var middlewares
      if (argv.middlewares) {
        middlewares = argv.middlewares.map(function (m) {
          console.log(chalk.gray('  Loading', m))
          return require(path.resolve(m))
        })
      }

      // Done
      console.log(chalk.gray('  Done'))

      // Create app and server
      app = createApp(source, data, routes, middlewares, argv)
      server = app.listen(argv.port, argv.host)

      // Enhance with a destroy function
      enableDestroy(server)

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
        var state = app.db.getState()
        fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8')
        console.log('  Saved snapshot to ' + path.relative(process.cwd(), file) + '\n')
      }
    })

    // Watch files
    if (argv.watch) {
      console.log(chalk.gray('  Watching...'))
      console.log()
      var source = argv._[0]

      // Can't watch URL
      if (is.URL(source)) throw new Error('Can\'t watch URL')

      // Watch .js or .json file
      // Since lowdb uses atomic writing, directory is watched instead of file
      chokidar
        .watch(path.dirname(source))
        .on('change', function (file) {
          if (path.resolve(file) === path.resolve(source)) {
            if (is.JSON(file)) {
              var obj = JSON.parse(fs.readFileSync(file))
              // Compare .json file content with in memory database
              var isDatabaseDifferent = !_.isEqual(obj, app.db.getState())
              if (isDatabaseDifferent) {
                console.log(chalk.gray('  ' + file + ' has changed, reloading...'))
                server && server.destroy()
                start()
              }
            } else {
              console.log(chalk.gray('  ' + file + ' has changed, reloading...'))
              server && server.destroy()
              start()
            }
          }
        })

      // Watch routes
      if (argv.routes) {
        chokidar
          .watch(argv.routes)
          .on('change', function (file) {
            console.log(chalk.gray('  ' + file + ' has changed, reloading...'))
            server && server.destroy()
            start()
          })
      }
    }
  })
}
