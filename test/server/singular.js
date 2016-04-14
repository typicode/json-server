var assert = require('assert')
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

    db.city = {
      'name': 'Jeogiwe Dal',
      'lat': -28.12785,
      'lon': -145.96895,
      'geohash': 344516337195371
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

    it('should respond with json, create a resource and geohash',
      function (done) {
        var city = {
          'name': 'Hovel',
          'lat': 10,
          'lon': 10,
          'geohash': 3386360489042046
        }
        request(server)
          .post('/city')
          .send({'name': 'Hovel', 'lat': 10, 'lon': 10})
          .expect('Content-Type', /json/)
          .expect(city)
          .expect(201)
          .end(function (err, res) {
            if (err) return done(err)
            assert.deepEqual(db.city, city)
            done()
          })
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

    it('should respond with json, replace lat and recalculate geohash',
      function (done) {
        var city = {
          'name': 'Jeogiwe Dal',
          'lat': -20.0,
          'lon': -145.96895
        }
        var updatedCity = {
          'name': 'Jeogiwe Dal',
          'lat': -20.0,
          'lon': -145.96895,
          'geohash': 396187746229295
        }

        request(server)
          .put('/city')
          .send(city)
          .expect('Content-Type', /json/)
          .expect(updatedCity)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err)
            // assert it was created in database too
            assert.deepEqual(db.city, updatedCity)
            done()
          })
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

    it('should respond with json and update property and recalculate geohash',
      function (done) {
        var updatedCity = {
          'name': 'Jeogiwe Dal',
          'lat': -20.0,
          'lon': -145.96895,
          'geohash': 396187746229295
        }

        request(server)
          .patch('/city')
          .send({lat: -20.0})
          .expect('Content-Type', /json/)
          .expect(updatedCity)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err)
            // assert it was created in database too
            assert.deepEqual(db.city, updatedCity)
            done()
          })
      })
  })

})
