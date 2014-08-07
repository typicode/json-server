var request = require('supertest')
var assert  = require('assert')
var low     = require('lowdb')
var server  = require('../src/server')

describe('Server', function() {

  beforeEach(function() {
    low.db = {}

    low.db.posts = [
      {id: 1, body: 'foo'},
      {id: 2, body: 'bar'}
    ]

    low.db.comments = [
      {id: 1, published: true,  postId: 1},
      {id: 2, published: false, postId: 1},
      {id: 3, published: false, postId: 2},
      {id: 4, published: false, postId: 2},
      {id: 5, published: false, postId: 2},
    ]
  })

  describe('GET /db', function() {
    it('should respond with json and full database', function(done) {
      request(server)
        .get('/db')
        .expect('Content-Type', /json/)
        .expect(low.db)
        .expect(200, done)
    })
  })

  describe('GET /:resource', function() {
    it('should respond with json and corresponding resources', function(done) {
      request(server)
        .get('/posts')
        .set('Origin', 'http://example.com')
        .expect('Content-Type', /json/)
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect('Access-Control-Allow-Origin', 'http://example.com')
        .expect(low.db.posts)
        .expect(200, done)
    })
  })

  describe('GET /:resource?attr=&attr=', function() {
    it('should respond with json and filter resources', function(done) {
      request(server)
        .get('/comments?postId=1&published=true')
        .expect('Content-Type', /json/)
        .expect([low.db.comments[0]])
        .expect(200, done)
    })
  })

  describe('GET /:resource?_start=&_end=', function() {
    it('should respond with sliced array', function(done) {
      request(server)
        .get('/comments?_start=1&_end=2')
        .expect('Content-Type', /json/)
        .expect(low.db.comments.slice(1, 2))
        .expect(200, done)
    })
  })

  describe('GET /:parent/:parentId/:resource', function() {
    it('should respond with json and corresponding nested resources', function(done) {
      request(server)
        .get('/posts/1/comments')
        .expect('Content-Type', /json/)
        .expect([
          low.db.comments[0],
          low.db.comments[1]
        ])
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id', function() {
    it('should respond with json and corresponding resource', function(done) {
      request(server)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect(low.db.posts[0])
        .expect(200, done)
    })
  })

  describe('POST /:resource', function() {
    it('should respond with json and create a resource', function(done) {
      request(server)
        .post('/posts')
        .send({body: 'foo', booleanValue: 'true', integerValue: '1'})
        .expect('Content-Type', /json/)
        .expect({id: 3, body: 'foo', booleanValue: true, integerValue: 1})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err)
          assert.equal(low.db.posts.length, 3)
          done()
        })
    })
  })

  describe('PUT /:resource/:id', function() {
    it('should respond with json and update resource', function(done) {
      request(server)
        .put('/posts/1')
        .send({id: 1, body: 'bar', booleanValue: 'true', integerValue: '1'})
        .expect('Content-Type', /json/)
        .expect({id: 1, body: 'bar', booleanValue: true, integerValue: 1})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err)
          assert.deepEqual(low.db.posts[0], {id: 1, body: 'bar', booleanValue: true, integerValue: 1})
          done()
        })
    })
  })

  describe('PATCH /:resource/:id', function() {
    it('should respond with json and update resource', function(done) {
      request(server)
        .patch('/posts/1')
        .send({body: 'bar'})
        .expect('Content-Type', /json/)
        .expect({id: 1, body: 'bar'})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err)
          assert.deepEqual(low.db.posts[0], {id: 1, body: 'bar'})
          done()
        })
    })
  })

  describe('DELETE /:resource/:id', function() {
    it('should respond with empty data, destroy resource and dependent resources', function(done) {
      request(server)
        .del('/posts/1')
        .expect(204)
        .end(function(err, res){
          if (err) return done(err)
          assert.equal(low.db.posts.length, 1)
          assert.equal(low.db.comments.length, 3)
          done()
        })
    })
  })

  describe('Static routes', function() {

    describe('GET /', function() {
      it('should respond with html', function(done) {
        request(server)
          .get('/')
          .expect('Content-Type', /html/)
          .expect(200, done);
      });
    });

    describe('GET /stylesheets/style.css', function() {
      it('should respond with css', function(done) {
        request(server)
          .get('/stylesheets/style.css')
          .expect('Content-Type', /css/)
          .expect(200, done);
      });
    });

  })
})