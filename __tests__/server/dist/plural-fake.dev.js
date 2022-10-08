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
    db.posts = [{
      id: 1,
      body: 'foo'
    }, {
      id: 2,
      body: 'bar'
    }];
    db.comments = [{
      id: 1,
      body: 'foo',
      published: true,
      postId: 1,
      userId: 1
    }, {
      id: 2,
      body: 'bar',
      published: false,
      postId: 1,
      userId: 2
    }, {
      id: 3,
      body: 'baz',
      published: false,
      postId: 2,
      userId: 1
    }, {
      id: 4,
      body: 'qux',
      published: true,
      postId: 2,
      userId: 2
    }, {
      id: 5,
      body: 'quux',
      published: false,
      postId: 2,
      userId: 1
    }];
    server = jsonServer.create();
    router = jsonServer.router(db, {
      _isFake: true
    });
    server.use(jsonServer.defaults());
    server.use(router);
  });
  describe('GET /:parent/:parentId/:resource', function () {
    test('should respond with json and corresponding nested resources', function () {
      return request(server).get('/posts/1/comments').expect('Content-Type', /json/).expect(200, [db.comments[0], db.comments[1]]);
    });
  });
  describe('POST /:resource', function () {
    test('should not create a resource', function _callee() {
      return regeneratorRuntime.async(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return regeneratorRuntime.awrap(request(server).post('/posts').send({
                body: 'foo',
                booleanValue: true,
                integerValue: 1
              }).expect('Access-Control-Expose-Headers', 'Location').expect('Location', /posts\/3$/).expect('Content-Type', /json/).expect(201, {
                id: 3,
                body: 'foo',
                booleanValue: true,
                integerValue: 1
              }));

            case 2:
              assert.strictEqual(db.posts.length, 2);

            case 3:
            case "end":
              return _context.stop();
          }
        }
      });
    });
  });
  describe('PUT /:resource/:id', function () {
    test('should not replace resource', function _callee2() {
      var post, res;
      return regeneratorRuntime.async(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              post = {
                id: 1,
                booleanValue: true,
                integerValue: 1
              };
              _context2.next = 3;
              return regeneratorRuntime.awrap(request(server).put('/posts/1').set('Accept', 'application/json') // body property omitted to test that the resource is replaced
              .send(post).expect('Content-Type', /json/).expect(200, post));

            case 3:
              res = _context2.sent;
              // TODO find a "supertest" way to test this
              // https://github.com/typicode/json-server/issues/396
              assert.deepStrictEqual(res.body, post);
              assert.notDeepStrictEqual(db.posts[0], post);

            case 6:
            case "end":
              return _context2.stop();
          }
        }
      });
    });
  });
  describe('PATCH /:resource/:id', function () {
    test('should not update resource', function _callee3() {
      var partial, post, res;
      return regeneratorRuntime.async(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              partial = {
                body: 'bar'
              };
              post = {
                id: 1,
                body: 'bar'
              };
              _context3.next = 4;
              return regeneratorRuntime.awrap(request(server).patch('/posts/1').send(partial).expect('Content-Type', /json/).expect(200, post));

            case 4:
              res = _context3.sent;
              assert.deepStrictEqual(res.body, post);
              assert.notDeepStrictEqual(db.posts[0], post);

            case 7:
            case "end":
              return _context3.stop();
          }
        }
      });
    });
  });
  describe('DELETE /:resource/:id', function () {
    test('should not destroy resource', function _callee4() {
      return regeneratorRuntime.async(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return regeneratorRuntime.awrap(request(server).del('/posts/1').expect(200, {}));

            case 2:
              assert.strictEqual(db.posts.length, 2);

            case 3:
            case "end":
              return _context4.stop();
          }
        }
      });
    });
  });
});