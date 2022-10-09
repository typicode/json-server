"use strict";

var fs = require('fs');

var path = require('path');

var jph = require('json-parse-helpfulerror');

var _ = require('lodash');

var chalk = require('chalk');

var enableDestroy = require('server-destroy');

var pause = require('connect-pause');

var is = require('./utils/is');

var load = require('./utils/load');

var jsonServer = require('../server');

function prettyPrint(argv, object, rules) {
  var root = "http://".concat(argv.host, ":").concat(argv.port);
  console.log();
  console.log(chalk.bold('  Resources'));

  for (var prop in object) {
    console.log("  ".concat(root, "/").concat(prop));
  }

  if (rules) {
    console.log();
    console.log(chalk.bold('  Other routes'));

    for (var rule in rules) {
      console.log("  ".concat(rule, " -> ").concat(rules[rule]));
    }
  }

  console.log();
  console.log(chalk.bold('  Home'));
  console.log("  ".concat(root));
  console.log();
}

function createApp(db, routes, middlewares, argv) {
  var app = jsonServer.create();
  var foreignKeySuffix = argv.foreignKeySuffix;
  var router = jsonServer.router(db, foreignKeySuffix ? {
    foreignKeySuffix: foreignKeySuffix
  } : undefined);
  var defaultsOpts = {
    logger: !argv.quiet,
    readOnly: argv.readOnly,
    noCors: argv.noCors,
    noGzip: argv.noGzip,
    bodyParser: true
  };

  if (argv["static"]) {
    defaultsOpts["static"] = path.join(process.cwd(), argv["static"]);
  }

  var defaults = jsonServer.defaults(defaultsOpts);
  app.use(defaults);

  if (routes) {
    var rewriter = jsonServer.rewriter(routes);
    app.use(rewriter);
  }

  if (middlewares) {
    app.use(middlewares);
  }

  if (argv.delay) {
    app.use(pause(argv.delay));
  }

  router.db._.id = argv.id;
  app.db = router.db;
  app.use(router);
  return app;
}

module.exports = function (argv) {
  var source = argv._[0];
  var app;
  var server;

  if (!fs.existsSync(argv.snapshots)) {
    console.log("Error: snapshots directory ".concat(argv.snapshots, " doesn't exist"));
    process.exit(1);
  } // noop log fn


  if (argv.quiet) {
    console.log = function () {};
  }

  console.log();
  console.log(chalk.cyan('  \\{^_^}/ hi!'));

  function start(cb) {
    console.log();
    console.log(chalk.gray('  Loading', source));
    server = undefined; // create db and load object, JSON file, JS or HTTP database

    return load(source).then(function (db) {
      // Load additional routes
      var routes;

      if (argv.routes) {
        console.log(chalk.gray('  Loading', argv.routes));
        routes = JSON.parse(fs.readFileSync(argv.routes));
      } // Load middlewares


      var middlewares;

      if (argv.middlewares) {
        middlewares = argv.middlewares.map(function (m) {
          console.log(chalk.gray('  Loading', m));
          return require(path.resolve(m));
        });
      } // Done


      console.log(chalk.gray('  Done')); // Create app and server

      app = createApp(db, routes, middlewares, argv);
      server = app.listen(argv.port, argv.host); // Enhance with a destroy function

      enableDestroy(server); // Display server informations

      prettyPrint(argv, db.getState(), routes); // Catch and handle any error occurring in the server process

      process.on('uncaughtException', function (error) {
        if (error.errno === 'EADDRINUSE') console.log(chalk.red("Cannot bind to the port ".concat(error.port, ". Please specify another port number either through --port argument or through the json-server.json configuration file")));else console.log('Some error occurred', error);
        process.exit(1);
      });
    });
  } // Start server


  start().then(function () {
    // Snapshot
    console.log(chalk.gray('  Type s + enter at any time to create a snapshot of the database')); // Support nohup
    // https://github.com/typicode/json-server/issues/221

    process.stdin.on('error', function () {
      console.log("  Error, can't read from stdin");
      console.log("  Creating a snapshot from the CLI won't be possible");
    });
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) {
      if (chunk.trim().toLowerCase() === 's') {
        var filename = "db-".concat(Date.now(), ".json");
        var file = path.join(argv.snapshots, filename);
        var state = app.db.getState();
        fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
        console.log("  Saved snapshot to ".concat(path.relative(process.cwd(), file), "\n"));
      }
    }); // Watch files

    if (argv.watch) {
      console.log(chalk.gray('  Watching...'));
      console.log();
      var _source = argv._[0]; // Can't watch URL

      if (is.URL(_source)) throw new Error("Can't watch URL"); // Watch .js or .json file
      // Since lowdb uses atomic writing, directory is watched instead of file

      var watchedDir = path.dirname(_source);
      var readError = false;
      fs.watch(watchedDir, function (event, file) {
        // https://github.com/typicode/json-server/issues/420
        // file can be null
        if (file) {
          var watchedFile = path.resolve(watchedDir, file);

          if (watchedFile === path.resolve(_source)) {
            if (is.FILE(watchedFile)) {
              var obj;

              try {
                obj = jph.parse(fs.readFileSync(watchedFile));

                if (readError) {
                  console.log(chalk.green("  Read error has been fixed :)"));
                  readError = false;
                }
              } catch (e) {
                readError = true;
                console.log(chalk.red("  Error reading ".concat(watchedFile)));
                console.error(e.message);
                return;
              } // Compare .json file content with in memory database


              var isDatabaseDifferent = !_.isEqual(obj, app.db.getState());

              if (isDatabaseDifferent) {
                console.log(chalk.gray("  ".concat(_source, " has changed, reloading...")));
                server && server.destroy(function () {
                  return start();
                });
              }
            }
          }
        }
      }); // Watch routes

      if (argv.routes) {
        var _watchedDir = path.dirname(argv.routes);

        fs.watch(_watchedDir, function (event, file) {
          if (file) {
            var watchedFile = path.resolve(_watchedDir, file);

            if (watchedFile === path.resolve(argv.routes)) {
              console.log(chalk.gray("  ".concat(argv.routes, " has changed, reloading...")));
              server && server.destroy(function () {
                return start();
              });
            }
          }
        });
      }
    }
  })["catch"](function (err) {
    console.log(err);
    process.exit(1);
  });
};