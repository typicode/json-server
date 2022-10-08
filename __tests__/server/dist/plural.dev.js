"use strict";

var assert = require('assert');

var _ = require('lodash');

var request = require('supertest');

var jsonServer = require('../../src/server');

describe('Server', function () {
  var server;
  var router;
  var db;
  var rewriterRules = {
    '/api/*': '/$1',
    '/blog/posts/:id/show': '/posts/:id',
    '/comments/special/:userId-:body': '/comments/?userId=:userId&body=:body',
    '/firstpostwithcomments': '/posts/1?_embed=comments',
    '/articles\\?_id=:id': '/posts/:id'
  };
  beforeEach(function () {
    db = {};
    db.posts = [{
      id: 1,
      body: 'foo'
    }, {
      id: 2,
      body: 'bar'
    }];
    db.tags = [{
      id: 1,
      body: 'Technology'
    }, {
      id: 2,
      body: 'Photography'
    }, {
      id: 3,
      body: 'photo'
    }];
    db.users = [{
      id: 1,
      username: 'Jim',
      tel: '0123'
    }, {
      id: 2,
      username: 'George',
      tel: '123'
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
    db.buyers = [{
      id: 1,
      name: 'Aileen',
      country: 'Colombia',
      total: 100
    }, {
      id: 2,
      name: 'Barney',
      country: 'Colombia',
      total: 200
    }, {
      id: 3,
      name: 'Carley',
      country: 'Colombia',
      total: 300
    }, {
      id: 4,
      name: 'Daniel',
      country: 'Belize',
      total: 30
    }, {
      id: 5,
      name: 'Ellen',
      country: 'Belize',
      total: 20
    }, {
      id: 6,
      name: 'Frank',
      country: 'Belize',
      total: 10
    }, {
      id: 7,
      name: 'Grace',
      country: 'Argentina',
      total: 1
    }, {
      id: 8,
      name: 'Henry',
      country: 'Argentina',
      total: 2
    }, {
      id: 9,
      name: 'Isabelle',
      country: 'Argentina',
      total: 3
    }];
    db.refs = [{
      id: 'abcd-1234',
      url: 'http://example.com',
      postId: 1,
      userId: 1
    }];
    db.stringIds = [{
      id: '1234'
    }];
    db.deep = [{
      a: {
        b: 1
      }
    }, {
      a: 1
    }];
    db.nested = [{
      resource: {
        name: 'dewey'
      }
    }, {
      resource: {
        name: 'cheatem'
      }
    }, {
      resource: {
        name: 'howe'
      }
    }];
    db.list = [{
      id: 1
    }, {
      id: 2
    }, {
      id: 3
    }, {
      id: 4
    }, {
      id: 5
    }, {
      id: 6
    }, {
      id: 7
    }, {
      id: 8
    }, {
      id: 9
    }, {
      id: 10
    }, {
      id: 11
    }, {
      id: 12
    }, {
      id: 13
    }, {
      id: 14
    }, {
      id: 15
    }];
    server = jsonServer.create();
    router = jsonServer.router(db);
    server.use(jsonServer.defaults());
    server.use(jsonServer.rewriter(rewriterRules));
    server.use(router);
  });
  describe('GET /db', function () {
    test('should respond with json and full database', function () {
      return request(server).get('/db').expect('Content-Type', /json/).expect(200, db);
    });
  });
  describe('GET /:resource', function () {
    test('should respond with json and corresponding resources', function () {
      return request(server).get('/posts').set('Origin', 'http://example.com').expect('Content-Type', /json/).expect('Access-Control-Allow-Credentials', 'true').expect('Access-Control-Allow-Origin', 'http://example.com').expect(200, db.posts);
    });
    test('should respond with 404 if resource is not found', function () {
      return request(server).get('/undefined').expect(404);
    });
  });
  describe('GET /:resource?attr=&attr=', function () {
    test('should respond with json and filter resources', function () {
      return request(server).get('/comments?postId=1&published=true').expect('Content-Type', /json/).expect(200, [db.comments[0]]);
    });
    test('should be strict', function () {
      return request(server).get('/users?tel=123').expect('Content-Type', /json/).expect(200, [db.users[1]]);
    });
    test('should support multiple filters', function () {
      return request(server).get('/comments?id=1&id=2').expect('Content-Type', /json/).expect(200, [db.comments[0], db.comments[1]]);
    });
    test('should support deep filter', function () {
      return request(server).get('/deep?a.b=1').expect('Content-Type', /json/).expect(200, [db.deep[0]]);
    });
    test('should ignore JSONP query parameters callback and _ ', function () {
      return request(server).get('/comments?callback=1&_=1').expect('Content-Type', /text/).expect(new RegExp(db.comments[0].body)) // JSONP returns text
      .expect(200);
    });
    test('should ignore unknown query parameters', function () {
      return request(server).get('/comments?foo=1&bar=2').expect('Content-Type', /json/).expect(200, db.comments);
    }); // https://github.com/typicode/json-server/issues/510

    test('should not fail with null value', function () {
      db.posts.push({
        id: 99,
        body: null
      });
      return request(server).get('/posts?body=foo').expect('Content-Type', /json/).expect(200, [db.posts[0]]);
    });
  });
  describe('GET /:resource?q=', function () {
    test('should respond with json and make a full-text search', function () {
      return request(server).get('/tags?q=pho').expect('Content-Type', /json/).expect(200, [db.tags[1], db.tags[2]]);
    });
    test('should respond with json and make a deep full-text search', function () {
      return request(server).get('/deep?q=1').expect('Content-Type', /json/).expect(200, db.deep);
    });
    test('should return an empty array when nothing is matched', function () {
      return request(server).get('/tags?q=nope').expect('Content-Type', /json/).expect(200, []);
    });
    test('should support other query parameters', function () {
      return request(server).get('/comments?q=qu&published=true').expect('Content-Type', /json/).expect(200, [db.comments[3]]);
    });
    test('should ignore duplicate q query parameters', function () {
      return request(server).get('/comments?q=foo&q=bar').expect('Content-Type', /json/).expect(200, [db.comments[0]]);
    });
    test('should support filtering by boolean value false', function () {
      return request(server).get('/comments?published=false').expect('Content-Type', /json/).expect(200, [db.comments[1], db.comments[2], db.comments[4]]);
    });
  });
  describe('GET /:resource?_end=', function () {
    test('should respond with a sliced array', function () {
      return request(server).get('/comments?_end=2').expect('Content-Type', /json/).expect('x-total-count', db.comments.length.toString()).expect('Access-Control-Expose-Headers', 'X-Total-Count').expect(200, db.comments.slice(0, 2));
    });
  });
  describe('GET /:resource?_sort=', function () {
    test('should respond with json and sort on a field', function () {
      return request(server).get('/tags?_sort=body').expect('Content-Type', /json/).expect(200, [db.tags[1], db.tags[0], db.tags[2]]);
    });
    test('should reverse sorting with _order=DESC', function () {
      return request(server).get('/tags?_sort=body&_order=DESC').expect('Content-Type', /json/).expect(200, [db.tags[2], db.tags[0], db.tags[1]]);
    });
    test('should reverse sorting with _order=desc (case insensitive)', function () {
      return request(server).get('/tags?_sort=body&_order=desc').expect('Content-Type', /json/).expect(200, [db.tags[2], db.tags[0], db.tags[1]]);
    });
    test('should sort on numerical field', function () {
      return request(server).get('/posts?_sort=id&_order=DESC').expect('Content-Type', /json/).expect(200, db.posts.reverse());
    });
    test('should sort on nested field', function () {
      return request(server).get('/nested?_sort=resource.name').expect('Content-Type', /json/).expect(200, [db.nested[1], db.nested[0], db.nested[2]]);
    });
    test('should sort on multiple fields', function () {
      return request(server).get('/buyers?_sort=country,total&_order=asc,desc').expect('Content-Type', /json/).expect(200, [db.buyers[8], db.buyers[7], db.buyers[6], db.buyers[3], db.buyers[4], db.buyers[5], db.buyers[2], db.buyers[1], db.buyers[0]]);
    });
  });
  describe('GET /:resource?_start=&_end=', function () {
    test('should respond with a sliced array', function () {
      return request(server).get('/comments?_start=1&_end=2').expect('Content-Type', /json/).expect('X-Total-Count', db.comments.length.toString()).expect('Access-Control-Expose-Headers', 'X-Total-Count').expect(200, db.comments.slice(1, 2));
    });
  });
  describe('GET /:resource?_start=&_limit=', function () {
    test('should respond with a limited array', function () {
      return request(server).get('/comments?_start=1&_limit=1').expect('Content-Type', /json/).expect('X-Total-Count', db.comments.length.toString()).expect('Access-Control-Expose-Headers', 'X-Total-Count').expect(200, db.comments.slice(1, 2));
    });
  });
  describe('GET /:resource?_page=', function () {
    test('should paginate', function () {
      return request(server).get('/list?_page=2').expect('Content-Type', /json/).expect('x-total-count', db.list.length.toString()).expect('Access-Control-Expose-Headers', 'X-Total-Count, Link').expect(200, db.list.slice(10, 20));
    });
  });
  describe('GET /:resource?_page=&_limit=', function () {
    test('should paginate with a custom limit', function () {
      var link = ['<http://localhost/list?_page=1&_limit=1>; rel="first"', '<http://localhost/list?_page=1&_limit=1>; rel="prev"', '<http://localhost/list?_page=3&_limit=1>; rel="next"', '<http://localhost/list?_page=15&_limit=1>; rel="last"'].join(', ');
      return request(server).get('/list?_page=2&_limit=1').set('host', 'localhost').expect('Content-Type', /json/).expect('x-total-count', db.list.length.toString()).expect('link', link).expect('Access-Control-Expose-Headers', 'X-Total-Count, Link').expect(200, db.list.slice(1, 2));
    });
  });
  describe('GET /:resource?attr_gte=&attr_lte=', function () {
    test('should respond with a limited array', function () {
      return request(server).get('/comments?id_gte=2&id_lte=3').expect('Content-Type', /json/).expect(200, db.comments.slice(1, 3));
    });
  });
  describe('GET /:resource?attr_ne=', function () {
    test('should respond with a limited array', function () {
      return request(server).get('/comments?id_ne=1').expect('Content-Type', /json/).expect(200, db.comments.slice(1));
    });
    test('should accept multiple parameters', function () {
      return request(server).get('/comments?id_ne=1&id_ne=2').expect('Content-Type', /json/).expect(200, db.comments.slice(2));
    });
  });
  describe('GET /:resource?attr_like=', function () {
    test('should respond with an array that matches the like operator (case insensitive)', function () {
      return request(server).get('/tags?body_like=photo').expect('Content-Type', /json/).expect(200, [db.tags[1], db.tags[2]]);
    });
    test('should accept multiple parameters', function () {
      return request(server).get('/tags?body_like=photo&body_like=tech').expect('Content-Type', /json/).expect(200, db.tags);
    });
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
    test('should support string id, respond with json and corresponding resource', function () {
      return request(server).get('/refs/abcd-1234').expect('Content-Type', /json/).expect(200, db.refs[0]);
    });
    test('should support integer id as string', function () {
      return request(server).get('/stringIds/1234').expect('Content-Type', /json/).expect(200, db.stringIds[0]);
    });
    test('should respond with 404 if resource is not found', function () {
      return request(server).get('/posts/9001').expect('Content-Type', /json/).expect(404, {});
    });
  });
  describe('GET /:resource?_embed=', function () {
    test('should respond with corresponding resources and embedded resources', function () {
      var posts = _.cloneDeep(db.posts);

      posts[0].comments = [db.comments[0], db.comments[1]];
      posts[1].comments = [db.comments[2], db.comments[3], db.comments[4]];
      return request(server).get('/posts?_embed=comments').expect('Content-Type', /json/).expect(200, posts);
    });
  });
  describe('GET /:resource?_embed&_embed=', function () {
    test('should respond with corresponding resources and embedded resources', function () {
      var posts = _.cloneDeep(db.posts);

      posts[0].comments = [db.comments[0], db.comments[1]];
      posts[0].refs = [db.refs[0]];
      posts[1].comments = [db.comments[2], db.comments[3], db.comments[4]];
      posts[1].refs = [];
      return request(server).get('/posts?_embed=comments&_embed=refs').expect('Content-Type', /json/).expect(200, posts);
    });
  });
  describe('GET /:resource/:id?_embed=', function () {
    test('should respond with corresponding resources and embedded resources', function () {
      var post = _.cloneDeep(db.posts[0]);

      post.comments = [db.comments[0], db.comments[1]];
      return request(server).get('/posts/1?_embed=comments').expect('Content-Type', /json/).expect(200, post);
    });
  });
  describe('GET /:resource/:id?_embed=&_embed=', function () {
    test('should respond with corresponding resource and embedded resources', function () {
      var post = _.cloneDeep(db.posts[0]);

      post.comments = [db.comments[0], db.comments[1]];
      post.refs = [db.refs[0]];
      return request(server).get('/posts/1?_embed=comments&_embed=refs').expect('Content-Type', /json/).expect(200, post);
    });
  });
  describe('GET /:resource?_expand=', function () {
    test('should respond with corresponding resource and expanded inner resources', function () {
      var refs = _.cloneDeep(db.refs);

      refs[0].post = db.posts[0];
      return request(server).get('/refs?_expand=post').expect('Content-Type', /json/).expect(200, refs);
    });
  });
  describe('GET /:resource/:id?_expand=', function () {
    test('should respond with corresponding resource and expanded inner resources', function () {
      var comment = _.cloneDeep(db.comments[0]);

      comment.post = db.posts[0];
      return request(server).get('/comments/1?_expand=post').expect('Content-Type', /json/).expect(200, comment);
    });
  });
  describe('GET /:resource?_expand=&_expand', function () {
    test('should respond with corresponding resource and expanded inner resources', function () {
      var refs = _.cloneDeep(db.refs);

      refs[0].post = db.posts[0];
      refs[0].user = db.users[0];
      return request(server).get('/refs?_expand=post&_expand=user').expect('Content-Type', /json/).expect(200, refs);
    });
  });
  describe('GET /:resource/:id?_expand=&_expand=', function () {
    test('should respond with corresponding resource and expanded inner resources', function () {
      var comments = db.comments[0];
      comments.post = db.posts[0];
      comments.user = db.users[0];
      return request(server).get('/comments/1?_expand=post&_expand=user').expect('Content-Type', /json/).expect(200, comments);
    });
  });
  describe('GET /:resource>_delay=', function () {
    test('should delay response', function (done) {
      var start = new Date();
      request(server).get('/posts?_delay=1100').expect(200, function (err) {
        var end = new Date();
        done(end - start > 1000 ? err : new Error("Request wasn't delayed"));
      });
    });
  });
  describe('POST /:resource', function () {
    test('should respond with json, create a resource and increment id', function _callee() {
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
              assert.strictEqual(db.posts.length, 3);

            case 3:
            case "end":
              return _context.stop();
          }
        }
      });
    });
    test('should support x-www-form-urlencoded', function _callee2() {
      return regeneratorRuntime.async(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return regeneratorRuntime.awrap(request(server).post('/posts').type('form').send({
                body: 'foo',
                booleanValue: true,
                integerValue: 1
              }).expect('Content-Type', /json/) // x-www-form-urlencoded will convert to string
              .expect(201, {
                id: 3,
                body: 'foo',
                booleanValue: 'true',
                integerValue: '1'
              }));

            case 2:
              assert.strictEqual(db.posts.length, 3);

            case 3:
            case "end":
              return _context2.stop();
          }
        }
      });
    });
    test('should respond with json, create a resource and generate string id', function _callee3() {
      return regeneratorRuntime.async(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return regeneratorRuntime.awrap(request(server).post('/refs').send({
                url: 'http://foo.com',
                postId: 1
              }).expect('Content-Type', /json/).expect(201));

            case 2:
              assert.strictEqual(db.refs.length, 2);

            case 3:
            case "end":
              return _context3.stop();
          }
        }
      });
    });
  });
  describe('POST /:parent/:parentId/:resource', function () {
    test('should respond with json and set parentId', function () {
      return request(server).post('/posts/1/comments').send({
        body: 'foo'
      }).expect('Content-Type', /json/).expect(201, {
        id: 6,
        postId: '1',
        body: 'foo'
      });
    });
  });
  describe('POST /:resource?_delay=', function () {
    test('should delay response', function (done) {
      var start = new Date();
      request(server).post('/posts?_delay=1100').send({
        body: 'foo',
        booleanValue: true,
        integerValue: 1
      }).expect(201, function (err) {
        var end = new Date();
        done(end - start > 1000 ? err : new Error("Request wasn't delayed"));
      });
    });
  });
  describe('PUT /:resource/:id', function () {
    test('should respond with json and replace resource', function _callee4() {
      var post, res;
      return regeneratorRuntime.async(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              post = {
                id: 1,
                booleanValue: true,
                integerValue: 1
              };
              _context4.next = 3;
              return regeneratorRuntime.awrap(request(server).put('/posts/1').set('Accept', 'application/json') // body property omitted to test that the resource is replaced
              .send(post).expect('Content-Type', /json/).expect(200, post));

            case 3:
              res = _context4.sent;
              // TODO find a "supertest" way to test this
              // https://github.com/typicode/json-server/issues/396
              assert.deepStrictEqual(res.body, post); // assert it was created in database too

              assert.deepStrictEqual(db.posts[0], post);

            case 6:
            case "end":
              return _context4.stop();
          }
        }
      });
    });
    test('should respond with 404 if resource is not found', function () {
      return request(server).put('/posts/9001').send({
        id: 1,
        body: 'bar'
      }).expect('Content-Type', /json/).expect(404, {});
    });
  });
  describe('PUT /:resource:id?_delay=', function () {
    test('should delay response', function (done) {
      var start = new Date();
      request(server).put('/posts/1?_delay=1100').set('Accept', 'application/json').send({
        id: 1,
        booleanValue: true,
        integerValue: 1
      }).expect(200, function (err) {
        var end = new Date();
        done(end - start > 1000 ? err : new Error("Request wasn't delayed"));
      });
    });
  });
  describe('PATCH /:resource/:id', function () {
    test('should respond with json and update resource', function _callee5() {
      var partial, post, res;
      return regeneratorRuntime.async(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              partial = {
                body: 'bar'
              };
              post = {
                id: 1,
                body: 'bar'
              };
              _context5.next = 4;
              return regeneratorRuntime.awrap(request(server).patch('/posts/1').send(partial).expect('Content-Type', /json/).expect(200, post));

            case 4:
              res = _context5.sent;
              assert.deepStrictEqual(res.body, post); // assert it was created in database too

              assert.deepStrictEqual(db.posts[0], post);

            case 7:
            case "end":
              return _context5.stop();
          }
        }
      });
    });
    test('should respond with 404 if resource is not found', function () {
      return request(server).patch('/posts/9001').send({
        body: 'bar'
      }).expect('Content-Type', /json/).expect(404, {});
    });
  });
  describe('PATCH /:resource:id?_delay=', function () {
    test('should delay response', function (done) {
      var start = new Date();
      request(server).patch('/posts/1?_delay=1100').send({
        body: 'bar'
      }).send({
        id: 1,
        booleanValue: true,
        integerValue: 1
      }).expect(200, function (err) {
        var end = new Date();
        done(end - start > 1000 ? err : new Error("Request wasn't delayed"));
      });
    });
  });
  describe('DELETE /:resource/:id', function () {
    test('should respond with empty data, destroy resource and dependent resources', function _callee6() {
      return regeneratorRuntime.async(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return regeneratorRuntime.awrap(request(server).del('/posts/1').expect(200, {}));

            case 2:
              assert.strictEqual(db.posts.length, 1);
              assert.strictEqual(db.comments.length, 3);

            case 4:
            case "end":
              return _context6.stop();
          }
        }
      });
    });
    test('should respond with 404 if resource is not found', function () {
      return request(server).del('/posts/9001').expect('Content-Type', /json/).expect(404, {});
    });
  });
  describe('DELETE /:resource:id?_delay=', function () {
    test('should delay response', function (done) {
      var start = new Date();
      request(server).del('/posts/1?_delay=1100').send({
        id: 1,
        booleanValue: true,
        integerValue: 1
      }).expect(200, function (err) {
        var end = new Date();
        done(end - start > 1000 ? err : new Error("Request wasn't delayed"));
      });
    });
  });
  describe('Static routes', function () {
    describe('GET /', function () {
      test('should respond with html', function () {
        return request(server).get('/').expect(/You're successfully running JSON Server/).expect(200);
      });
    });
    describe('GET /script.js', function () {
      test('should respond with js', function () {
        return request(server).get('/script.js').expect('Content-Type', /javascript/).expect(200);
      });
    });
    describe('GET /style.css', function () {
      test('should respond with css', function () {
        return request(server).get('/style.css').expect('Content-Type', /css/).expect(200);
      });
    });
  });
  describe('Database state', function () {
    test('should be accessible', function () {
      assert(router.db.getState());
    });
  });
  describe('Responses', function () {
    test('should have no cache headers (for IE)', function () {
      return request(server).get('/db').expect('Cache-Control', 'no-cache').expect('Pragma', 'no-cache').expect('Expires', '-1');
    });
  });
  describe('Rewriter', function () {
    test('should rewrite using prefix', function () {
      return request(server).get('/api/posts/1').expect(db.posts[0]);
    });
    test('should rewrite using params', function () {
      return request(server).get('/blog/posts/1/show').expect(db.posts[0]);
    });
    test('should rewrite using query without params', function () {
      var expectedPost = _.cloneDeep(db.posts[0]);

      expectedPost.comments = [db.comments[0], db.comments[1]];
      return request(server).get('/firstpostwithcomments').expect(expectedPost);
    });
    test('should rewrite using params and query', function () {
      return request(server).get('/comments/special/1-quux').expect(200, [db.comments[4]]);
    });
    test('should rewrite query params', function () {
      return request(server).get('/articles?_id=1').expect(db.posts[0]);
    });
    test('should expose routes', function () {
      return request(server).get('/__rules').expect(rewriterRules);
    });
  });
  describe('router.render', function () {
    beforeEach(function () {
      router.render = function (req, res) {
        res.jsonp({
          data: res.locals.data
        });
      };
    });
    test('should be possible to wrap response', function () {
      return request(server).get('/posts/1').expect('Content-Type', /json/).expect(200, {
        data: db.posts[0]
      });
    });
  });
  describe('router.db._.id', function () {
    beforeEach(function () {
      router.db.setState({
        posts: [{
          _id: 1
        }]
      });
      router.db._.id = '_id';
    });
    test('should be possible to GET using a different id property', function () {
      return request(server).get('/posts/1').expect('Content-Type', /json/).expect(200, router.db.getState().posts[0]);
    });
    test('should be possible to POST using a different id property', function () {
      return request(server).post('/posts').send({
        body: 'hello'
      }).expect('Content-Type', /json/).expect(201, {
        _id: 2,
        body: 'hello'
      });
    });
  });
});