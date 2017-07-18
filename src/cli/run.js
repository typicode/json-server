const fs = require('fs')
const path = require('path')
const jph = require('json-parse-helpfulerror')
const _ = require('lodash')
const chalk = require('chalk')
const enableDestroy = require('server-destroy')
const pause = require('connect-pause')
const is = require('./utils/is')
const load = require('./utils/load')
const example = require('./example.json')
const jsonServer = require('../server')

function prettyPrint(argv, object, rules) {
  const host = argv.host === '0.0.0.0' ? 'localhost' : argv.host
  const port = argv.port
  const root = `http://${host}:${port}`

  console.log()
  console.log(chalk.bold('  Resources'))
  for (let prop in object) {
    console.log(`  ${root}/${prop}`)
  }

  if (rules) {
    console.log()
    console.log(chalk.bold('  Other routes'))
    for (var rule in rules) {
      console.log(`  ${rule} -> ${rules[rule]}`)
    }
  }

  console.log()
  console.log(chalk.bold('  Home'))
  console.log(`  ${root}`)
  console.log()
}

function createApp(source, object, routes, middlewares, argv) {
  const app = jsonServer.create()

  let router

  const { foreignKeySuffix } = argv
  try {
    router = jsonServer.router(
      is.JSON(source) ? source : object,
      foreignKeySuffix ? { foreignKeySuffix } : undefined
    )
  } catch (e) {
    console.log()
    console.error(chalk.red(e.message.replace(/^/gm, '  ')))
    process.exit(1)
  }

  const defaultsOpts = {
    logger: !argv.quiet,
    readOnly: argv.readOnly,
    noCors: argv.noCors,
    noGzip: argv.noGzip,
    bodyParser: true
  }

  if (argv.static) {
    defaultsOpts.static = path.join(process.cwd(), argv.static)
  }

  const defaults = jsonServer.defaults(defaultsOpts)
  app.use(defaults)

  if (routes) {
    const rewriter = jsonServer.rewriter(routes)
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

module.exports = function(argv) {
  const source = argv._[0]
  let app
  let server

  if (!fs.existsSync(argv.snapshots)) {
    console.log(`Error: snapshots directory ${argv.snapshots} doesn't exist`)
    process.exit(1)
  }

  // noop log fn
  if (argv.quiet) {
    console.log = () => {}
  }

  console.log()
  console.log(chalk.cyan('  \\{^_^}/ hi!'))

  function start(cb) {
    console.log()

    // Be nice and create a default db.json if it doesn't exist
    if (is.JSON(source) && !fs.existsSync(source)) {
      console.log(chalk.yellow(`  Oops, ${source} doesn't seem to exist`))
      console.log(chalk.yellow(`  Creating ${source} with some default data`))
      console.log()
      fs.writeFileSync(source, JSON.stringify(example, null, 2))
    }

    console.log(chalk.gray('  Loading', source))

    // Load JSON, JS or HTTP database
    load(source, (err, data) => {
      if (err) throw err

      // Load additional routes
      let routes
      if (argv.routes) {
        console.log(chalk.gray('  Loading', argv.routes))
        routes = JSON.parse(fs.readFileSync(argv.routes))
      }

      // Load middlewares
      let middlewares
      if (argv.middlewares) {
        middlewares = argv.middlewares.map(function(m) {
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
  start(() => {
    // Snapshot
    console.log(
      chalk.gray(
        '  Type s + enter at any time to create a snapshot of the database'
      )
    )

    // Support nohup
    // https://github.com/typicode/json-server/issues/221
    process.stdin.on('error', () => {
      console.log(`  Error, can't read from stdin`)
      console.log(`  Creating a snapshot from the CLI won't be possible`)
    })
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => {
      if (chunk.trim().toLowerCase() === 's') {
        const filename = `db-${Date.now()}.json`
        const file = path.join(argv.snapshots, filename)
        const state = app.db.getState()
        fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8')
        console.log(
          `  Saved snapshot to ${path.relative(process.cwd(), file)}\n`
        )
      }
    })

    // Watch files
    if (argv.watch) {
      console.log(chalk.gray('  Watching...'))
      console.log()
      const source = argv._[0]

      // Can't watch URL
      if (is.URL(source)) throw new Error("Can't watch URL")

      // Watch .js or .json file
      // Since lowdb uses atomic writing, directory is watched instead of file
      const watchedDir = path.dirname(source)
      let readError = false
      fs.watch(watchedDir, (event, file) => {
        // https://github.com/typicode/json-server/issues/420
        // file can be null
        if (file) {
          const watchedFile = path.resolve(watchedDir, file)
          if (watchedFile === path.resolve(source)) {
            if (is.JSON(watchedFile)) {
              let obj
              try {
                obj = jph.parse(fs.readFileSync(watchedFile))
                if (readError) {
                  console.log(chalk.green(`  Read error has been fixed :)`))
                  readError = false
                }
              } catch (e) {
                readError = true
                console.log(chalk.red(`  Error reading ${watchedFile}`))
                console.error(e.message)
                return
              }

              // Compare .json file content with in memory database
              const isDatabaseDifferent = !_.isEqual(obj, app.db.getState())
              if (isDatabaseDifferent) {
                console.log(chalk.gray(`  ${source} has changed, reloading...`))
                server && server.destroy()
                start()
              }
            }
          }
        }
      })

      // Watch routes
      if (argv.routes) {
        const watchedDir = path.dirname(argv.routes)
        fs.watch(watchedDir, (event, file) => {
          if (file) {
            const watchedFile = path.resolve(watchedDir, file)
            if (watchedFile === path.resolve(argv.routes)) {
              console.log(
                chalk.gray(`  ${argv.routes} has changed, reloading...`)
              )
              server && server.destroy()
              start()
            }
          }
        })
      }
    }
  })
}
