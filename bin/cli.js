#!/usr/bin/env node
var program = require('commander'),
    request = require('superagent'),
    url = require('url'),
    fs = require('fs'),
    server = require('../server'),
    logger = require('../utils/logger'),
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
        cb(JSON.parse(res));
      }
    });
}

function onDatabaseLoaded(db) {
  server.run(db, options);
}

program
  .version('0.1.0')
  .option('-f --file <file>', 'load db from a js or json file')
  .option('-u --url <url>', 'load db from a URL')
  .option('-p --port [port]', 'server port')
  .option('--read-only', 'read only mode')
  .parse(process.argv);

if (program.port) options.port = program.port;
if (program.readOnly) options.readOnly = true;
if (program.file) loadFile(program.file, onDatabaseLoaded);
if (program.url) loadURL(program.url, onDatabaseLoaded);