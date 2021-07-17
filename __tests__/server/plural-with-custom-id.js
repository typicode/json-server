const _ = require('lodash')
const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Server with --id Id', () => {
  let server
  let router
  let db

  beforeEach(() => {
    db = {}

    db.posts = [
      { Id: 1, body: 'foo' },
      { Id: 2, body: 'bar' }
    ]

    db.comments = [
      { Id: 1, postId: 1 },
      { Id: 2, postId: 1 },
      { Id: 3, postId: 2 }
    ]

    server = jsonServer.create()
    router = jsonServer.router(db, { foreignKeySuffix: 'Id' })
    router.db._.id = 'Id'
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:resource?_embed=', () => {
    test('should respond with all resources and their embedded entities', () => {
      const posts = _.cloneDeep(db.posts)
      posts[0].comments = [db.comments[0], db.comments[1]]
      posts[1].comments = [db.comments[2]]
      return request(server)
        .get('/posts?_embed=comments')
        .expect('Content-Type', /json/)
        .expect(posts)
        .expect(200)
    })
  })

  describe('GET /:resource/:id?_embed=', () => {
    test('should respond with the resource and its embedded entities', () => {
      const post = {
        ...db.posts[0],
        comments: [db.comments[0], db.comments[1]]
      }

      return request(server)
        .get('/posts/1?_embed=comments')
        .expect('Content-Type', /json/)
        .expect(post)
        .expect(200)
    })
  })
})
