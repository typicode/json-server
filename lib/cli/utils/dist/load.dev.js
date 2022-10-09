"use strict";

var fs = require('fs');

var path = require('path');

var http = require('http');

var https = require('https');

var low = require('lowdb');

var FileAsync = require('lowdb/adapters/FileAsync');

var Memory = require('lowdb/adapters/Memory');

var is = require('./is');

var chalk = require('chalk');

var example = {
  posts: [{
    id: 1,
    title: 'json-server',
    author: 'typicode'
  }],
  comments: [{
    id: 1,
    body: 'some comment',
    postId: 1
  }],
  profile: {
    name: 'typicode'
  }
};

module.exports = function (source) {
  return new Promise(function (resolve, reject) {
    if (is.FILE(source)) {
      if (!fs.existsSync(source)) {
        console.log(chalk.yellow("  Oops, ".concat(source, " doesn't seem to exist")));
        console.log(chalk.yellow("  Creating ".concat(source, " with some default data")));
        console.log();
        fs.writeFileSync(source, JSON.stringify(example, null, 2));
      }

      resolve(low(new FileAsync(source)));
    } else if (is.URL(source)) {
      // Normalize the source into a URL object.
      var sourceUrl = new URL(source); // Pick the client based on the protocol scheme

      var client = sourceUrl.protocol === 'https:' ? https : http;
      client.get(sourceUrl, function (res) {
        var dbData = '';
        res.on('data', function (data) {
          dbData += data;
        });
        res.on('end', function () {
          resolve(low(new Memory()).setState(JSON.parse(dbData)));
        });
      }).on('error', function (error) {
        return reject(error);
      });
    } else if (is.JS(source)) {
      // Clear cache
      var filename = path.resolve(source);
      delete require.cache[filename];

      var dataFn = require(filename);

      if (typeof dataFn !== 'function') {
        throw new Error('The database is a JavaScript file but the export is not a function.');
      } // Run dataFn to generate data


      var data = dataFn();
      resolve(low(new Memory()).setState(data));
    } else {
      throw new Error("Unsupported source ".concat(source));
    }
  });
};