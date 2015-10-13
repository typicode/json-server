var assert = require('assert')
var _ = require('lodash')
var request = require('supertest')
var jsonServer = require('../../src/server')

/* global beforeEach, describe, it */

describe('Server', function () {

  var server
  var router
  var db

  beforeEach(function () {
    db = {}

    db.posts = [
      {id: 1, body: 'foo'},
      {id: 2, body: 'bar'}
    ]

    db.tags = [
      {id: 1, body: 'Technology'},
      {id: 2, body: 'Photography'},
      {id: 3, body: 'photo'}
    ]

    db.users = [
      {id: 1, username: 'Jim'},
      {id: 2, username: 'George'}
    ]

    db.comments = [
      {id: 1, body: 'foo', published: true, postId: 1, userId: 1},
      {id: 2, body: 'bar', published: false, postId: 1, userId: 2},
      {id: 3, body: 'baz', published: false, postId: 2, userId: 1},
      {id: 4, body: 'qux', published: true, postId: 2, userId: 2},
      {id: 5, body: 'quux', published: false, postId: 2, userId: 1}
    ]

    db.refs = [
      {id: 'abcd-1234', url: 'http://example.com', postId: 1, userId: 1}
    ]

    db.deep = [
      { a: { b: 1 } },
      { a: 1 }
    ]

    server = jsonServer.create()
    router = jsonServer.router(db)
    server.use(jsonServer.defaults())
    server.use(jsonServer.rewriter({
      '/api/': '/',
      '/blog/posts/:id/show': '/posts/:id'
    }))
    server.use(router)
  })

  describe('GET /db', function () {
    it('should respond with json and full database', function (done) {
      request(server)
        .get('/db')
        .expect('Content-Type', /json/)
        .expect(db)
        .expect(200, done)
    })
  })

  describe('GET /:resource', function () {
    it('should respond with json and corresponding resources', function (done) {
      request(server)
        .get('/posts')
        .set('Origin', 'http://example.com')
        .expect('Content-Type', /json/)
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect('Access-Control-Allow-Origin', 'http://example.com')
        .expect(db.posts)
        .expect(200, done)
    })

    it('should respond with 404 if resource is not found', function (done) {
      request(server)
        .get('/undefined')
        .expect(404, done)
    })
  })

  describe('GET /:resource?attr=&attr=', function () {
    it('should respond with json and filter resources', function (done) {
      request(server)
        .get('/comments?postId=1&published=true')
        .expect('Content-Type', /json/)
        .expect([db.comments[0]])
        .expect(200, done)
    })

    it('should support multiple filters', function (done) {
      request(server)
        .get('/comments?id=1&id=2')
        .expect('Content-Type', /json/)
        .expect([db.comments[0], db.comments[1]])
        .expect(200, done)
    })

    it('should support deep filter', function (done) {
      request(server)
        .get('/deep?a.b=1')
        .expect('Content-Type', /json/)
        .expect([db.deep[0]])
        .expect(200, done)
    })

    it('should ignore JSONP query parameters callback and _ ', function (done) {
      request(server)
        .get('/comments?callback=1&_=1')
        .expect('Content-Type', /text/)
        .expect(new RegExp(db.comments[0].body)) // JSONP returns text
        .expect(200, done)
    })

    it('should ignore unknown query parameters', function (done) {
      request(server)
        .get('/comments?foo=1&bar=2')
        .expect('Content-Type', /json/)
        .expect(db.comments)
        .expect(200, done)
    })
  })

  describe('GET /:resource?q=', function () {
    it('should respond with json and make a full-text search', function (done) {
      request(server)
        .get('/tags?q=pho')
        .expect('Content-Type', /json/)
        .expect([db.tags[1], db.tags[2]])
        .expect(200, done)
    })

    it('should respond with json and make a deep full-text search', function (done) {
      request(server)
        .get('/deep?q=1')
        .expect('Content-Type', /json/)
        .expect(db.deep)
        .expect(200, done)
    })

    it('should return an empty array when nothing is matched', function (done) {
      request(server)
        .get('/tags?q=nope')
        .expect('Content-Type', /json/)
        .expect([])
        .expect(200, done)
    })

    it('should support other query parameters', function (done) {
      request(server)
        .get('/comments?q=qu&published=true')
        .expect('Content-Type', /json/)
        .expect([db.comments[3]])
        .expect(200, done)
    })
  })

  describe('GET /:resource?_end=', function () {
    it('should respond with a sliced array', function (done) {
      request(server)
        .get('/comments?_end=2')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(0, 2))
        .expect(200, done)
    })
  })

  describe('GET /:resource?_sort=', function () {
    it('should respond with json and sort on a field', function (done) {
      request(server)
        .get('/tags?_sort=body')
        .expect('Content-Type', /json/)
        .expect([db.tags[1], db.tags[0], db.tags[2]])
        .expect(200, done)
    })

    it('should reverse sorting with _order=DESC', function (done) {
      request(server)
        .get('/tags?_sort=body&_order=DESC')
        .expect('Content-Type', /json/)
        .expect([db.tags[2], db.tags[0], db.tags[1]])
        .expect(200, done)
    })

    it('should sort on numerical field', function (done) {
      request(server)
        .get('/posts?_sort=id&_order=DESC')
        .expect('Content-Type', /json/)
        .expect(db.posts.reverse())
        .expect(200, done)
    })
  })

  describe('GET /:resource?_start=&_end=', function () {
    it('should respond with a sliced array', function (done) {
      request(server)
        .get('/comments?_start=1&_end=2')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(1, 2))
        .expect(200, done)
    })
  })

  describe('GET /:resource?_start=&_limit=', function () {
    it('should respond with a limited array', function (done) {
      request(server)
        .get('/comments?_start=1&_limit=1')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(1, 2))
        .expect(200, done)
    })
  })

  describe('GET /:resource?attr>=&attr<=', function () {
    it('should respond with a limited array', function (done) {
      request(server)
        .get('/comments?id_gte=2&id_lte=3')
        .expect('Content-Type', /json/)
        .expect(db.comments.slice(1, 3))
        .expect(200, done)
    })
  })

  describe('GET /:parent/:parentId/:resource', function () {
    it('should respond with json and corresponding nested resources', function (done) {
      request(server)
        .get('/posts/1/comments')
        .expect('Content-Type', /json/)
        .expect([
          db.comments[0],
          db.comments[1]
        ])
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id', function () {
    it('should respond with json and corresponding resource', function (done) {
      request(server)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect(db.posts[0])
        .expect(200, done)
    })

    it('should support string id, respond with json and corresponding resource', function (done) {
      request(server)
        .get('/refs/abcd-1234')
        .expect('Content-Type', /json/)
        .expect(db.refs[0])
        .expect(200, done)
    })

    it('should respond with 404 if resource is not found', function (done) {
      request(server)
        .get('/posts/9001')
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('GET /:resource?_embed=', function () {
    it('should respond with corresponding resources and embedded resources', function (done) {
      var posts = _.cloneDeep(db.posts)
      posts[0].comments = [db.comments[0], db.comments[1]]
      posts[1].comments = [db.comments[2], db.comments[3], db.comments[4]]
      request(server)
        .get('/posts?_embed=comments')
        .expect('Content-Type', /json/)
        .expect(posts)
        .expect(200, done)
    })
  })

  describe('GET /:resource?_embed&_embed=', function () {
    it('should respond with corresponding resources and embedded resources', function (done) {
      var posts = _.cloneDeep(db.posts)
      posts[0].comments = [db.comments[0], db.comments[1]]
      posts[0].refs = [db.refs[0]]
      posts[1].comments = [db.comments[2], db.comments[3], db.comments[4]]
      posts[1].refs = []
      request(server)
        .get('/posts?_embed=comments&_embed=refs')
        .expect('Content-Type', /json/)
        .expect(posts)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_embed=', function () {
    it('should respond with corresponding resources and embedded resources', function (done) {
      var posts = db.posts[0]
      posts.comments = [db.comments[0], db.comments[1]]
      request(server)
        .get('/posts/1?_embed=comments')
        .expect('Content-Type', /json/)
        .expect(posts)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_embed=&_embed=', function () {
    it('should respond with corresponding resource and embedded resources', function (done) {
      var posts = db.posts[0]
      posts.comments = [db.comments[0], db.comments[1]]
      posts.refs = [db.refs[0]]
      request(server)
        .get('/posts/1?_embed=comments&_embed=refs')
        .expect('Content-Type', /json/)
        .expect(posts)
        .expect(200, done)
    })
  })

  describe('GET /:resource?_expand=', function () {
    it('should respond with corresponding resource and expanded inner resources', function (done) {
      var refs = _.cloneDeep(db.refs)
      refs[0].post = db.posts[0]
      request(server)
        .get('/refs?_expand=post')
        .expect('Content-Type', /json/)
        .expect(refs)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_expand=', function () {
    it('should respond with corresponding resource and expanded inner resources', function (done) {
      var comments = db.comments[0]
      comments.post = db.posts[0]
      request(server)
        .get('/comments/1?_expand=post')
        .expect('Content-Type', /json/)
        .expect(comments)
        .expect(200, done)
    })
  })

  describe('GET /:resource?_expand=&_expand', function () {
    it('should respond with corresponding resource and expanded inner resources', function (done) {
      var refs = _.cloneDeep(db.refs)
      refs[0].post = db.posts[0]
      refs[0].user = db.users[0]
      request(server)
        .get('/refs?_expand=post&_expand=user')
        .expect('Content-Type', /json/)
        .expect(refs)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_expand=&_expand=', function () {
    it('should respond with corresponding resource and expanded inner resources', function (done) {
      var comments = db.comments[0]
      comments.post = db.posts[0]
      comments.user = db.users[0]
      request(server)
        .get('/comments/1?_expand=post&_expand=user')
        .expect('Content-Type', /json/)
        .expect(comments)
        .expect(200, done)
    })
  })

  describe('POST /:resource', function () {
    it('should respond with json, create a resource and increment id',
      function (done) {
        request(server)
          .post('/posts')
          .send({body: 'foo', booleanValue: 'true', integerValue: '1'})
          .expect('Content-Type', /json/)
          .expect({id: 3, body: 'foo', booleanValue: true, integerValue: 1})
          .expect(201)
          .end(function (err, res) {
            if (err) return done(err)
            assert.equal(db.posts.length, 3)
            done()
          })
      })

    it('should respond with json, create a resource and generate string id',
      function (done) {
        request(server)
          .post('/refs')
          .send({url: 'http://foo.com', postId: '1'})
          .expect('Content-Type', /json/)
          .expect(201)
          .end(function (err, res) {
            if (err) return done(err)
            assert.equal(db.refs.length, 2)
            done()
          })
      })
  })

  describe('PUT /:resource/:id', function () {
    it('should respond with json and replace resource', function (done) {
      var post = {id: 1, booleanValue: true, integerValue: 1}
      request(server)
        .put('/posts/1')
        // body property omitted to test that the resource is replaced
        .send({id: 1, booleanValue: 'true', integerValue: '1'})
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          // assert it was created in database too
          assert.deepEqual(db.posts[0], post)
          done()
        })
    })

    it('should respond with 404 if resource is not found', function (done) {
      request(server)
        .put('/posts/9001')
        .send({id: 1, body: 'bar', booleanValue: 'true', integerValue: '1'})
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('PATCH /:resource/:id', function () {
    it('should respond with json and update resource', function (done) {
      request(server)
        .patch('/posts/1')
        .send({body: 'bar'})
        .expect('Content-Type', /json/)
        .expect({id: 1, body: 'bar'})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          // assert it was created in database too
          assert.deepEqual(db.posts[0], {id: 1, body: 'bar'})
          done()
        })
    })

    it('should respond with 404 if resource is not found', function (done) {
      request(server)
        .patch('/posts/9001')
        .send({body: 'bar'})
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('DELETE /:resource/:id', function () {
    it('should respond with empty data, destroy resource and dependent resources', function (done) {
      request(server)
        .del('/posts/1')
        .expect({})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          assert.equal(db.posts.length, 1)
          assert.equal(db.comments.length, 3)
          done()
        })
    })

    it('should respond with 404 if resource is not found', function (done) {
      request(server)
        .del('/posts/9001')
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('Static routes', function () {

    describe('GET /', function () {
      it('should respond with html', function (done) {
        request(server)
          .get('/')
          .expect(/You're successfully running JSON Server/)
          .expect(200, done)
      })
    })

    describe('GET /stylesheets/style.css', function () {
      it('should respond with css', function (done) {
        request(server)
          .get('/stylesheets/style.css')
          .expect('Content-Type', /css/)
          .expect(200, done)
      })
    })

  })

  describe('Database #object', function () {
    it('should be accessible', function () {
      assert(router.db.object)
    })
  })

  describe('Responses', function () {

    it('should have no cache headers (for IE)', function (done) {
      request(server)
        .get('/db')
        .expect('Cache-Control', 'no-cache')
        .expect('Pragma', 'no-cache')
        .expect('Expires', '-1')
        .end(done)
    })

  })

  describe('Rewriter', function () {

    it('should rewrite using prefix', function (done) {
      request(server)
        .get('/api/posts/1')
        .expect(db.posts[0])
        .end(done)
    })

    it('should rewrite using params', function (done) {
      request(server)
        .get('/blog/posts/1/show')
        .expect(db.posts[0])
        .end(done)
    })

  })

  describe('router.render', function (done) {

    beforeEach(function () {
      router.render = function (req, res) {
        res.jsonp({
          data: res.locals.data
        })
      }
    })

    it('should be possible to wrap response', function (done) {
      request(server)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect({ data: db.posts[0] })
        .expect(200, done)
    })

  })

  describe('router.db._.id', function (done) {

    beforeEach(function () {
      router.db.object = {
        posts: [
          { _id: 1 }
        ]
      }

      router.db._.id = '_id'
    })

    it('should be possible to override id property', function (done) {
      request(server)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect(router.db.object.posts[0])
        .expect(200, done)
    })

  })
})
