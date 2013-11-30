var request = require('supertest'),
    assert = require('assert'),
    server = require('../server'),
    routes = require('../routes/read-write'),
    fixture = require('./fixture'),
    db,
    app;

describe('Read write routes', function() {

  beforeEach(function() {
    db = fixture();
    app = server.createApp(db);
  });

  describe('GET /:resource', function() {
    it('should respond with json and corresponding resources', function(done) {
      request(app)
        .get('/posts')
        .expect('Content-Type', /json/)
        .expect(db.posts)
        .expect(200, done);
    });
  });

  describe('GET /:resource?attr=&attr=', function() {
    it('should respond with json and filter resources', function(done) {
      request(app)
        .get('/comments?postId=1&published=true')
        .expect('Content-Type', /json/)
        .expect([db.comments[0]])
        .expect(200, done);
    });
  });

  describe('GET /:parent/:parentId/:resource', function() {
    it('should respond with json and corresponding nested resources', function(done) {
      request(app)
        .get('/posts/1/comments')
        .expect('Content-Type', /json/)
        .expect([
          db.comments[0],
          db.comments[1]
        ])
        .expect(200, done);
    });
  });

  describe('GET /:resource/:id', function() {
    it('should respond with json and corresponding resource', function(done) {
      request(app)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect(db.posts[0])
        .expect(200, done);
    });
  });

  describe('GET /db', function() {
    it('should respond with json and full database', function(done) {
      request(app)
        .get('/db')
        .expect('Content-Type', /json/)
        .expect(db)
        .expect(200, done);
    });
  });

  describe('POST /:resource', function() {
    it('should respond with json and create a resource', function(done) {
      request(app)
        .post('/posts')
        .send({body: 'foo'})
        .expect('Content-Type', /json/)
        .expect({id: 3, body: 'foo'})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(db.posts.length, 3);
          done();
        });
    });
  });

  describe('PUT /:resource/:id', function() {
    it('should respond with json and update resource', function(done) {
      request(app)
        .put('/posts/1')
        .send({id: 1, body: 'foo'})
        .expect('Content-Type', /json/)
        .expect({id: 1, body: 'foo'})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          assert.deepEqual(db.posts[0], {id: 1, body: 'foo'});
          done();
        });
    });
  });

  describe('PATCH /:resource/:id', function() {
    it('should respond with json and update resource', function(done) {
      request(app)
        .patch('/posts/1')
        .send({body: 'bar'})
        .expect('Content-Type', /json/)
        .expect({id: 1, body: 'bar'})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          assert.deepEqual(db.posts[0], {id: 1, body: 'bar'});
          done();
        });
    });
  });

  describe('DELETE /:resource/:id', function() {
    it('should respond with empty data, destroy resource and dependent resources', function(done) {
      request(app)
        .del('/posts/1')
        .expect(204)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(db.posts.length, 1);
          assert.equal(db.comments.length, 2);
          done();
        });
    });
  });
});