"use strict";

var request = require('supertest');

var jsonServer = require('../../src/server');

describe('Server', function () {
  var server;
  var router;
  var db;
  beforeEach(function () {
    db = {};
    db.user = {
      name: 'foo',
      email: 'foo@example.com'
    };
    server = jsonServer.create();
    router = jsonServer.router(db);
    server.use(jsonServer.defaults());
    server.use(router);
  });
  describe('GET /:resource', function () {
    test('should respond with corresponding resource', function () {
      return request(server).get('/user').expect(200, db.user);
    });
  });
  describe('POST /:resource', function () {
    test('should create resource', function () {
      var user = {
        name: 'bar'
      };
      return request(server).post('/user').send(user).expect(201, user);
    });
  });
  describe('PUT /:resource', function () {
    test('should update resource', function () {
      var user = {
        name: 'bar'
      };
      return request(server).put('/user').send(user).expect(200, user);
    });
  });
  describe('PATCH /:resource', function () {
    test('should update resource', function () {
      return request(server).patch('/user').send({
        name: 'bar'
      }).expect(200, {
        name: 'bar',
        email: 'foo@example.com'
      });
    });
  });
});