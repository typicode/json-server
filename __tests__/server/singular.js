const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Server', () => {
  let server
  let router
  let db

  beforeEach(() => {
    db = {}

    db.user = {
      id: 1,
      name: 'foo',
      email: 'foo@example.com',
      groupId: 1
    }

    db.groups = [
      {
        id: 1,
        name: 'Developers'
      },
      {
        id: 2,
        name: 'Contributors'
      }
    ]

    db.comments = [
      {
        id: 1,
        body: 'foo',
        userId: 1
      }
    ]

    server = jsonServer.create()
    router = jsonServer.router(db)
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:resource', () => {
    test('should respond with corresponding resource', () =>
      request(server)
        .get('/user')
        .expect(db.user)
        .expect(200))
  })

  describe('GET /:resource?_field=', () => {
    test('should filter the response fields', () =>
      request(server)
        .get('/user?_field=name')
        .expect({
          name: db.user.name
        })
        .expect(200))
  })

  describe('GET /:resource?_embed=', () => {
    test('should respond with corresponding resources and embedded resources', () =>
      request(server)
        .get('/user?_embed=comments')
        .expect(
          Object.assign(
            {
              comments: [db.comments[0]]
            },
            db.user
          )
        )
        .expect(200))
  })

  describe('GET /:resource?_expand=', () => {
    test('should respond with corresponding resources and expanded resources', () =>
      request(server)
        .get('/user?_expand=group')
        .expect(
          Object.assign(
            {
              group: db.groups[0]
            },
            db.user
          )
        )
        .expect(200))
  })

  describe('POST /:resource', () => {
    test('should create resource', () => {
      const user = { name: 'bar' }
      return request(server)
        .post('/user')
        .send(user)
        .expect(user)
        .expect(201)
    })
  })

  describe('PUT /:resource', () => {
    test('should update resource', () => {
      const user = { name: 'bar' }
      return request(server)
        .put('/user')
        .send(user)
        .expect(user)
        .expect(200)
    })
  })

  describe('PATCH /:resource', () => {
    test('should update resource', () =>
      request(server)
        .patch('/user')
        .send({ name: 'bar' })
        .expect(
          Object.assign({}, db.user, { name: 'bar', email: 'foo@example.com' })
        )
        .expect(200))
  })
})
