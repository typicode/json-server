import assert from 'node:assert/strict'
import test from 'node:test'

import { Low, Memory } from 'lowdb'

import { Data, Item, PaginatedItems, Service } from './service.js'

const defaultData = { posts: [], comments: [], object: {} }
const adapter = new Memory<Data>()
const db = new Low<Data>(adapter, defaultData)
const service = new Service(db)

const POSTS = 'posts'
const COMMENTS = 'comments'
const OBJECT = 'object'

const UNKNOWN_RESOURCE = 'xxx'
const UNKNOWN_ID = 'xxx'

const post1 = {
  id: '1',
  title: 'a',
  views: 100,
  published: true,
  author: { name: 'foo' },
  tags: ['foo', 'bar'],
}
const post2 = {
  id: '2',
  title: 'b',
  views: 200,
  published: false,
  author: { name: 'bar' },
  tags: ['bar'],
}
const post3 = {
  id: '3',
  title: 'c',
  views: 300,
  published: false,
  author: { name: 'baz' },
  tags: ['foo'],
}
const comment1 = { id: '1', title: 'a', postId: '1' }
const items = 3

const obj = {
  f1: 'foo',
}

function reset() {
  db.data = structuredClone({
    posts: [post1, post2, post3],
    comments: [comment1],
    object: obj,
  })
}

await test('constructor', () => {
  const defaultData = { posts: [{ id: '1' }, {}], object: {} } satisfies Data
  const db = new Low<Data>(adapter, defaultData)
  new Service(db)
  if (Array.isArray(db.data['posts'])) {
    const id0 = db.data['posts']?.at(0)?.['id']
    const id1 = db.data['posts']?.at(1)?.['id']
    assert.ok(
      typeof id1 === 'string' && id1.length > 0,
      `id should be a non empty string but was: ${String(id1)}`,
    )
    assert.ok(
      typeof id0 === 'string' && id0 === '1',
      `id should not change if already set but was: ${String(id0)}`,
    )
  }
})

await test('findById', () => {
  reset()
  if (!Array.isArray(db.data?.[POSTS]))
    throw new Error('posts should be an array')
  assert.deepEqual(service.findById(POSTS, '1', {}), db.data?.[POSTS]?.[0])
  assert.equal(service.findById(POSTS, UNKNOWN_ID, {}), undefined)
  assert.deepEqual(service.findById(POSTS, '1', { _embed: ['comments'] }), {
    ...post1,
    comments: [comment1],
  })
  assert.deepEqual(service.findById(COMMENTS, '1', { _embed: ['post'] }), {
    ...comment1,
    post: post1,
  })
  assert.equal(service.findById(UNKNOWN_RESOURCE, '1', {}), undefined)
})

