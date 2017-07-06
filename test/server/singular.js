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
      email: 'foo@example.com'
    }

    server = jsonServer.create()
    router = jsonServer.router(db)
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:resource', () => {
    it('should respond with corresponding resource', () =>
      request(server).get('/user').expect(db.user).expect(200))
  })

  describe('POST /:resource', () => {
    it('should create resource', () => {
      const user = { name: 'bar' }
      return request(server).post('/user').send(user).expect(user).expect(201)
    })
  })

  describe('PUT /:resource', () => {
    it('should update resource', () => {
      const user = { name: 'bar' }
      return request(server).put('/user').send(user).expect(user).expect(200)
    })
  })

  describe('PATCH /:resource', () => {
    it('should update resource', () =>
      request(server)
        .patch('/user')
        .send({ name: 'bar' })
        .expect({ name: 'bar', email: 'foo@example.com' })
        .expect(200))
  })
})
