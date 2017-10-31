const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const assert = require('assert')
const supertest = require('supertest')
const osTmpdir = require('os-tmpdir')
const tempWrite = require('temp-write')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const serverReady = require('server-ready')

let PORT = 3100

const middlewareFiles = {
  en: './fixtures/middlewares/en.js',
  jp: './fixtures/middlewares/jp.js',
  postbody: './fixtures/middlewares/postbody.js'
}

const bin = path.join(__dirname, '../../lib/cli/bin')

function cli(args) {
  return cp.spawn('node', ['--', bin, '-p', PORT].concat(args), {
    cwd: __dirname,
    stdio: ['pipe', process.stdout, process.stderr]
  })
}

describe('cli', () => {
  let child
  let request
  let dbFile
  let routesFile

  beforeEach(() => {
    dbFile = tempWrite.sync(
      JSON.stringify({
        posts: [{ id: 1 }, { _id: 2 }],
        comments: [{ id: 1, post_id: 1 }]
      }),
      'db.json'
    )

    routesFile = tempWrite.sync(
      JSON.stringify({ '/blog/*': '/$1' }),
      'routes.json'
    )

    ++PORT
    request = supertest(`http://localhost:${PORT}`)
  })

  afterEach(() => {
    child.kill('SIGKILL')
  })

  describe('db.json', () => {
    beforeEach(done => {
      child = cli([dbFile])
      serverReady(PORT, done)
    })

    it('should support JSON file', done => {
      request.get('/posts').expect(200, done)
    })

    it('should send CORS headers', done => {
      const origin = 'http://example.com'

      request
        .get('/posts')
        .set('Origin', origin)
        .expect('access-control-allow-origin', origin)
        .expect(200, done)
    })

    it('should update JSON file', done => {
      request
        .post('/posts')
        .send({ title: 'hello' })
        .end(() => {
          setTimeout(() => {
            const str = fs.readFileSync(dbFile, 'utf8')
            assert(str.indexOf('hello') !== -1)
            done()
          }, 1000)
        })
    })
  })

  describe('seed.js', () => {
    beforeEach(done => {
      child = cli(['fixtures/seed.js'])
      serverReady(PORT, done)
    })

    it('should support JS file', done => {
      request.get('/posts').expect(200, done)
    })
  })

  describe('remote db', () => {
    beforeEach(done => {
      child = cli(['https://jsonplaceholder.typicode.com/db'])
      serverReady(PORT, done)
    })

    it('should support URL file', done => {
      request.get('/posts').expect(200, done)
    })
  })

  describe('db.json -r routes.json -m middleware.js -i _id --foreignKeySuffix _id --read-only', () => {
    beforeEach(done => {
      child = cli([
        dbFile,
        '-r',
        routesFile,
        '-m',
        middlewareFiles.en,
        '-i',
        '_id',
        '--read-only',
        '--foreignKeySuffix',
        '_id'
      ])
      serverReady(PORT, done)
    })

    it('should use routes.json and _id as the identifier', done => {
      request.get('/blog/posts/2').expect(200, done)
    })

    it('should use _id as foreignKeySuffix', async () => {
      const response = await request.get('/posts/1/comments')
      assert.equal(response.body.length, 1)
    })

    it('should apply middlewares', done => {
      request.get('/blog/posts/2').expect('X-Hello', 'World', done)
    })

    it('should allow only GET requests', done => {
      request.post('/blog/posts').expect(403, done)
    })
  })

  describe('db.json -m first-middleware.js second-middleware.js', () => {
    beforeEach(done => {
      child = cli([dbFile, '-m', middlewareFiles.en, middlewareFiles.jp])
      serverReady(PORT, done)
    })

    it('should apply all middlewares', done => {
      request
        .get('/posts')
        .expect('X-Hello', 'World')
        .expect('X-Konnichiwa', 'Sekai', done)
    })
  })

  describe('db.json -m postbody-middleware.js', () => {
    beforeEach(done => {
      child = cli([dbFile, '-m', middlewareFiles.postbody])
      serverReady(PORT, done)
    })

    it('should have post body in middleware', done => {
      request
        .post('/posts')
        .send({ name: 'test' })
        .expect('name', 'test', done)
    })
  })

  describe('db.json -d 1000', () => {
    beforeEach(done => {
      child = cli([dbFile, '-d', 1000])
      serverReady(PORT, done)
    })

    it('should delay response', done => {
      const start = new Date()
      request.get('/posts').expect(200, function(err) {
        const end = new Date()
        done(end - start > 1000 ? err : new Error("Request wasn't delayed"))
      })
    })
  })

  describe('db.json -s fixtures/public -S /some/path/snapshots', () => {
    const snapshotsDir = path.join(osTmpdir(), 'snapshots')
    const publicDir = 'fixtures/public'

    beforeEach(done => {
      rimraf.sync(snapshotsDir)
      mkdirp.sync(snapshotsDir)

      child = cli([dbFile, '-s', publicDir, '-S', snapshotsDir])
      serverReady(PORT, () => {
        child.stdin.write('s\n')
        setTimeout(done, 100)
      })
    })

    it('should serve fixtures/public', done => {
      request.get('/').expect(/Hello/, done)
    })

    it('should save a snapshot in snapshots dir', () => {
      assert.equal(fs.readdirSync(snapshotsDir).length, 1)
    })
  })

  describe('fixtures/seed.json --no-cors=true', () => {
    beforeEach(done => {
      child = cli(['fixtures/seed.js', '--no-cors=true'])
      serverReady(PORT, done)
    })

    it('should not send Access-Control-Allow-Origin headers', done => {
      const origin = 'http://example.com'

      request
        .get('/posts')
        .set('Origin', origin)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err)
          }
          if ('access-control-allow-origin' in res.headers) {
            done(new Error('CORS headers were not excluded from response'))
          } else {
            done()
          }
        })
    })
  })

  describe('fixtures/seed.json --no-gzip=true', () => {
    beforeEach(done => {
      child = cli(['fixtures/seed.js', '--no-gzip=true'])
      serverReady(PORT, done)
    })

    it('should not set Content-Encoding to gzip', done => {
      request
        .get('/posts')
        .expect(200)
        .end(function(err, res) {
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

  describe('--watch db.json -r routes.json', () => {
    beforeEach(done => {
      child = cli([dbFile, '-r', routesFile, '--watch'])
      serverReady(PORT, done)
    })

    it('should watch db file', done => {
      fs.writeFileSync(dbFile, JSON.stringify({ foo: [] }))
      setTimeout(() => {
        request.get('/foo').expect(200, done)
      }, 1000)
    })

    it('should watch routes file', done => {
      fs.writeFileSync(routesFile, JSON.stringify({ '/api/*': '/$1' }))
      setTimeout(() => {
        request.get('/api/posts').expect(200, done)
      }, 1000)
    })
  })

  describe('non existent db.json', () => {
    beforeEach(done => {
      fs.unlinkSync(dbFile)
      child = cli([dbFile])
      serverReady(PORT, done)
    })

    it("should create JSON file if it doesn't exist", done => {
      request.get('/posts').expect(200, done)
    })
  })

  describe('db.json with error', () => {
    beforeEach(() => {
      dbFile = tempWrite.sync(JSON.stringify({ 'a/b': [] }), 'db-error.json')
    })

    it('should exit with an error', done => {
      child = cli([dbFile])
      child.on('exit', code => {
        if (code === 1) {
          return done()
        }
        return done(new Error('should exit with error code'))
      })
    })
  })
})
