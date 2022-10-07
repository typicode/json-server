const assert = require('assert')
const { Router } = require('express')
const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Server', () => {
  let server
  let router
  let db
  let customRouter
  let customRespond

  beforeEach(() => {
    db = {}

    db.posts = [
      { id: 1, body: 'foo' },
      { id: 2, body: 'bar' },
    ]

    db.tags = [
      { id: 1, body: 'Technology' },
      { id: 2, body: 'Photography' },
      { id: 3, body: 'photo' },
    ]

    customRespond = { data: 'Custom respond', message: 'Hello' }

    server = jsonServer.create()
    customRouter = Router()
    router = jsonServer.router(db, { customRouter })
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:resource', () => {
    test('should respond with json and custom resources', () => {
      const route = '/posts'
      customRouter.get(route, (req, res) => {
        res.jsonp(customRespond)
      })

      return request(server)
        .get(route)
        .set('Origin', 'http://example.com')
        .expect('Content-Type', /json/)
        .expect('Access-Control-Allow-Credentials', 'true')
        .expect('Access-Control-Allow-Origin', 'http://example.com')
        .expect(200, customRespond)
    })
  })

  describe('POST /:resource', () => {
    test('should respond with custom json, create a resource and increment id', async () => {
      const route = '/posts'
      customRouter.post(route, (req, res) => {
        res.jsonp(customRespond)
      })

      await request(server)
        .post('/posts')
        .send({ body: 'foo', booleanValue: true, integerValue: 1 })
        .expect('Access-Control-Expose-Headers', 'Location')
        .expect('Location', /posts\/3$/)
        .expect('Content-Type', /json/)
        .expect(201, customRespond)
      assert.strictEqual(db.posts.length, 3)
    })
  })
})
