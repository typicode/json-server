import assert from 'node:assert/strict'
import test from 'node:test'

import type { Adapter } from 'lowdb'

import { DEFAULT_SCHEMA_PATH, NormalizedAdapter } from './adapters/normalized-adapter.ts'
import type { RawData } from './adapters/normalized-adapter.ts'
import type { Data } from './service.ts'

class StubAdapter implements Adapter<RawData> {
  #data: RawData | null

  constructor(data: RawData | null) {
    this.#data = data
  }

  async read(): Promise<RawData | null> {
    return this.#data === null ? null : structuredClone(this.#data)
  }

  async write(data: RawData): Promise<void> {
    this.#data = structuredClone(data)
  }

  get data(): RawData | null {
    return this.#data
  }
}

await test('read removes $schema and normalizes ids', async () => {
  const adapter = new StubAdapter({
    $schema: './custom/schema.json',
    posts: [{ id: 1 }, { title: 'missing id' }],
    profile: { name: 'x' },
  })

  const normalized = await new NormalizedAdapter(adapter).read()
  assert.notEqual(normalized, null)

  if (normalized === null) {
    return
  }

  assert.equal(normalized['$schema'], undefined)
  assert.deepEqual(normalized['profile'], { name: 'x' })

  const posts = normalized['posts']
  assert.ok(Array.isArray(posts))
  assert.equal(posts[0]?.['id'], '1')
  assert.equal(typeof posts[1]?.['id'], 'string')
  assert.notEqual(posts[1]?.['id'], '')
})

await test('write always overwrites $schema', async () => {
  const adapter = new StubAdapter(null)
  const normalizedAdapter = new NormalizedAdapter(adapter)

  await normalizedAdapter.write({ posts: [{ id: '1' }] } satisfies Data)

  const data = adapter.data
  assert.notEqual(data, null)
  assert.equal(data?.['$schema'], DEFAULT_SCHEMA_PATH)
})
