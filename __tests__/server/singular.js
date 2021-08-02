const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Server', () => {
  let server
  let router
  let db

  beforeEach(() => {
    db = {}

    db.user = {
      name: 'foo',
      email: 'foo@example.com',
    }

    server = jsonServer.create()
    router = jsonServer.router(db)
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:resource', () => {
    test('should respond with corresponding resource', () =>
      request(server).get('/user').expect(200, db.user))
  })

  describe('POST /:resource', () => {
    test('should create resource', () => {
      const user = { name: 'bar' }
      return request(server).post('/user').send(user).expect(201, user)
    })
  })

  describe('PUT /:resource', () => {
    test('should update resource', () => {
      const user = { name: 'bar' }
      return request(server).put('/user').send(user).expect(200, user)
    })
  })

  describe('PATCH /:resource', () => {
    test('should update resource', () =>
      request(server)
        .patch('/user')
        .send({ name: 'bar' })
        .expect(200, { name: 'bar', email: 'foo@example.com' }))
  })
})
