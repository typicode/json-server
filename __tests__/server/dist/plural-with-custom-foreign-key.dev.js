"use strict";

var assert = require('assert');

var _ = require('lodash');

var request = require('supertest');

var jsonServer = require('../../src/server');

describe('Server with custom foreign key', function () {
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
      post_id: 1
    }, {
      id: 2,
      post_id: 1
    }, {
      id: 3,
      post_id: 2
    }];
    server = jsonServer.create();
    router = jsonServer.router(db, {
      foreignKeySuffix: '_id'
    });
    server.use(jsonServer.defaults());
    server.use(router);
  });
  describe('GET /:parent/:parentId/:resource', function () {
    test('should respond with json and corresponding nested resources', function () {
      return request(server).get('/posts/1/comments').expect('Content-Type', /json/).expect(200, [db.comments[0], db.comments[1]]);
    });
  });
  describe('GET /:resource/:id', function () {
    test('should respond with json and corresponding resource', function () {
      return request(server).get('/posts/1').expect('Content-Type', /json/).expect(200, db.posts[0]);
    });
  });
  describe('GET /:resource?_embed=', function () {
    test('should respond with corresponding resources and embedded resources', function () {
      var posts = _.cloneDeep(db.posts);

      posts[0].comments = [db.comments[0], db.comments[1]];
      posts[1].comments = [db.comments[2]];
      return request(server).get('/posts?_embed=comments').expect('Content-Type', /json/).expect(200, posts);
    });
  });
  describe('GET /:resource/:id?_embed=', function () {
    test('should respond with corresponding resources and embedded resources', function () {
      var post = _.cloneDeep(db.posts[0]);

      post.comments = [db.comments[0], db.comments[1]];
      return request(server).get('/posts/1?_embed=comments').expect('Content-Type', /json/).expect(200, post);
    });
  });
  describe('GET /:resource?_expand=', function () {
    test('should respond with corresponding resource and expanded inner resources', function () {
      var comments = _.cloneDeep(db.comments);

      comments[0].post = db.posts[0];
      comments[1].post = db.posts[0];
      comments[2].post = db.posts[1];
      return request(server).get('/comments?_expand=post').expect('Content-Type', /json/).expect(200, comments);
    });
  });
  describe('GET /:resource/:id?_expand=', function () {
    test('should respond with corresponding resource and expanded inner resources', function () {
      var comment = _.cloneDeep(db.comments[0]);

      comment.post = db.posts[0];
      return request(server).get('/comments/1?_expand=post').expect('Content-Type', /json/).expect(200, comment);
    });
  });
  describe('POST /:parent/:parentId/:resource', function () {
    test('should respond with json and set parentId', function () {
      return request(server).post('/posts/1/comments').send({
        body: 'foo'
      }).expect('Content-Type', /json/).expect(201, {
        id: 4,
        post_id: '1',
        body: 'foo'
      });
    });
  });
  describe('DELETE /:resource/:id', function () {
    test('should respond with empty data, destroy resource and dependent resources', function _callee() {
      return regeneratorRuntime.async(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return regeneratorRuntime.awrap(request(server).del('/posts/1').expect({}).expect(200));

            case 2:
              assert.strictEqual(db.posts.length, 1);
              assert.strictEqual(db.comments.length, 1);

            case 4:
            case "end":
              return _context.stop();
          }
        }
      });
    });
  });
});