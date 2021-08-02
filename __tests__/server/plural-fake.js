const assert = require('assert')
const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Fake server', () => {
  let server
  let router
  let db

  beforeEach(() => {
    db = {}

    db.posts = [
      { id: 1, body: 'foo' },
      { id: 2, body: 'bar' },
    ]

    db.comments = [
      { id: 1, body: 'foo', published: true, postId: 1, userId: 1 },
      { id: 2, body: 'bar', published: false, postId: 1, userId: 2 },
      { id: 3, body: 'baz', published: false, postId: 2, userId: 1 },
      { id: 4, body: 'qux', published: true, postId: 2, userId: 2 },
      { id: 5, body: 'quux', published: false, postId: 2, userId: 1 },
    ]

    server = jsonServer.create()
    router = jsonServer.router(db, { _isFake: true })
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:parent/:parentId/:resource', () => {
    test('should respond with json and corresponding nested resources', () =>
      request(server)
        .get('/posts/1/comments')
        .expect('Content-Type', /json/)
        .expect(200, [db.comments[0], db.comments[1]]))
  })

  describe('POST /:resource', () => {
    test('should not create a resource', async () => {
      await request(server)
        .post('/posts')
        .send({ body: 'foo', booleanValue: true, integerValue: 1 })
        .expect('Access-Control-Expose-Headers', 'Location')
        .expect('Location', /posts\/3$/)
        .expect('Content-Type', /json/)
        .expect(201, {
          id: 3,
          body: 'foo',
          booleanValue: true,
          integerValue: 1,
        })
      assert.strictEqual(db.posts.length, 2)
    })
  })

  describe('PUT /:resource/:id', () => {
    test('should not replace resource', async () => {
      const post = { id: 1, booleanValue: true, integerValue: 1 }
      const res = await request(server)
        .put('/posts/1')
        .set('Accept', 'application/json')
        // body property omitted to test that the resource is replaced
        .send(post)
        .expect('Content-Type', /json/)
        .expect(200, post)
      // TODO find a "supertest" way to test this
      // https://github.com/typicode/json-server/issues/396
      assert.deepStrictEqual(res.body, post)
      assert.notDeepStrictEqual(db.posts[0], post)
    })
  })

  describe('PATCH /:resource/:id', () => {
    test('should not update resource', async () => {
      const partial = { body: 'bar' }
      const post = { id: 1, body: 'bar' }
      const res = await request(server)
        .patch('/posts/1')
        .send(partial)
        .expect('Content-Type', /json/)
        .expect(200, post)
      assert.deepStrictEqual(res.body, post)
      assert.notDeepStrictEqual(db.posts[0], post)
    })
  })

  describe('DELETE /:resource/:id', () => {
    test('should not destroy resource', async () => {
      await request(server).del('/posts/1').expect(200, {})
      assert.strictEqual(db.posts.length, 2)
    })
  })
})
