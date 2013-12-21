#!/usr/bin/env node
var program = require('commander'),
    request = require('superagent'),
    server = require('../server'),
    logger = require('../utils/logger'),
    moment = require('moment'),
    fs = require('fs'),
    pkg = require('../package.json'),
    options = {};

function loadFile(file, cb) {
  var path = process.cwd() + '/' + file,
      db;

  if (/\.json$/.test(file)) db = require(path);
  if (/\.js$/.test(file)) db = require(path).run();

  cb(db);
}

function loadURL(url, cb) {
  logger.info('Fetching ' + url + '...')
  request
    .get(url)
    .end(function(error, res) {
      if (error) {
        logger.error(error);
      } else {
        cb(JSON.parse(res.text));
      }
    });
}

function saveDbOnCommand(app) {
  console.assert(app, 'expected app object');

  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (userInput) {
    if (userInput.trim().toLowerCase() == 's') {
      var liveDB = app.db();
      var now = moment().format('YYYY-MM-DD:HH-mm-ss')
      var filename = 'json-server.' + now + '.json';
      console.assert(liveDB, 'expected live db object');
      fs.writeFileSync(filename,
        JSON.stringify(liveDB, null, 2),
        'utf-8');
      console.log('saved db to', filename);
    }
  });
}

function onDatabaseLoaded(db) {
  var app = server.run(db, options);
  saveDbOnCommand(app);
  return app;
}

program
  .version(pkg.version)
  .option('-f --file <file>', 'load db from a js or json file')
  .option('-u --url <url>', 'load db from a URL')
  .option('-p --port [port]', 'server port')
  .option('--read-only', 'read only mode')
  .parse(process.argv);

if (program.port) options.port = program.port;
if (program.readOnly) options.readOnly = true;
if (program.file) loadFile(program.file, onDatabaseLoaded);
if (program.url) loadURL(program.url, onDatabaseLoaded);
