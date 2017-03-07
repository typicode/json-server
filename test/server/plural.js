const assert = require('assert')
const _ = require('lodash')
const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Server', () => {
  let server
  let router
  let db
  const rewriterRules = {
    '/api/': '/',
    '/blog/posts/:id/show': '/posts/:id',
    '/comments/special/:userId-:body': '/comments/?userId=:userId&body=:body',
    '/firstpostwithcomments': '/posts/1?_embed=comments',
    '/articles?_id=:id': '/posts/:id'
  }

  beforeEach(() => {
    db = {}

    db.posts = [
      { id: 1, body: 'foo' },
      { id: 2, body: 'bar' }
    ]

    db.tags = [
      { id: 1, body: 'Technology' },
      { id: 2, body: 'Photography' },
      { id: 3, body: 'photo' }
    ]

    db.users = [
      { id: 1, username: 'Jim', tel: '0123' },
      { id: 2, username: 'George', tel: '123' }
    ]

    db.comments = [
      { id: 1, body: 'foo', published: true, postId: 1, userId: 1 },
      { id: 2, body: 'bar', published: false, postId: 1, userId: 2 },
      { id: 3, body: 'baz', published: false, postId: 2, userId: 1 },
      { id: 4, body: 'qux', published: true, postId: 2, userId: 2 },
      { id: 5, body: 'quux', published: false, postId: 2, userId: 1 }
    ]

    db.refs = [
      { id: 'abcd-1234', url: 'http://example.com', postId: 1, userId: 1 }
    ]

    db.stringIds = [
      { id: '1234' }
    ]

    db.deep = [
      { a: { b: 1 } },
      { a: 1 }
    ]

    db.nested = [
      { resource: {name: 'dewey'} },
      { resource: {name: 'cheatem'} },
      { resource: {name: 'howe'} }
    ]

    db.list = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
      { id: 6 },
      { id: 7 },
      { id: 8 },
      { id: 9 },
      { id: 10 },
      { id: 11 },
      { id: 12 },
      { id: 13 },
      { id: 14 },
      { id: 15 }
    ]

    server = jsonServer.create()
    router = jsonServer.router(db)
    server.use(jsonServer.defaults())
    server.use(jsonServer.rewriter(rewriterRules))
    server.use(router)
  })

  describe('GET /db', () => {
    it('should respond with json and full database', (done) => {
      request(server)
        .get('/db')
        .expect('Content-Type', /json/)
        .expect(db)
        .expect(200, done)
    })
  })

  describe('GET /:resource', () => {
    it('should respond with json and corresponding resources', (done) => {
      request(server)
        .get('/posts')
        .set('Origin', 'http://example.com')
        .expect('Content-Type', /json/)
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect('Access-Control-Allow-Origin', 'http://example.com')
        .expect(db.posts)
        .expect(200, done)
    })

    it('should respond with 404 if resource is not found', (done) => {
      request(server)
        .get('/undefined')
        .expect(404, done)
    })
  })

  describe('GET /:resource?attr=&attr=', () => {
    it('should respond with json and filter resources', (done) => {
      request(server)
        .get('/comments?postId=1&published=true')
        .expect('Content-Type', /json/)
        .expect([ db.comments[0] ])
        .expect(200, done)
    })

    it('should be strict', (done) => {
      request(server)
        .get('/users?tel=123')
        .expect('Content-Type', /json/)
        .expect([ db.users[1] ])
        .expect(200, done)
    })

    it('should support multiple filters', (done) => {
      request(server)
        .get('/comments?id=1&id=2')
        .expect('Content-Type', /json/)
        .expect([ db.comments[0], db.comments[1] ])
        .expect(200, done)
    })

    it('should support deep filter', (done) => {
      request(server)
        .get('/deep?a.b=1')
        .expect('Content-Type', /json/)
        .expect([ db.deep[0] ])
        .expect(200, done)
    })

    it('should ignore JSONP query parameters callback and _ ', (done) => {
      request(server)
        .get('/comments?callback=1&_=1')
        .expect('Content-Type', /text/)
        .expect(new RegExp(db.comments[0].body)) // JSONP returns text
        .expect(200, done)
    })

    it('should ignore unknown query parameters', (done) => {
      request(server)
        .get('/comments?foo=1&bar=2')
        .expect('Content-Type', /json/)
        .expect(db.comments)
        .expect(200, done)
    })
  })

  describe('GET /:resource?q=', () => {
    it('should respond with json and make a full-text search', (done) => {
      request(server)
        .get('/tags?q=pho')
        .expect('Content-Type', /json/)
        .expect([ db.tags[1], db.tags[2] ])
        .expect(200, done)
    })

    it('should respond with json and make a deep full-text search', (done) => {
      request(server)
        .get('/deep?q=1')
        .expect('Content-Type', /json/)
        .expect(db.deep)
        .expect(200, done)
    })

    it('should return an empty array when nothing is matched', (done) => {
      request(server)
        .get('/tags?q=nope')
        .expect('Content-Type', /json/)
        .expect([ ])
        .expect(200, done)
    })

    it('should support other query parameters', (done) => {
      request(server)
        .get('/comments?q=qu&published=true')
        .expect('Content-Type', /json/)
        .expect([ db.comments[3] ])
        .expect(200, done)
    })

    it('should ignore duplicate q query parameters', (done) => {
      request(server)
        .get('/comments?q=foo&q=bar')
        .expect('Content-Type', /json/)
        .expect([ db.comments[0] ])
        .expect(200, done)
    })

    it('should support filtering by boolean value false', (done) => {
      request(server)
        .get('/comments?published=false')
        .expect('Content-Type', /json/)
        .expect([ db.comments[1], db.comments[2], db.comments[4] ])
        .expect(200, done)
    })
  })

  describe('GET /:resource?_end=', () => {
    it('should respond with a sliced array', (done) => {
      request(server)
        .get('/comments?_end=2')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(0, 2))
        .expect(200, done)
    })
  })

  describe('GET /:resource?_sort=', () => {
    it('should respond with json and sort on a field', (done) => {
      request(server)
        .get('/tags?_sort=body')
        .expect('Content-Type', /json/)
        .expect([ db.tags[1], db.tags[0], db.tags[2] ])
        .expect(200, done)
    })

    it('should reverse sorting with _order=DESC', (done) => {
      request(server)
        .get('/tags?_sort=body&_order=DESC')
        .expect('Content-Type', /json/)
        .expect([ db.tags[2], db.tags[0], db.tags[1] ])
        .expect(200, done)
    })

    it('should sort on numerical field', (done) => {
      request(server)
        .get('/posts?_sort=id&_order=DESC')
        .expect('Content-Type', /json/)
        .expect(db.posts.reverse())
        .expect(200, done)
    })

    it('should sort on nested field', (done) => {
      request(server)
        .get('/nested?_sort=resource.name')
        .expect('Content-Type', /json/)
        .expect([ db.nested[1], db.nested[0], db.nested[2] ])
        .expect(200, done)
    })
  })

  describe('GET /:resource?_start=&_end=', () => {
    it('should respond with a sliced array', (done) => {
      request(server)
        .get('/comments?_start=1&_end=2')
        .expect('Content-Type', /json/)
        .expect('X-Total-Count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(1, 2))
        .expect(200, done)
    })
  })

  describe('GET /:resource?_start=&_limit=', () => {
    it('should respond with a limited array', (done) => {
      request(server)
        .get('/comments?_start=1&_limit=1')
        .expect('Content-Type', /json/)
        .expect('X-Total-Count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(1, 2))
        .expect(200, done)
    })
  })

  describe('GET /:resource?_page=', () => {
    it('should paginate', (done) => {
      request(server)
        .get('/list?_page=2')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.list.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count, Link')
        .expect(db.list.slice(10, 20))
        .expect(200, done)
    })
  })

  describe('GET /:resource?_page=&_limit=', () => {
    it('should paginate with a custom limit', (done) => {
      const link = [
        '<http://localhost/list?_page=1&_limit=1>; rel="first"',
        '<http://localhost/list?_page=1&_limit=1>; rel="prev"',
        '<http://localhost/list?_page=3&_limit=1>; rel="next"',
        '<http://localhost/list?_page=15&_limit=1>; rel="last"'
      ].join(', ')
      request(server)
        .get('/list?_page=2&_limit=1')
        .set('host', 'localhost')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.list.length.toString())
        .expect('link', link)
        .expect('Access-Control-Expose-Headers', 'X-Total-Count, Link')
        .expect(db.list.slice(1, 2))
        .expect(200, done)
    })
  })

  describe('GET /:resource?attr_gte=&attr_lte=', () => {
    it('should respond with a limited array', (done) => {
      request(server)
        .get('/comments?id_gte=2&id_lte=3')
        .expect('Content-Type', /json/)
        .expect(db.comments.slice(1, 3))
        .expect(200, done)
    })
  })

  describe('GET /:resource?attr_ne=', () => {
    it('should respond with a limited array', (done) => {
      request(server)
        .get('/comments?id_ne=1')
        .expect('Content-Type', /json/)
        .expect(db.comments.slice(1))
        .expect(200, done)
    })
  })

  describe('GET /:resource?attr_like=', () => {
    it('should respond with an array that matches the like operator (case insensitive)', (done) => {
      request(server)
        .get('/tags?body_like=photo')
        .expect('Content-Type', /json/)
        .expect([
          db.tags[1],
          db.tags[2]
        ])
        .expect(200, done)
    })
  })

  describe('GET /:parent/:parentId/:resource', () => {
    it('should respond with json and corresponding nested resources', (done) => {
      request(server)
        .get('/posts/1/comments')
        .expect('Content-Type', /json/)
        .expect([
          db.comments[0],
          db.comments[1]
        ])
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id', () => {
    it('should respond with json and corresponding resource', (done) => {
      request(server)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect(db.posts[0])
        .expect(200, done)
    })

    it('should support string id, respond with json and corresponding resource', (done) => {
      request(server)
        .get('/refs/abcd-1234')
        .expect('Content-Type', /json/)
        .expect(db.refs[0])
        .expect(200, done)
    })

    it('should support integer id as string', (done) => {
      request(server)
        .get('/stringIds/1234')
        .expect('Content-Type', /json/)
        .expect(db.stringIds[0])
        .expect(200, done)
    })

    it('should respond with 404 if resource is not found', (done) => {
      request(server)
        .get('/posts/9001')
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('GET /:resource?_embed=', () => {
    it('should respond with corresponding resources and embedded resources', (done) => {
      const posts = _.cloneDeep(db.posts)
      posts[0].comments = [ db.comments[0], db.comments[1] ]
      posts[1].comments = [ db.comments[2], db.comments[3], db.comments[4] ]
      request(server)
        .get('/posts?_embed=comments')
        .expect('Content-Type', /json/)
        .expect(posts)
        .expect(200, done)
    })
  })

  describe('GET /:resource?_embed&_embed=', () => {
    it('should respond with corresponding resources and embedded resources', (done) => {
      const posts = _.cloneDeep(db.posts)
      posts[0].comments = [ db.comments[0], db.comments[1] ]
      posts[0].refs = [ db.refs[0] ]
      posts[1].comments = [ db.comments[2], db.comments[3], db.comments[4] ]
      posts[1].refs = []
      request(server)
        .get('/posts?_embed=comments&_embed=refs')
        .expect('Content-Type', /json/)
        .expect(posts)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_embed=', () => {
    it('should respond with corresponding resources and embedded resources', (done) => {
      const post = _.cloneDeep(db.posts[0])
      post.comments = [ db.comments[0], db.comments[1] ]
      request(server)
        .get('/posts/1?_embed=comments')
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_embed=&_embed=', () => {
    it('should respond with corresponding resource and embedded resources', (done) => {
      const post = _.cloneDeep(db.posts[0])
      post.comments = [ db.comments[0], db.comments[1] ]
      post.refs = [db.refs[0]]
      request(server)
        .get('/posts/1?_embed=comments&_embed=refs')
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200, done)
    })
  })

  describe('GET /:resource?_expand=', () => {
    it('should respond with corresponding resource and expanded inner resources', (done) => {
      const refs = _.cloneDeep(db.refs)
      refs[0].post = db.posts[0]
      request(server)
        .get('/refs?_expand=post')
        .expect('Content-Type', /json/)
        .expect(refs)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_expand=', () => {
    it('should respond with corresponding resource and expanded inner resources', (done) => {
      const comment = _.cloneDeep(db.comments[0])
      comment.post = db.posts[0]
      request(server)
        .get('/comments/1?_expand=post')
        .expect('Content-Type', /json/)
        .expect(comment)
        .expect(200, done)
    })
  })

  describe('GET /:resource?_expand=&_expand', () => {
    it('should respond with corresponding resource and expanded inner resources', (done) => {
      const refs = _.cloneDeep(db.refs)
      refs[0].post = db.posts[0]
      refs[0].user = db.users[0]
      request(server)
        .get('/refs?_expand=post&_expand=user')
        .expect('Content-Type', /json/)
        .expect(refs)
        .expect(200, done)
    })
  })

  describe('GET /:resource/:id?_expand=&_expand=', () => {
    it('should respond with corresponding resource and expanded inner resources', (done) => {
      const comments = db.comments[0]
      comments.post = db.posts[0]
      comments.user = db.users[0]
      request(server)
        .get('/comments/1?_expand=post&_expand=user')
        .expect('Content-Type', /json/)
        .expect(comments)
        .expect(200, done)
    })
  })

  describe('POST /:resource', () => {
    it('should respond with json, create a resource and increment id',
      (done) => {
        request(server)
          .post('/posts')
          .send({body: 'foo', booleanValue: true, integerValue: 1})
          .expect('Access-Control-Expose-Headers', 'Location')
          .expect('Location', /posts\/3$/)
          .expect('Content-Type', /json/)
          .expect({id: 3, body: 'foo', booleanValue: true, integerValue: 1})
          .expect(201)
          .end((err, res) => {
            if (err) return done(err)
            assert.equal(db.posts.length, 3)
            done()
          })
      }
    )

    it('should support x-www-form-urlencoded',
      (done) => {
        request(server)
          .post('/posts')
          .type('form')
          .send({body: 'foo', booleanValue: true, integerValue: 1})
          .expect('Content-Type', /json/)
          // x-www-form-urlencoded will convert to string
          .expect({id: 3, body: 'foo', booleanValue: 'true', integerValue: '1'})
          .expect(201)
          .end((err, res) => {
            if (err) return done(err)
            assert.equal(db.posts.length, 3)
            done()
          })
      }
    )

    it('should respond with json, create a resource and generate string id',
      (done) => {
        request(server)
          .post('/refs')
          .send({url: 'http://foo.com', postId: '1'})
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) return done(err)
            assert.equal(db.refs.length, 2)
            done()
          })
      })
  })

  describe('POST /:parent/:parentId/:resource', () => {
    it('should respond with json and set parentId', (done) => {
      request(server)
        .post('/posts/1/comments')
        .send({body: 'foo'})
        .expect('Content-Type', /json/)
        .expect({id: 6, postId: 1, body: 'foo'})
        .expect(201, done)
    })
  })

  describe('PUT /:resource/:id', () => {
    it('should respond with json and replace resource', (done) => {
      var post = {id: 1, booleanValue: true, integerValue: 1}
      request(server)
        .put('/posts/1')
        .set('Accept', 'application/json')
        // body property omitted to test that the resource is replaced
        .send(post)
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          // TODO find a "supertest" way to test this
          // https://github.com/typicode/json-server/issues/396
          assert.deepStrictEqual(res.body, post)
          // assert it was created in database too
          assert.deepStrictEqual(db.posts[0], post)
          done()
        })
    })

    it('should respond with 404 if resource is not found', (done) => {
      request(server)
        .put('/posts/9001')
        .send({id: 1, body: 'bar'})
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('PATCH /:resource/:id', () => {
    it('should respond with json and update resource', (done) => {
      var partial = {body: 'bar'}
      var post = {id: 1, body: 'bar'}
      request(server)
        .patch('/posts/1')
        .send(partial)
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          assert.deepStrictEqual(res.body, post)
          // assert it was created in database too
          assert.deepStrictEqual(db.posts[0], post)
          done()
        })
    })

    it('should respond with 404 if resource is not found', (done) => {
      request(server)
        .patch('/posts/9001')
        .send({body: 'bar'})
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('DELETE /:resource/:id', () => {
    it('should respond with empty data, destroy resource and dependent resources', (done) => {
      request(server)
        .del('/posts/1')
        .expect({})
        .expect(200)
        .end((err, res) => {
          if (err) return done(err)
          assert.equal(db.posts.length, 1)
          assert.equal(db.comments.length, 3)
          done()
        })
    })

    it('should respond with 404 if resource is not found', (done) => {
      request(server)
        .del('/posts/9001')
        .expect('Content-Type', /json/)
        .expect({})
        .expect(404, done)
    })
  })

  describe('Static routes', () => {
    describe('GET /', () => {
      it('should respond with html', (done) => {
        request(server)
          .get('/')
          .expect(/You're successfully running JSON Server/)
          .expect(200, done)
      })
    })

    describe('GET /main.js', () => {
      it('should respond with js', (done) => {
        request(server)
          .get('/main.js')
          .expect('Content-Type', /javascript/)
          .expect(200, done)
      })
    })

    describe('GET /style.css', () => {
      it('should respond with css', (done) => {
        request(server)
          .get('/style.css')
          .expect('Content-Type', /css/)
          .expect(200, done)
      })
    })
  })

  describe('Database state', () => {
    it('should be accessible', () => {
      assert(router.db.getState())
    })
  })

  describe('Responses', () => {
    it('should have no cache headers (for IE)', (done) => {
      request(server)
        .get('/db')
        .expect('Cache-Control', 'no-cache')
        .expect('Pragma', 'no-cache')
        .expect('Expires', '-1')
        .end(done)
    })
  })

  describe('Rewriter', () => {
    it('should rewrite using prefix', (done) => {
      request(server)
        .get('/api/posts/1')
        .expect(db.posts[0])
        .end(done)
    })

    it('should rewrite using params', (done) => {
      request(server)
        .get('/blog/posts/1/show')
        .expect(db.posts[0])
        .end(done)
    })

    it('should rewrite using query without params', (done) => {
      const expectedPost = _.cloneDeep(db.posts[0])
      expectedPost.comments = [ db.comments[0], db.comments[1] ]
      request(server)
        .get('/firstpostwithcomments')
        .expect(expectedPost)
        .end(done)
    })

    it('should rewrite using params and query', (done) => {
      request(server)
        .get('/comments/special/1-quux')
        .expect([db.comments[4]])
        .end(done)
    })

    // TODO
    // it('should rewrite query params', (done) => {
    //   request(server)
    //     .get('/articles?_id=1')
    //     .expect(db.posts[0])
    //     .end(done)
    // })

    it('should expose routes', (done) => {
      request(server)
        .get('/__rules')
        .expect(rewriterRules)
        .end(done)
    })
  })

  describe('router.render', (done) => {
    beforeEach(() => {
      router.render = (req, res) => {
        res.jsonp({
          data: res.locals.data
        })
      }
    })

    it('should be possible to wrap response', (done) => {
      request(server)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect({ data: db.posts[0] })
        .expect(200, done)
    })
  })

  describe('router.db._.id', (done) => {
    beforeEach(() => {
      router.db.setState({
        posts: [
          { _id: 1 }
        ]
      })

      router.db._.id = '_id'
    })

    it('should be possible to GET using a different id property', (done) => {
      request(server)
        .get('/posts/1')
        .expect('Content-Type', /json/)
        .expect(router.db.getState().posts[0])
        .expect(200, done)
    })

    it('should be possible to POST using a different id property', (done) => {
      request(server)
        .post('/posts')
        .send({ body: 'hello' })
        .expect('Content-Type', /json/)
        .expect({ _id: 2, body: 'hello' })
        .expect(201, done)
    })
  })
})