await test('find', async (t) => {
  const arr: {
    data?: Data
    name: string
    params?: Parameters<Service['find']>[1]
    res: Item | Item[] | PaginatedItems | undefined
    error?: Error
  }[] = [
    {
      name: POSTS,
      res: [post1, post2, post3],
    },
    {
      name: POSTS,
      params: { id: post1.id },
      res: [post1],
    },
    {
      name: POSTS,
      params: { id: UNKNOWN_ID },
      res: [],
    },
    {
      name: POSTS,
      params: { views: post1.views.toString() },
      res: [post1],
    },
    {
      name: POSTS,
      params: { 'author.name': post1.author.name },
      res: [post1],
    },
    {
      name: POSTS,
      params: { 'tags[0]': 'foo' },
      res: [post1, post3],
    },
    {
      name: POSTS,
      params: { id: UNKNOWN_ID, views: post1.views.toString() },
      res: [],
    },
    {
      name: POSTS,
      params: { views_ne: post1.views.toString() },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { views_lt: (post1.views + 1).toString() },
      res: [post1],
    },
    {
      name: POSTS,
      params: { views_lt: post1.views.toString() },
      res: [],
    },
    {
      name: POSTS,
      params: { views_lte: post1.views.toString() },
      res: [post1],
    },
    {
      name: POSTS,
      params: { views_gt: post1.views.toString() },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { views_gt: (post1.views - 1).toString() },
      res: [post1, post2, post3],
    },
    {
      name: POSTS,
      params: { views_gte: post1.views.toString() },
      res: [post1, post2, post3],
    },
    {
      name: POSTS,
      params: {
        views_gt: post1.views.toString(),
        views_lt: post3.views.toString(),
      },
      res: [post2],
    },
    {
      data: { posts: [post3, post1, post2] },
      name: POSTS,
      params: { _sort: 'views' },
      res: [post1, post2, post3],
    },
    {
      data: { posts: [post3, post1, post2] },
      name: POSTS,
      params: { _sort: '-views' },
      res: [post3, post2, post1],
    },
    {
      data: { posts: [post3, post1, post2] },
      name: POSTS,
      params: { _sort: '-views,id' },
      res: [post3, post2, post1],
    },
    {
      name: POSTS,
      params: { published: 'true' },
      res: [post1],
    },
    {
      name: POSTS,
      params: { published: 'false' },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { views_lt: post3.views.toString(), published: 'false' },
      res: [post2],
    },
    {
      name: POSTS,
      params: { _start: 0, _end: 2 },
      res: [post1, post2],
    },
    {
      name: POSTS,
      params: { _start: 1, _end: 3 },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { _start: 0, _limit: 2 },
      res: [post1, post2],
    },
    {
      name: POSTS,
      params: { _start: 1, _limit: 2 },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { _page: 1, _per_page: 2 },
      res: {
        first: 1,
        last: 2,
        prev: null,
        next: 2,
        pages: 2,
        items,
        data: [post1, post2],
      },
    },
    {
      name: POSTS,
      params: { _page: 2, _per_page: 2 },
      res: {
        first: 1,
        last: 2,
        prev: 1,
        next: null,
        pages: 2,
        items,
        data: [post3],
      },
    },
    {
      name: POSTS,
      params: { _page: 3, _per_page: 2 },
      res: {
        first: 1,
        last: 2,
        prev: 1,
        next: null,
        pages: 2,
        items,
        data: [post3],
      },
    },
    {
      name: POSTS,
      params: { _page: 2, _per_page: 1 },
      res: {
        first: 1,
        last: 3,
        prev: 1,
        next: 3,
        pages: 3,
        items,
        data: [post2],
      },
    },
    {
      name: POSTS,
      params: { _embed: ['comments'] },
      res: [
        { ...post1, comments: [comment1] },
        { ...post2, comments: [] },
        { ...post3, comments: [] },
      ],
    },
    {
      name: COMMENTS,
      params: { _embed: ['post'] },
      res: [{ ...comment1, post: post1 }],
    },
    {
      name: UNKNOWN_RESOURCE,
      res: undefined,
    },
    {
      name: OBJECT,
      res: obj,
    },
  ]
  for (const tc of arr) {
    await t.test(`${tc.name} ${JSON.stringify(tc.params)}`, () => {
      if (tc.data) {
        db.data = tc.data
      } else {
        reset()
      }

      assert.deepEqual(service.find(tc.name, tc.params), tc.res)
    })
  }
})

await test('create', async () => {
  reset()
  const post = { title: 'new post' }
  const res = await service.create(POSTS, post)
  assert.equal(res?.['title'], post.title)
  assert.equal(typeof res?.['id'], 'string', 'id should be a string')

  assert.equal(await service.create(UNKNOWN_RESOURCE, post), undefined)
})

await test('update', async () => {
  reset()
  const obj = { f1: 'bar' }
  const res = await service.update(OBJECT, obj)
  assert.equal(res, obj)

  assert.equal(
    await service.update(UNKNOWN_RESOURCE, obj),
    undefined,
    'should ignore unknown resources',
  )
  assert.equal(
    await service.update(POSTS, {}),
    undefined,
    'should ignore arrays',
  )
})

await test('updateById', async () => {
  reset()
  const post = { id: 'xxx', title: 'updated post' }
  const res = await service.updateById(POSTS, post1.id, post)
  assert.equal(res?.['id'], post1.id, 'id should not change')
  assert.equal(res?.['title'], post.title)

  assert.equal(
    await service.updateById(UNKNOWN_RESOURCE, post1.id, post),
    undefined,
  )
  assert.equal(await service.updateById(POSTS, UNKNOWN_ID, post), undefined)
})

await test('patchById', async () => {
  reset()
  const post = { id: 'xxx', title: 'updated post' }
  const res = await service.patchById(POSTS, post1.id, post)
  assert.notEqual(res, undefined)
  assert.equal(res?.['id'], post1.id)
  assert.equal(res?.['title'], post.title)

  assert.equal(
    await service.patchById(UNKNOWN_RESOURCE, post1.id, post),
    undefined,
  )
  assert.equal(await service.patchById(POSTS, UNKNOWN_ID, post), undefined)
})

await test('destroy', async () => {
  reset()
  let prevLength = Number(db.data?.[POSTS]?.length) || 0
  await service.destroyById(POSTS, post1.id)
  assert.equal(db.data?.[POSTS]?.length, prevLength - 1)
  assert.deepEqual(db.data?.[COMMENTS], [{ ...comment1, postId: null }])

  reset()
  prevLength = db.data?.[POSTS]?.length || 0
  await service.destroyById(POSTS, post1.id, [COMMENTS])
  assert.equal(db.data[POSTS].length, prevLength - 1)
  assert.equal(db.data[COMMENTS].length, 0)

  assert.equal(await service.destroyById(UNKNOWN_RESOURCE, post1.id), undefined)
  assert.equal(await service.destroyById(POSTS, UNKNOWN_ID), undefined)
})
