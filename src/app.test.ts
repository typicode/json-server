import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { Low, Memory } from 'lowdb'
import { temporaryDirectory } from 'tempy'
import getPort from 'get-port'

import { createApp } from './app.js'
import { Data } from './service.js'

type Test = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  method: HTTPMethods
  url: string
  statusCode: number
}

type HTTPMethods =
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'PATCH'
  | 'POST'
  | 'PUT'
  | 'OPTIONS'


const port = await getPort()

// Create custom static dir with an html file
const tmpDir = temporaryDirectory()
const file = 'file.html'
writeFileSync(join(tmpDir, file), 'utf-8')

// Create app
const db = new Low<Data>(new Memory<Data>(), {})
db.data = {
  posts: [{ id: '1', title: 'foo' }],
  comments: [{ id: '1', postId: '1' }],
}
const app = createApp(db, { static: [tmpDir] })

await new Promise<void>((resolve, reject) => {
  try {
    const server = app.listen(port, () => resolve())
    test.after(() => server.close())
  } catch (err) {
    reject(err)
  }
})

import {createWriteStream} from 'fs'

test('createApp', async () => {
  // URLs
  const POSTS = '/posts'
  const POST_1 = '/posts/1'
  const POST_NOT_FOUND = '/posts/-1'
  const COMMENTS = '/comments'
  const POST_COMMENTS = '/comments?postId=1'
  const NOT_FOUND = '/not-found'

  const arr: Test[] = [
    // Static
    { method: 'GET', url: '/', statusCode: 200 },
    { method: 'GET', url: '/output.css', statusCode: 200 },
    { method: 'GET', url: `/${file}`, statusCode: 200 },

    // API
    { method: 'GET', url: POSTS, statusCode: 200 },
    { method: 'GET', url: POST_1, statusCode: 200 },
    { method: 'GET', url: POST_NOT_FOUND, statusCode: 404 },
    { method: 'GET', url: COMMENTS, statusCode: 200 },
    { method: 'GET', url: POST_COMMENTS, statusCode: 200 },
    { method: 'GET', url: NOT_FOUND, statusCode: 404 },

    { method: 'POST', url: POSTS, statusCode: 201 },
    { method: 'POST', url: POST_1, statusCode: 404 },
    { method: 'POST', url: POST_NOT_FOUND, statusCode: 404 },
    { method: 'POST', url: NOT_FOUND, statusCode: 404 },

    { method: 'PUT', url: POSTS, statusCode: 404 },
    { method: 'PUT', url: POST_1, statusCode: 200 },
    { method: 'PUT', url: POST_NOT_FOUND, statusCode: 404 },
    { method: 'PUT', url: NOT_FOUND, statusCode: 404 },

    { method: 'PATCH', url: POSTS, statusCode: 404 },
    { method: 'PATCH', url: POST_1, statusCode: 200 },
    { method: 'PATCH', url: POST_NOT_FOUND, statusCode: 404 },
    { method: 'PATCH', url: NOT_FOUND, statusCode: 404 },

    { method: 'DELETE', url: POSTS, statusCode: 404 },
    { method: 'DELETE', url: POST_1, statusCode: 200 },
    { method: 'DELETE', url: POST_NOT_FOUND, statusCode: 404 },
    { method: 'DELETE', url: NOT_FOUND, statusCode: 404 },
  ]

  for (const tc of arr) {
    const response = await fetch(`http://localhost:${port}${tc.url}`, {
      method: tc.method,
    });
    assert.equal(response.status, tc.statusCode, `${response.status} !== ${tc.statusCode} ${tc.method} ${tc.url} failed`);
  }
})
