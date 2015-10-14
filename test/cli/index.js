var os = require('os')
var fs = require('fs')
var path = require('path')
var cp = require('child_process')
var assert = require('assert')
var request = require('supertest')
var rmrf = require('rimraf')
var serverReady = require('server-ready')
var pkg = require('../../package.json')

var PORT = 3100

request = request('http://localhost:' + PORT)

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

  beforeEach(function () {
    rmrf.sync(tmpDir)
    fs.mkdirSync(tmpDir)
    fs.writeFileSync(dbFile, JSON.stringify({ posts: [{ 'id': 1, '_id': 2 }] }))
    fs.writeFileSync(routesFile, JSON.stringify({ '/blog/': '/' }))
  })

  afterEach(function (done) {
    rmrf.sync(tmpDir)
    child.kill()
    setTimeout(done, 1000)
  })

  describe('db.json', function () {

    beforeEach(function (done) {
      child = cli([dbFile])
      serverReady(PORT, done)
    })

    it('should support JSON dbFile', function (done) {
      request.get('/posts').expect(200, done)
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

  describe('db.json -r routes.json -i _id', function () {

    beforeEach(function (done) {
      child = cli([dbFile, '-r', routesFile, '-i', '_id'])
      serverReady(PORT, done)
    })

    it('should use routes.json and _id as the identifier', function (done) {
      request.get('/blog/posts/2').expect(200, done)
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
