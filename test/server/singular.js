var request = require('supertest')
var jsonServer = require('../../src/server')

/* global beforeEach, describe, it */
describe('Server', function () {
  var server
  var router
  var db

  beforeEach(function () {
    db = {}

    db.user = {
      name: 'foo',
      email: 'foo@example.com'
    }

    server = jsonServer.create()
    router = jsonServer.router(db)
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:resource', function () {
    it('should respond with corresponding resource', function (done) {
      request(server)
        .get('/user')
        .expect(db.user)
        .expect(200, done)
    })
  })

  describe('POST /:resource', function () {
    it('should create resource', function (done) {
      var user = { name: 'bar' }
      request(server)
        .post('/user')
        .send(user)
        .expect(user)
        .expect(201, done)
    })
  })

  describe('PUT /:resource', function () {
    it('should update resource', function (done) {
      var user = { name: 'bar' }
      request(server)
        .put('/user')
        .send(user)
        .expect(user)
        .expect(200, done)
    })
  })

  describe('PATCH /:resource', function () {
    it('should update resource', function (done) {
      request(server)
        .patch('/user')
        .send({ name: 'bar' })
        .expect({ name: 'bar', email: 'foo@example.com' })
        .expect(200, done)
    })
  })
})
