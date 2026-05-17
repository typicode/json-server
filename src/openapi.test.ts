import assert from 'node:assert/strict'
import test from 'node:test'

import { generateOpenAPISpec } from './openapi.js'

test('generateOpenAPISpec', async (t) => {
  await t.test('generates paths for collections and singletons', () => {
    const spec = generateOpenAPISpec({
      posts: [
        { id: '1', title: 'hello', views: 10 },
        { id: '2', title: 'world', views: 20 },
      ],
      profile: { name: 'typicode' },
    })

    assert.equal(spec.openapi, '3.0.3')
    assert.ok(spec.paths['/posts']?.get)
    assert.ok(spec.paths['/posts']?.post)
    assert.ok(spec.paths['/posts/{id}']?.get)
    assert.ok(spec.paths['/posts/{id}']?.delete)
    assert.ok(spec.paths['/profile']?.get)
    assert.ok(spec.paths['/profile']?.put)
    assert.equal(spec.paths['/profile']?.delete, undefined)

    assert.ok(spec.components.schemas['posts'])
    assert.equal(spec.components.schemas['posts']?.properties?.['id']?.type, 'string')
    assert.ok(spec.components.schemas['profile'])
  })

  await t.test('includes filter query params from item fields', () => {
    const spec = generateOpenAPISpec({
      posts: [{ id: '1', title: 'a', views: 1 }],
    })

    const getOp = spec.paths['/posts']?.get
    const paramNames = getOp?.parameters?.map((p) => p.name) ?? []

    assert.ok(paramNames.includes('title'))
    assert.ok(paramNames.includes('views'))
    assert.ok(paramNames.includes('views_gt'))
    assert.ok(paramNames.includes('_page'))
    assert.ok(paramNames.includes('_embed'))
  })

  await t.test('reflects database changes', () => {
    const data = { users: [{ id: '1', email: 'a@b.c' }] }
    const spec = generateOpenAPISpec(data)
    assert.ok(spec.paths['/users'])

    data.users = []
    const emptySpec = generateOpenAPISpec(data)
    assert.ok(emptySpec.paths['/users'])
    assert.ok(emptySpec.components.schemas['users'])
  })
})
