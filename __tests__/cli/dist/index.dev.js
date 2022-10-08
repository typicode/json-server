"use strict";

var fs = require('fs');

var path = require('path');

var cp = require('child_process');

var assert = require('assert');

var supertest = require('supertest');

var osTmpdir = require('os-tmpdir');

var tempWrite = require('temp-write');

var mkdirp = require('mkdirp');

var rimraf = require('rimraf');

var serverReady = require('server-ready');

var PORT = 3100;
var middlewareFiles = {
  en: './../../__fixtures__/middlewares/en.js',
  jp: './../../__fixtures__/middlewares/jp.js',
  postbody: './../../__fixtures__/middlewares/postbody.js'
};
var bin = path.join(__dirname, '../../lib/cli/bin');

function cli(args) {
  return cp.spawn('node', ['--', bin, '-p', PORT].concat(args), {
    cwd: __dirname,
    stdio: ['pipe', process.stdout, process.stderr]
  });
}

describe('cli', function () {
  var child;
  var request;
  var dbFile;
  var routesFile;
  beforeEach(function () {
    dbFile = tempWrite.sync(JSON.stringify({
      posts: [{
        id: 1
      }, {
        _id: 2
      }],
      comments: [{
        id: 1,
        post_id: 1
      }]
    }), 'db.json');
    routesFile = tempWrite.sync(JSON.stringify({
      '/blog/*': '/$1'
    }), 'routes.json');
    ++PORT;
    request = supertest("http://localhost:".concat(PORT));
  });
  afterEach(function () {
    child.kill('SIGKILL');
  });
  describe('db.json', function () {
    beforeEach(function (done) {
      child = cli([dbFile]);
      serverReady(PORT, done);
    });
    test('should support JSON file', function (done) {
      request.get('/posts').expect(200, done);
    });
    test('should send CORS headers', function (done) {
      var origin = 'http://example.com';
      request.get('/posts').set('Origin', origin).expect('access-control-allow-origin', origin).expect(200, done);
    });
    test('should update JSON file', function (done) {
      request.post('/posts').send({
        title: 'hello'
      }).end(function () {
        setTimeout(function () {
          var str = fs.readFileSync(dbFile, 'utf8');
          assert(str.indexOf('hello') !== -1);
          done();
        }, 1000);
      });
    });
  });
  describe('seed.js', function () {
    beforeEach(function (done) {
      child = cli(['../../__fixtures__/seed.js']);
      serverReady(PORT, done);
    });
    test('should support JS file', function (done) {
      request.get('/posts').expect(200, done);
    });
  });
  describe('remote db', function () {
    beforeEach(function (done) {
      child = cli(['https://jsonplaceholder.typicode.com/db']);
      serverReady(PORT, done);
    });
    test('should support URL file', function (done) {
      request.get('/posts').expect(200, done);
    });
  });
  describe('db.json -r routes.json -m middleware.js -i _id --foreignKeySuffix _id --read-only', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-r', routesFile, '-m', middlewareFiles.en, '-i', '_id', '--read-only', '--foreignKeySuffix', '_id']);
      serverReady(PORT, done);
    });
    test('should use routes.json and _id as the identifier', function (done) {
      request.get('/blog/posts/2').expect(200, done);
    });
    test('should use _id as foreignKeySuffix', function _callee() {
      var response;
      return regeneratorRuntime.async(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return regeneratorRuntime.awrap(request.get('/posts/1/comments'));

            case 2:
              response = _context.sent;
              assert.strictEqual(response.body.length, 1);

            case 4:
            case "end":
              return _context.stop();
          }
        }
      });
    });
    test('should apply middlewares', function (done) {
      request.get('/blog/posts/2').expect('X-Hello', 'World', done);
    });
    test('should allow only GET requests', function (done) {
      request.post('/blog/posts').expect(403, done);
    });
  });
  describe('db.json -m first-middleware.js second-middleware.js', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-m', middlewareFiles.en, middlewareFiles.jp]);
      serverReady(PORT, done);
    });
    test('should apply all middlewares', function (done) {
      request.get('/posts').expect('X-Hello', 'World').expect('X-Konnichiwa', 'Sekai', done);
    });
  });
  describe('db.json -m postbody-middleware.js', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-m', middlewareFiles.postbody]);
      serverReady(PORT, done);
    });
    test('should have post body in middleware', function (done) {
      request.post('/posts').send({
        name: 'test'
      }).expect('name', 'test', done);
    });
  });
  describe('db.json -d 1000', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-d', 1000]);
      serverReady(PORT, done);
    });
    test('should delay response', function (done) {
      var start = new Date();
      request.get('/posts').expect(200, function (err) {
        var end = new Date();
        done(end - start > 1000 ? err : new Error("Request wasn't delayed"));
      });
    });
  });
  describe('db.json -s ../../__fixtures__/public -S /some/path/snapshots', function () {
    var snapshotsDir = path.join(osTmpdir(), 'snapshots');
    var publicDir = '../../__fixtures__/public';
    beforeEach(function (done) {
      rimraf.sync(snapshotsDir);
      mkdirp.sync(snapshotsDir);
      child = cli([dbFile, '-s', publicDir, '-S', snapshotsDir]);
      serverReady(PORT, function () {
        child.stdin.write('s\n');
        setTimeout(done, 100);
      });
    });
    test('should serve ../../__fixtures__/public', function (done) {
      request.get('/').expect(/Hello/, done);
    });
    test('should save a snapshot in snapshots dir', function () {
      assert.strictEqual(fs.readdirSync(snapshotsDir).length, 1);
    });
  });
  describe('../../__fixtures__/seed.json --no-cors=true', function () {
    beforeEach(function (done) {
      child = cli(['../../__fixtures__/seed.js', '--no-cors=true']);
      serverReady(PORT, done);
    });
    test('should not send Access-Control-Allow-Origin headers', function (done) {
      var origin = 'http://example.com';
      request.get('/posts').set('Origin', origin).expect(200).end(function (err, res) {
        if (err) {
          done(err);
        }

        if ('access-control-allow-origin' in res.headers) {
          done(new Error('CORS headers were not excluded from response'));
        } else {
          done();
        }
      });
    });
  });
  describe('../../__fixtures__/seed.json --no-gzip=true', function () {
    beforeEach(function (done) {
      child = cli(['../../__fixtures__/seed.js', '--no-gzip=true']);
      serverReady(PORT, done);
    });
    test('should not set Content-Encoding to gzip', function (done) {
      request.get('/posts').expect(200).end(function (err, res) {
        if (err) {
          done(err);
        } else if ('content-encoding' in res.headers) {
          done(new Error('Content-Encoding is set to gzip'));
        } else {
          done();
        }
      });
    });
  });
  describe('--watch db.json -r routes.json', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-r', routesFile, '--watch']);
      serverReady(PORT, done);
    });
    test('should watch db file', function (done) {
      fs.writeFileSync(dbFile, JSON.stringify({
        foo: []
      }));
      setTimeout(function () {
        request.get('/foo').expect(200, done);
      }, 1000);
    });
    test('should watch routes file', function (done) {
      fs.writeFileSync(routesFile, JSON.stringify({
        '/api/*': '/$1'
      }));
      setTimeout(function () {
        request.get('/api/posts').expect(200, done);
      }, 1000);
    });
  });
  describe('non existent db.json', function () {
    beforeEach(function (done) {
      fs.unlinkSync(dbFile);
      child = cli([dbFile]);
      serverReady(PORT, done);
    });
    test("should create JSON file if it doesn't exist", function (done) {
      request.get('/posts').expect(200, done);
    });
  });
  describe('db.json with error', function () {
    beforeEach(function () {
      dbFile = tempWrite.sync(JSON.stringify({
        'a/b': []
      }), 'db-error.json');
    });
    test('should exit with an error', function (done) {
      child = cli([dbFile]);
      child.on('exit', function (code) {
        if (code === 1) {
          return done();
        }

        return done(new Error('should exit with error code'));
      });
    });
  });
});