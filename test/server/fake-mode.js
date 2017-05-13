const assert = require('assert')
const _ = require('lodash')
const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Fake mode', () => {
  let server
  let router

  before(() => {
    const db = {
      posts: [{
        id: 1,
        title: 'foo'
      }],
      user: {
        name: 'foo'
      }
    }

    server = jsonServer.create()
    router = jsonServer.router(db)
    server.use(jsonServer.defaults())
    server.use(jsonServer.rewriter(rewriterRules))
    server.use(router)
  })

  describe('POST /:resource', {
    it('shouldn\'t update db', async () => {
      await request(server)
        .post('/posts')
        .send({title: 'bar'})
        .expect('Access-Control-Expose-Headers', 'Location')
        .expect('Location', /posts\/2$/)
        .expect('Content-Type', /json/)
        .expect({id: 1, title: 'bar'})
        .expect(201)
      assert.equal(db.posts.length, 1)
    })
  })

  describe('PUT /:resource/:id', () => {
    it('shouldn\'t update db', async () => {
      const post = {id: 1, title: 'update'}
      const res = await request(server)
        .put('/posts/1')
        .set('Accept', 'application/json')
        // title property omitted to test that the resource is replaced
        .send(post)
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
      // TODO find a "supertest" way to test this
      // https://github.com/typicode/json-server/issues/396
      assert.deepStrictEqual(res.body, post)
      // assert it wasn't update in database
      assert.notDeepStrictEqual(db.posts[0], post)
    })
  })

  describe('PATCH /:resource/:id', () => {
    it('should respond with json and update resource', async () => {
      const partial = {title: 'bar'}
      const post = {id: 1, title: 'bar'}
      const res = await request(server)
        .patch('/posts/1')
        .send(partial)
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
      assert.deepStrictEqual(res.body, post)
      // assert it was created in database too
      assert.notDeepStrictEqual(db.posts[0], post)
    })
  })
})
