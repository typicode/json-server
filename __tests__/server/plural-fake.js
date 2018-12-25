const assert = require('assert')
const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Fake server', () => {
  let server
  let router
  let db

  beforeEach(() => {
    db = {}

    db.posts = [{ id: 1, body: 'foo' }, { id: 2, body: 'bar' }]

    server = jsonServer.create()
    router = jsonServer.router(db, { _isFake: true })
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('POST /:resource', () => {
    test('should respond with json, create a resource and increment id', async () => {
      await request(server)
        .post('/posts')
        .send({ body: 'foo', booleanValue: true, integerValue: 1 })
        .expect('Access-Control-Expose-Headers', 'Location')
        .expect('Location', /posts\/3$/)
        .expect('Content-Type', /json/)
        .expect({ id: 3, body: 'foo', booleanValue: true, integerValue: 1 })
        .expect(201)
      // assert it was not created in database
      assert.equal(db.posts.length, 2)
    })
  })

  describe('PUT /:resource/:id', () => {
    test('should respond with json and replace resource', async () => {
      const post = { id: 1, booleanValue: true, integerValue: 1 }
      const res = await request(server)
        .put('/posts/1')
        .set('Accept', 'application/json')
        // body property omitted to test that the resource is replaced
        .send(post)
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
      // TODO find a "supertest" way to test this
      // https://github.com/typicode/json-server/issues/396
      assert.deepStrictEqual(res.body, post)
      // assert it was not created in database
      assert.notDeepStrictEqual(db.posts[0], post)
    })
  })

  describe('PATCH /:resource/:id', () => {
    test('should respond with json and update resource', async () => {
      const partial = { body: 'bar' }
      const post = { id: 1, body: 'bar' }
      const res = await request(server)
        .patch('/posts/1')
        .send(partial)
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
      assert.deepStrictEqual(res.body, post)
      // assert it was not created in database
      assert.notDeepStrictEqual(db.posts[0], post)
    })
  })

  describe('DELETE /:resource/:id', () => {
    test('should respond with empty data, destroy resource and dependent resources', async () => {
      await request(server)
        .del('/posts/1')
        .expect({})
        .expect(200)
      // assert it was not created in database
      assert.equal(db.posts.length, 2)
    })
  })
})
