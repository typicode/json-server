var request = require('supertest'),
    assert = require('assert'),
    server = require('../server'),
    routes = require('../routes/read-write'),
    app;

describe('Static routes', function() {

  beforeEach(function() {
    app = server.createApp({}, routes);
  });

  describe('GET /', function() {
    it('should respond with html', function(done) {
      request(app)
        .get('/')
        .expect('Content-Type', /html/)
        .expect(200, done);
    });
  });

  describe('GET /stylesheets/style.css', function() {
    it('should respond with css', function(done) {
      request(app)
        .get('/stylesheets/style.css')
        .expect('Content-Type', /css/)
        .expect(200, done);
    });
  });

});