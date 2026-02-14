import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'

import { Low, Memory } from 'lowdb'
import type { JsonObject } from 'type-fest'

import type { Data } from './service.ts'
import { Service } from './service.ts'

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
const obj = {
  f1: 'foo',
}

beforeEach(() => {
  db.data = structuredClone({
    posts: [post1, post2, post3],
    comments: [comment1],
    object: obj,
  })
})

await test('constructor', () => {
  const defaultData = { posts: [{ id: '1' }, {}], object: {} } satisfies Data
  const db = new Low<Data>(adapter, defaultData)
  new Service(db)
  if (Array.isArray(db.data['posts'])) {
    const id0 = db.data['posts'][0]['id']
    const id1 = db.data['posts'][1]['id']
    assert.ok(
      typeof id0 === 'string' && id0 === '1',
      `id should not change if already set but was: ${id0}`,
    )
    assert.ok(
      typeof id1 === 'string' && id1.length > 0,
      `id should be a non empty string but was: ${id1}`,
    )
  }
})

await test('findById', () => {
  const cases: [[string, string, { _embed?: string[] | string }], unknown][] = [
    [[POSTS, '1', {}], db.data?.[POSTS]?.[0]],
    [[POSTS, UNKNOWN_ID, {}], undefined],
    [[POSTS, '1', { _embed: ['comments'] }], { ...post1, comments: [comment1] }],
    [[COMMENTS, '1', { _embed: ['post'] }], { ...comment1, post: post1 }],
    [[UNKNOWN_RESOURCE, '1', {}], undefined],
  ]

  for (const [[name, id, query], expected] of cases) {
    assert.deepEqual(service.findById(name, id, query), expected)
  }
})

await test('find', async (t) => {
  const whereFromPayload = JSON.parse('{"author":{"name":{"eq":"bar"}}}') as JsonObject

  const cases: [{ where: JsonObject; sort?: string; page?: number; perPage?: number }, unknown][] =
    [
      [{ where: { title: { eq: 'b' } } }, [post2]],
      [{ where: whereFromPayload }, [post2]],
      [{ where: {}, sort: '-views' }, [post3, post2, post1]],
      [
        { where: {}, page: 2, perPage: 2 },
        {
          first: 1,
          prev: 1,
          next: null,
          last: 2,
          pages: 2,
          items: 3,
          data: [post3],
        },
      ],
    ]

  for (const [opts, expected] of cases) {
    await t.test(JSON.stringify(opts), () => {
      assert.deepEqual(service.find(POSTS, opts), expected)
    })
  }
})

await test('create', async () => {
  const post = { title: 'new post' }
  const res = await service.create(POSTS, post)
  assert.equal(res?.['title'], post.title)
  assert.equal(typeof res?.['id'], 'string', 'id should be a string')

  assert.equal(await service.create(UNKNOWN_RESOURCE, post), undefined)
})

await test('update', async () => {
  const obj = { f1: 'bar' }
  const res = await service.update(OBJECT, obj)
  assert.equal(res, obj)

  assert.equal(
    await service.update(UNKNOWN_RESOURCE, obj),
    undefined,
    'should ignore unknown resources',
  )
  assert.equal(await service.update(POSTS, {}), undefined, 'should ignore arrays')
})

await test('patch', async () => {
  const obj = { f2: 'bar' }
  const res = await service.patch(OBJECT, obj)
  assert.deepEqual(res, { f1: 'foo', ...obj })

  assert.equal(
    await service.patch(UNKNOWN_RESOURCE, obj),
    undefined,
    'should ignore unknown resources',
  )
  assert.equal(await service.patch(POSTS, {}), undefined, 'should ignore arrays')
})

await test('updateById', async () => {
  const post = { id: 'xxx', title: 'updated post' }
  const res = await service.updateById(POSTS, post1.id, post)
  assert.equal(res?.['id'], post1.id, 'id should not change')
  assert.equal(res?.['title'], post.title)

  assert.equal(await service.updateById(UNKNOWN_RESOURCE, post1.id, post), undefined)
  assert.equal(await service.updateById(POSTS, UNKNOWN_ID, post), undefined)
})

await test('patchById', async () => {
  const post = { id: 'xxx', title: 'updated post' }
  const res = await service.patchById(POSTS, post1.id, post)
  assert.notEqual(res, undefined)
  assert.equal(res?.['id'], post1.id)
  assert.equal(res?.['title'], post.title)

  assert.equal(await service.patchById(UNKNOWN_RESOURCE, post1.id, post), undefined)
  assert.equal(await service.patchById(POSTS, UNKNOWN_ID, post), undefined)
})

await test('destroy', async (t) => {
  await t.test('nullifies foreign keys', async () => {
    const prevLength = Number(db.data?.[POSTS]?.length) || 0
    await service.destroyById(POSTS, post1.id)
    assert.equal(db.data?.[POSTS]?.length, prevLength - 1)
    assert.deepEqual(db.data?.[COMMENTS], [{ ...comment1, postId: null }])
  })

  await t.test('deletes dependent resources', async () => {
    const prevLength = Number(db.data?.[POSTS]?.length) || 0
    await service.destroyById(POSTS, post1.id, [COMMENTS])
    assert.equal(db.data[POSTS].length, prevLength - 1)
    assert.equal(db.data[COMMENTS].length, 0)
  })

  await t.test('ignores unknown resources', async () => {
    assert.equal(await service.destroyById(UNKNOWN_RESOURCE, post1.id), undefined)
    assert.equal(await service.destroyById(POSTS, UNKNOWN_ID), undefined)
  })
})
