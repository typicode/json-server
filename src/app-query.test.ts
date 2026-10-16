import assert from 'node:assert/strict'
import test from 'node:test'

import { Low, Memory } from 'lowdb'

import { createApp } from './app.ts'
import type { Data } from './service.ts'

test('query values preserve question marks', async (t) => {
  const posts = [
    { id: '1', title: 'why', views: 1 },
    { id: '2', title: 'why?', views: 2 },
    { id: '3', title: 'why?not?', views: 3 },
  ]
  const db = new Low<Data>(new Memory<Data>(), { posts })
  const server = createApp(db).listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  )
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const base = `http://localhost:${address.port}`
  const cases = [
    { query: 'title=why?', expected: [posts[1]] },
    { query: 'title:eq=why?not?', expected: [posts[2]] },
    { query: 'title:contains=?', expected: [posts[1], posts[2]] },
    {
      query: 'title:contains=?&_sort=-views&_page=1&_per_page=1',
      expected: { first: 1, prev: null, next: 2, last: 2, pages: 2, items: 2, data: [posts[2]] },
    },
    {
      query: `_where=${encodeURIComponent(JSON.stringify({ title: { eq: 'why?' } })).replaceAll('%3F', '?')}`,
      expected: [posts[1]],
    },
    { query: 'title=why%3F', expected: [posts[1]] },
    { query: 'title=why%3Fnot%3F', expected: [posts[2]] },
    { query: 'title=why', expected: [posts[0]] },
    { query: '', expected: posts },
  ]
  for (const { query, expected } of cases) {
    await t.test(query || 'empty query', async () => {
      const response = await fetch(`${base}/posts?${query}`, { signal: AbortSignal.timeout(5000) })
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), expected)
    })
  }
  await t.test('no query delimiter', async () => {
    const response = await fetch(`${base}/posts`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), posts)
  })
})
