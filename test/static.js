var request = require('supertest')
var assert = require('assert')
var server = require('../src/server')

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

});