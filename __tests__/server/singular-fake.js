const assert = require('assert')
const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Fake server', () => {
  let server
  let router
  let db

  beforeEach(() => {
    db = {}

    db.user = {
      name: 'foo',
      email: 'foo@example.com'
    }

    server = jsonServer.create()
    router = jsonServer.router(db, { _isFake: true })
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('POST /:resource', () => {
    test('should not create resource', async () => {
      const user = { name: 'bar' }
      await request(server)
        .post('/user')
        .send(user)
        .expect(user)
        .expect(201)
      assert.notDeepStrictEqual(db.user, user)
    })
  })

  describe('PUT /:resource', () => {
    test('should not update resource', async () => {
      const user = { name: 'bar' }
      await request(server)
        .put('/user')
        .send(user)
        .expect(user)
        .expect(200)
      assert.notDeepStrictEqual(db.user, user)
    })
  })

  describe('PATCH /:resource', () => {
    test('should not update resource', async () => {
      const user = { name: 'bar' }
      await request(server)
        .patch('/user')
        .send(user)
        .expect({ name: 'bar', email: 'foo@example.com' })
        .expect(200)
      assert.notDeepStrictEqual(db.user, user)
    })
  })
})
