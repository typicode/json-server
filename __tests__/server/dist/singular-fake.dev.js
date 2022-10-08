"use strict";

var assert = require('assert');

var request = require('supertest');

var jsonServer = require('../../src/server');

describe('Fake server', function () {
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
    router = jsonServer.router(db, {
      _isFake: true
    });
    server.use(jsonServer.defaults());
    server.use(router);
  });
  describe('POST /:resource', function () {
    test('should not create resource', function _callee() {
      var user;
      return regeneratorRuntime.async(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              user = {
                name: 'bar'
              };
              _context.next = 3;
              return regeneratorRuntime.awrap(request(server).post('/user').send(user).expect(201, user));

            case 3:
              assert.notDeepStrictEqual(db.user, user);

            case 4:
            case "end":
              return _context.stop();
          }
        }
      });
    });
  });
  describe('PUT /:resource', function () {
    test('should not update resource', function _callee2() {
      var user;
      return regeneratorRuntime.async(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              user = {
                name: 'bar'
              };
              _context2.next = 3;
              return regeneratorRuntime.awrap(request(server).put('/user').send(user).expect(200, user));

            case 3:
              assert.notDeepStrictEqual(db.user, user);

            case 4:
            case "end":
              return _context2.stop();
          }
        }
      });
    });
  });
  describe('PATCH /:resource', function () {
    test('should not update resource', function _callee3() {
      var user;
      return regeneratorRuntime.async(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              user = {
                name: 'bar'
              };
              _context3.next = 3;
              return regeneratorRuntime.awrap(request(server).patch('/user').send(user).expect(200, {
                name: 'bar',
                email: 'foo@example.com'
              }));

            case 3:
              assert.notDeepStrictEqual(db.user, user);

            case 4:
            case "end":
              return _context3.stop();
          }
        }
      });
    });
  });
});