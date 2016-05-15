var os = require('os')
var fs = require('fs')
var path = require('path')
var cp = require('child_process')
var assert = require('assert')
var supertest = require('supertest')
var rmrf = require('rimraf')
var serverReady = require('server-ready')
var pkg = require('../../package.json')

var PORT = 3100
var tmpDir = path.join(__dirname, '../../tmp')
var dbFile = path.join(tmpDir, 'db.json')
var routesFile = path.join(tmpDir, 'routes.json')

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

  beforeEach(function () {
    rmrf.sync(tmpDir)
    fs.mkdirSync(tmpDir)
    fs.writeFileSync(dbFile, JSON.stringify({
      posts: [
        { id: 1 },
        {_id: 2 }
      ]
    }))
    fs.writeFileSync(routesFile, JSON.stringify({
      '/blog/': '/'
    }))
    ++PORT
    request = supertest('http://localhost:' + PORT)
  })

  afterEach(function () {
    rmrf.sync(tmpDir)
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

  describe('http://jsonplaceholder.typicode.com/db', function () {

    beforeEach(function (done) {
      child = cli(['http://jsonplaceholder.typicode.com/db'])
      this.timeout(10000)
      serverReady(PORT, done)
    })

    it('should support URL file', function (done) {
      request.get('/posts').expect(200, done)
    })

  })

  describe('db.json -r routes.json -i _id --read-only', function () {

    beforeEach(function (done) {
      child = cli([dbFile, '-r', routesFile, '-i', '_id', '--read-only'])
      serverReady(PORT, done)
    })

    it('should use routes.json and _id as the identifier', function (done) {
      request.get('/blog/posts/2').expect(200, done)
    })

    it('should allow only GET requests', function (done) {
      request.post('/blog/posts').expect(403, done)
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

  describe('db.json -s fixtures/public -S ../../tmp', function () {

    var snapshotsDir = path.join(tmpDir, 'snapshots')
    var publicDir = 'fixtures/public'

    beforeEach(function (done) {
      fs.mkdirSync(snapshotsDir)
      child = cli([dbFile, '-s', publicDir, '-S', snapshotsDir])
      serverReady(PORT, function () {
        child.stdin.write('s\n')
        setTimeout(done, 100)
      })
    })

    it('should serve fixtures/public', function (done) {
      request.get('/').expect(/Hello/, done)
    })

    it('should save a snapshot in ../../tmp', function () {
      assert.equal(fs.readdirSync(snapshotsDir).length, 1)
    })

  })

  describe('db.json --no-cors=true', function () {

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
            return done(err)
          } else if ('access-control-allow-origin' in res.headers) {
            done(new Error('CORS headers were not excluded from response'))
          } else {
            done()
          }
        })
    })

  })

  describe('db.json --no-gzip=true', function () {

    beforeEach(function (done) {
      child = cli(['fixtures/seed.js', '--no-gzip=true'])
      serverReady(PORT, done)
    })

    it('should not set Content-Encoding to gzip', function (done) {
      var origin = 'http://example.com'

      request.get('/posts')
        .set('Origin', origin)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          } else if ('content-encoding' in res.headers) {
            done(new Error('Content-Encoding is set to gzip'))
          } else {
            done()
          }
        })
    })

  })

  describe('db.json --no-gzip=false', function () {

    beforeEach(function (done) {
      child = cli(['fixtures/seed.js', '--no-gzip=false'])
      serverReady(PORT, done)
    })

    it('should set Content-Encoding to gzip', function (done) {
      var origin = 'http://example.com'

      request.get('/posts')
        .set('Origin', origin)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err)
          } else if ('content-encoding' in res.headers) {
            done()
          } else {
            done(new Error('Content-Encoding is not set to gzip'))
          }
        })
    })

  })

  // FIXME test fails on OS X and maybe on Windows
  // But manually updating db.json works...
  if (os.platform() === 'linux') {
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
  }

})
