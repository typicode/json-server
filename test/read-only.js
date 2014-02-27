var request = require('supertest'),
    assert = require('assert'),
    server = require('../server'),
    fixture = require('./fixture'),
    db,
    app;

describe('Read only routes', function() {

  beforeEach(function() {
    db = fixture();
    app = server.createApp(db, { readOnly: true });
  });

  describe('GET /:resource', function() {
    it('should respond with json and resources and corresponding resources', function(done) {
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
        .expect([db.comments[0], db.comments[1]])
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

  describe('GET slice', function () {
    describe('GET 1 item /:resource/slice/:from/:to', function() {
      it('should respond with array with 1 item [:from, :to]', function(done) {
        request(app)
          .get('/posts/slice/0/1')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert(Array.isArray(res.body), 'returns an array');
            assert.equal(res.body.length, 1, 'returns single item');
            assert.equal(res.body[0].id, db.posts[0].id, 'returns first item');
            done();
          });
      });
    });

    describe('GET 1 last item /:resource/slice/:from/:to', function() {
      it('should respond with last item', function(done) {
        request(app)
          .get('/posts/slice/1/2')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert(Array.isArray(res.body), 'returns an array');
            assert.equal(res.body.length, 1, 'returns single item');
            assert.equal(res.body[0].id, db.posts[1].id, 'returns first item');
            done();
          });
      });
    });

    describe('GET items /:resource/slice/:from/:to', function() {
      it('should respond with array with all items [:from, :to]', function(done) {
        request(app)
          .get('/posts/slice/0/' + db.posts.length)
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert(Array.isArray(res.body), 'returns an array');
            assert.equal(res.body.length, db.posts.length, 'returns all items');
            assert.equal(res.body[0].id, db.posts[0].id, 'returns first item');
            done();
          });
      });
    });

    describe('GET no items /:resource/slice/:from/:to invalid slice', function() {
      it('should respond with empty array', function(done) {
        request(app)
          .get('/posts/slice/1000/2000')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            assert(Array.isArray(res.body), 'returns an array');
            assert.equal(res.body.length, 0, 'empty array');
            done();
          });
      });
    });

    describe('GET /:resource/slice/:from/:to invalid slice indices', function() {
      it('should respond with server error', function(done) {
        request(app)
          .get('/posts/slice/1000/100')
          .expect(500, done);
      });
    });
  });

  describe('POST /:resource', function() {
    it('should respond with fake json and not create a resource', function(done) {
      request(app)
        .post('/posts')
        .send({body: '...'})
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          assert(res.body.hasOwnProperty('id'));
          assert.equal(res.body.body, '...');
          assert.equal(db.posts.length, 2);
          done()
        });
    });
  });

  describe('PUT /:resource/:id', function() {
    it('should respond with fake json and not update resource', function(done) {
      request(app)
        .put('/posts/1')
        .send({id: 999, body: '...'})
        .expect('Content-Type', /json/)
        .expect({id: 999, body: '...'})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          // Checking that first post wasn't updated
          assert.deepEqual(db.posts[0], {id: 1, body: 'foo'});
          done()
        });
    });
  });

  describe('PATCH /:resource/:id', function() {
    it('should respond with fake json and not update resource', function(done) {
      request(app)
        .patch('/posts/1')
        .send({body: '...'})
        .expect('Content-Type', /json/)
        .expect({id: 1, body: '...'})
        .expect(200)
        .end(function(err, res){
          if (err) return done(err);
          // Checking that first post wasn't updated
          assert.deepEqual(db.posts[0], {id: 1, body: 'foo'});
          done()
        });
    });
  });

  describe('DELETE /:resource/:id', function() {
    it('should respond with empty data and not destroy resource', function(done) {
      request(app)
        .del('/posts/1')
        .expect(204)
        .end(function(err, res){
          if (err) return done(err);
          assert.equal(db.posts.length, 2);
          assert.equal(db.comments.length, 4);
          done()
        });
    });
  });

  describe('OPTIONS /:resource/:id', function() {
    it('should respond with empty data and not destroy resource', function(done) {
      request(app)
        .options('/posts/1')
        .expect(204, done);
    });
  });
});
