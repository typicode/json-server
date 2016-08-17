var fs = require('fs')
var path = require('path')
var cp = require('child_process')
var assert = require('assert')
var supertest = require('supertest')
var osTmpdir = require('os-tmpdir')
var tempWrite = require('temp-write')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var express = require('express')
var serverReady = require('server-ready')
var pkg = require('../../package.json')

var PORT = 3100

function cli (args) {
  var bin = path.join(__dirname, '../..', pkg.bin)
  return cp.spawn('node', [bin, '-p', PORT].concat(args), {
    cwd: __dirname,
    stdio: ['pipe', process.stdout, process.stderr]
  })
}

/* global beforeEach, afterEach, describe, it */

describe('cli', function () {
  var child
  var request
  var dbFile
  var routesFile
  var middlewareFiles = {
    en: './fixtures/middlewares/en.js',
    jp: './fixtures/middlewares/jp.js'
  }

  beforeEach(function () {
    dbFile = tempWrite.sync(JSON.stringify({
      posts: [
        { id: 1 },
        { _id: 2 }
      ]
    }), 'db.json')

    routesFile = tempWrite.sync(JSON.stringify({
      '/blog/': '/'
    }), 'routes.json')

    ++PORT
    request = supertest('http://localhost:' + PORT)
  })

  afterEach(function () {
    child.kill()
  })

  describe('db.json', function () {
    beforeEach(function (done) {
      child = cli([dbFile])
      serverReady(PORT, done)
    })

    it('should support JSON file', function (done) {
      request.get('/posts').expect(200, done)
    })

    it('should send CORS headers', function (done) {
      var origin = 'http://example.com'

      request.get('/posts')
        .set('Origin', origin)
        .expect('access-control-allow-origin', origin)
        .expect(200, done)
    })

    it('should update JSON file', function (done) {
      request.post('/posts')
        .send({ title: 'hello' })
        .end(function () {
          setTimeout(function () {
            var str = fs.readFileSync(dbFile, 'utf8')
            assert(str.indexOf('hello') !== -1)
            done()
          }, 1000)
        })
    })
  })

  describe('seed.js', function () {
    beforeEach(function (done) {
      child = cli(['fixtures/seed.js'])
      serverReady(PORT, done)
    })

    it('should support JS file', function (done) {
      request.get('/posts').expect(200, done)
    })
  })

  describe('http://localhost:8080/db', function () {
    beforeEach(function (done) {
      var fakeServer = express()
      fakeServer.get('/db', function (req, res) {
        res.jsonp({ posts: [] })
      })
      fakeServer.listen(8080, function () {
        child = cli(['http://localhost:8080/db'])
        serverReady(PORT, done)
      })
    })

    it('should support URL file', function (done) {
      request.get('/posts').expect(200, done)
    })
  })

  describe('db.json -r routes.json -m middleware.js -i _id --read-only', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-r', routesFile, '-m', middlewareFiles.en, '-i', '_id', '--read-only'])
      serverReady(PORT, done)
    })

    it('should use routes.json and _id as the identifier', function (done) {
      request.get('/blog/posts/2').expect(200, done)
    })

    it('should apply middlewares', function (done) {
      request.get('/blog/posts/2').expect('X-Hello', 'World', done)
    })

    it('should allow only GET requests', function (done) {
      request.post('/blog/posts').expect(403, done)
    })
  })

  describe('db.json -m first-middleware.js second-middleware.js', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-m', middlewareFiles.en, middlewareFiles.jp])
      serverReady(PORT, done)
    })

    it('should apply all middlewares', function (done) {
      request.get('/posts')
        .expect('X-Hello', 'World')
        .expect('X-Konnichiwa', 'Sekai', done)
    })
  })

  describe('db.json -d 1000', function () {
    beforeEach(function (done) {
      child = cli([dbFile, '-d', 1000])
      serverReady(PORT, done)
    })

    it('should delay response', function (done) {
      var start = new Date()
      request.get('/posts').expect(200, function (err) {
        var end = new Date()
        done(end - start > 1000 ? err : new Error('Request wasn\'t delayed'))
      })
    })
  })

  describe('db.json -s fixtures/public -S /some/path/snapshots', function () {
    var snapshotsDir = path.join(osTmpdir(), 'snapshots')
    var publicDir = 'fixtures/public'

    beforeEach(function (done) {
      rimraf.sync(snapshotsDir)
      mkdirp.sync(snapshotsDir)

      child = cli([dbFile, '-s', publicDir, '-S', snapshotsDir])
      serverReady(PORT, function () {
        child.stdin.write('s\n')
        setTimeout(done, 100)
      })
    })

    it('should serve fixtures/public', function (done) {
      request.get('/').expect(/Hello/, done)
    })

    it('should save a snapshot in snapshots dir', function () {
      assert.equal(fs.readdirSync(snapshotsDir).length, 1)
    })
  })

  describe('fixtures/seed.json --no-cors=true', function () {
    beforeEach(function (done) {
      child = cli(['fixtures/seed.js', '--no-cors=true'])
      serverReady(PORT, done)
    })

    it('should not send Access-Control-Allow-Origin headers', function (done) {
      var origin = 'http://example.com'

      request.get('/posts')
        .set('Origin', origin)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err)
          } if ('access-control-allow-origin' in res.headers) {
            done(new Error('CORS headers were not excluded from response'))
          } else {
            done()
          }
        })
    })
  })

  describe('fixtures/seed.json --no-gzip=true', function () {
    beforeEach(function (done) {
      child = cli(['fixtures/seed.js', '--no-gzip=true'])
      serverReady(PORT, done)
    })

    it('should not set Content-Encoding to gzip', function (done) {
      request.get('/posts')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err)
          } else if ('content-encoding' in res.headers) {
            done(new Error('Content-Encoding is set to gzip'))
          } else {
            done()
          }
        })
    })
  })

  describe('--watch db.json -r routes.json', function () {
    beforeEach(function (done) {
      child = cli(['--watch', dbFile, '-r', routesFile])
      serverReady(PORT, done)
    })

    it('should watch db file', function (done) {
      fs.writeFileSync(dbFile, JSON.stringify({ foo: [] }))
      setTimeout(function () {
        request.get('/foo').expect(200, done)
      }, 1000)
    })

    it('should watch routes file', function (done) {
      // Can be very slow
      this.timeout(10000)
      fs.writeFileSync(routesFile, JSON.stringify({ '/api/': '/' }))
      setTimeout(function () {
        request.get('/api/posts').expect(200, done)
      }, 9000)
    })
  })

  describe('db.json --config some-config.json', function (done) {
    beforeEach(function (done) {
      child = cli([dbFile, '--config', 'fixtures/config.json'])
      serverReady(PORT, done)
    })

    it('should apply all middlewares', function (done) {
      request.get('/posts')
        .expect('X-Hello', 'World')
        .expect('X-Konnichiwa', 'Sekai', done)
    })
  })
})
