/**
 * Bug reproduction: POST/PATCH/PUT with invalid body returns 404 instead of 400
 *
 * Steps to reproduce:
 *   1. Start json-server
 *   2. Send POST /posts with Content-Type: application/json and body: null
 *   3. Observe: 404 Not Found  ← BUG (should be 400 Bad Request)
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import getPort from 'get-port'
import { Low, Memory } from 'lowdb'

import { createApp } from './app.ts'
import type { Data } from './service.ts'

const port = await getPort()

const db = new Low<Data>(new Memory<Data>(), {})
db.data = {
  posts: [{ id: '1', title: 'foo' }],
  object: { f1: 'foo' },
}
const app = createApp(db)

await new Promise<void>((resolve, reject) => {
  try {
    const server = app.listen(port, () => resolve())
    test.after(() => server.close())
  } catch (err) {
    reject(err)
  }
})

await test('invalid body handling', async (t) => {
  const base = `http://localhost:${port}`

  await t.test('POST /posts with null body should return 400 not 404', async () => {
    const res = await fetch(`${base}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'null',
    })
    assert.equal(res.status, 400, `Expected 400 but got ${res.status} — body was null`)
  })

  await t.test('POST /posts with array body should return 400 not 404', async () => {
    const res = await fetch(`${base}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ title: 'x' }]),
    })
    assert.equal(res.status, 400, `Expected 400 but got ${res.status} — body was array`)
  })

  await t.test('PUT /posts/1 with null body should return 400 not 404', async () => {
    const res = await fetch(`${base}/posts/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'null',
    })
    assert.equal(res.status, 400, `Expected 400 but got ${res.status} — body was null`)
  })

  await t.test('PATCH /posts/1 with array body should return 400 not 404', async () => {
    const res = await fetch(`${base}/posts/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([]),
    })
    assert.equal(res.status, 400, `Expected 400 but got ${res.status} — body was array`)
  })

  await t.test('PUT /object with null body should return 400 not 404', async () => {
    const res = await fetch(`${base}/object`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'null',
    })
    assert.equal(res.status, 400, `Expected 400 but got ${res.status} — body was null`)
  })
})
