const request = require('supertest')
const jsonServer = require('../../src/server')

describe('Server with custom query parameters', () => {
  let server
  let router
  let db
  let queryParameters

  beforeEach(() => {
    db = {}

    db.posts = [{ id: 1, body: 'foo' }, { id: 2, body: 'bar' }]

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
      {
        id: 1,
        body: 'foo',
        published: true,
        postId: 1,
        userId: 1,
        createdAt: '2017-01-01T00:00:00'
      },
      {
        id: 2,
        body: 'bar',
        published: false,
        postId: 1,
        userId: 2,
        createdAt: '2017-01-02T00:00:01'
      },
      {
        id: 3,
        body: 'baz',
        published: false,
        postId: 2,
        userId: 1,
        createdAt: '2017-01-02T00:00:02'
      },
      {
        id: 4,
        body: 'qux',
        published: true,
        postId: 2,
        userId: 2,
        createdAt: '2017-01-02T00:00:03'
      },
      {
        id: 5,
        body: 'quux',
        published: false,
        postId: 2,
        userId: 1,
        createdAt: '2017-01-02T00:00:00'
      }
    ]

    db.buyers = [
      { id: 1, name: 'Aileen', country: 'Colombia', total: 100 },
      { id: 2, name: 'Barney', country: 'Colombia', total: 200 },
      { id: 3, name: 'Carley', country: 'Colombia', total: 300 },
      { id: 4, name: 'Daniel', country: 'Belize', total: 30 },
      { id: 5, name: 'Ellen', country: 'Belize', total: 20 },
      { id: 6, name: 'Frank', country: 'Belize', total: 10 },
      { id: 7, name: 'Grace', country: 'Argentina', total: 1 },
      { id: 8, name: 'Henry', country: 'Argentina', total: 2 },
      { id: 9, name: 'Isabelle', country: 'Argentina', total: 3 }
    ]

    db.refs = [
      { id: 'abcd-1234', url: 'http://example.com', postId: 1, userId: 1 }
    ]

    db.stringIds = [{ id: '1234' }]

    db.deep = [{ a: { b: 1 } }, { a: 1 }]

    db.nested = [
      { resource: { name: 'dewey' } },
      { resource: { name: 'cheatem' } },
      { resource: { name: 'howe' } }
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

    queryParameters = {
      q: '_q',
      _start: '__start',
      _end: '__end',
      _page: '__page',
      _sort: '__sort',
      _order: '__order',
      _limit: '__limit',
      _embed: '__embed',
      _expand: '__expand',
      _lte: '__lte',
      _gte: '__gte',
      _ne: '__ne',
      _like: '__like'
    }

    server = jsonServer.create()
    router = jsonServer.router(db, { queryParameters: queryParameters })
    server.use(jsonServer.defaults())
    server.use(router)
  })

  describe('GET /:resource?attr=&attr=', () => {
    it('should respond with json and filter resources', () =>
      request(server)
        .get('/comments?postId=1&published=true')
        .expect('Content-Type', /json/)
        .expect([db.comments[0]])
        .expect(200))

    it('should be strict', () =>
      request(server)
        .get('/users?tel=123')
        .expect('Content-Type', /json/)
        .expect([db.users[1]])
        .expect(200))

    it('should support multiple filters', () =>
      request(server)
        .get('/comments?id=1&id=2')
        .expect('Content-Type', /json/)
        .expect([db.comments[0], db.comments[1]])
        .expect(200))

    it('should support deep filter', () =>
      request(server)
        .get('/deep?a.b=1')
        .expect('Content-Type', /json/)
        .expect([db.deep[0]])
        .expect(200))

    it('should ignore JSONP query parameters callback and _ ', () =>
      request(server)
        .get('/comments?callback=1&_=1')
        .expect('Content-Type', /text/)
        .expect(new RegExp(db.comments[0].body)) // JSONP returns text
        .expect(200))

    it('should ignore unknown query parameters', () =>
      request(server)
        .get('/comments?foo=1&bar=2')
        .expect('Content-Type', /json/)
        .expect(db.comments)
        .expect(200))

    // https://github.com/typicode/json-server/issues/510
    it('should not fail with null value', () => {
      db.posts.push({ id: 99, body: null })
      return request(server)
        .get('/posts?body=foo')
        .expect('Content-Type', /json/)
        .expect([db.posts[0]])
        .expect(200)
    })
  })

  describe('GET /:resource?_q=', () => {
    it('should respond with json and make a full-text search', () =>
      request(server)
        .get('/tags?_q=pho')
        .expect('Content-Type', /json/)
        .expect([db.tags[1], db.tags[2]])
        .expect(200))

    it('should respond with json and make a deep full-text search', () =>
      request(server)
        .get('/deep?_q=1')
        .expect('Content-Type', /json/)
        .expect(db.deep)
        .expect(200))

    it('should return an empty array when nothing is matched', () =>
      request(server)
        .get('/tags?_q=nope')
        .expect('Content-Type', /json/)
        .expect([])
        .expect(200))

    it('should support other query parameters', () =>
      request(server)
        .get('/comments?_q=qu&published=true')
        .expect('Content-Type', /json/)
        .expect([db.comments[3]])
        .expect(200))

    it('should ignore duplicate _q query parameters', () =>
      request(server)
        .get('/comments?_q=foo&_q=bar')
        .expect('Content-Type', /json/)
        .expect([db.comments[0]])
        .expect(200))

    it('should support filtering by boolean value false', () =>
      request(server)
        .get('/comments?published=false')
        .expect('Content-Type', /json/)
        .expect([db.comments[1], db.comments[2], db.comments[4]])
        .expect(200))
  })

  describe('GET /:resource?__end=', () => {
    it('should respond with a sliced array', () =>
      request(server)
        .get('/comments?__end=2')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(0, 2))
        .expect(200))
  })

  describe('GET /:resource?__sort=', () => {
    it('should respond with json and sort on a field', () =>
      request(server)
        .get('/tags?__sort=body')
        .expect('Content-Type', /json/)
        .expect([db.tags[1], db.tags[0], db.tags[2]])
        .expect(200))

    it('should reverse sorting with __order=DESC', () =>
      request(server)
        .get('/tags?__sort=body&__order=DESC')
        .expect('Content-Type', /json/)
        .expect([db.tags[2], db.tags[0], db.tags[1]])
        .expect(200))

    it('should sort on numerical field', () =>
      request(server)
        .get('/posts?_sort=id&__order=DESC')
        .expect('Content-Type', /json/)
        .expect(db.posts.reverse())
        .expect(200))

    it('should sort on nested field', () =>
      request(server)
        .get('/nested?__sort=resource.name')
        .expect('Content-Type', /json/)
        .expect([db.nested[1], db.nested[0], db.nested[2]])
        .expect(200))

    it('should sort on multiple fields', () =>
      request(server)
        .get('/buyers?__sort=country,total&__order=asc,desc')
        .expect('Content-Type', /json/)
        .expect([
          db.buyers[8],
          db.buyers[7],
          db.buyers[6],
          db.buyers[3],
          db.buyers[4],
          db.buyers[5],
          db.buyers[2],
          db.buyers[1],
          db.buyers[0]
        ])
        .expect(200))
  })

  describe('GET /:resource?__start=&__end=', () => {
    it('should respond with a sliced array', () =>
      request(server)
        .get('/comments?__start=1&__end=2')
        .expect('Content-Type', /json/)
        .expect('X-Total-Count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(1, 2))
        .expect(200))
  })

  describe('GET /:resource?__start=&__limit=', () => {
    it('should respond with a limited array', () =>
      request(server)
        .get('/comments?__start=1&__limit=1')
        .expect('Content-Type', /json/)
        .expect('X-Total-Count', db.comments.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count')
        .expect(db.comments.slice(1, 2))
        .expect(200))
  })

  describe('GET /:resource?__page=', () => {
    it('should paginate', () =>
      request(server)
        .get('/list?__page=2')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.list.length.toString())
        .expect('Access-Control-Expose-Headers', 'X-Total-Count, Link')
        .expect(db.list.slice(10, 20))
        .expect(200))
  })

  describe('GET /:resource?__page=&__limit=', () => {
    it('should paginate with a custom limit', () => {
      const link = [
        '<http://localhost/list?__page=1&__limit=1>; rel="first"',
        '<http://localhost/list?__page=1&__limit=1>; rel="prev"',
        '<http://localhost/list?__page=3&__limit=1>; rel="next"',
        '<http://localhost/list?__page=15&__limit=1>; rel="last"'
      ].join(', ')
      return request(server)
        .get('/list?__page=2&__limit=1')
        .set('host', 'localhost')
        .expect('Content-Type', /json/)
        .expect('x-total-count', db.list.length.toString())
        .expect('link', link)
        .expect('Access-Control-Expose-Headers', 'X-Total-Count, Link')
        .expect(db.list.slice(1, 2))
        .expect(200)
    })
  })

  describe('GET /:resource?attr__gte=&attr__lte=', () => {
    it('in case of numbers, should respond with a limited array', () =>
      request(server)
        .get('/comments?id__gte=2&id__lte=3')
        .expect('Content-Type', /json/)
        .expect(db.comments.slice(1, 3))
        .expect(200))
  })

  describe('GET /:resource?attr__gte=&attr__lte=', () => {
    it('in case of strings, should respond with a limited array', () =>
      request(server)
        .get(
          '/comments?createdAt__gte=2017-01-02T00:00:01&createdAt__lte=2017-01-02T00:00:02'
        )
        .expect('Content-Type', /json/)
        .expect(db.comments.slice(1, 3))
        .expect(200))
  })

  describe('GET /:resource?attr__ne=', () => {
    it('should respond with a limited array', () =>
      request(server)
        .get('/comments?id__ne=1')
        .expect('Content-Type', /json/)
        .expect(db.comments.slice(1))
        .expect(200))
  })

  describe('GET /:resource?attr__like=', () => {
    it('should respond with an array that matches the like operator (case insensitive)', () =>
      request(server)
        .get('/tags?body__like=photo')
        .expect('Content-Type', /json/)
        .expect([db.tags[1], db.tags[2]])
        .expect(200))
  })

  describe('GET /:resource?attr__like=', () => {
    it('should respond with an array that matches the like operator with regular expressions (case insensitive)', () =>
      request(server)
        .get('/buyers?country__like=Colombia|Belize')
        .expect('Content-Type', /json/)
        .expect([
          db.buyers[0],
          db.buyers[1],
          db.buyers[2],
          db.buyers[3],
          db.buyers[4],
          db.buyers[5]
        ])
        .expect(200))
  })
})
