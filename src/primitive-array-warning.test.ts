import assert from 'node:assert/strict'
import test from 'node:test'

import type { Data } from './service.ts'
import {
  formatPrimitiveArrayWarning,
  primitiveArrayResourceNames,
} from './primitive-array-warning.ts'

await test('primitiveArrayResourceNames returns resources with primitive array items', () => {
  const data = {
    roles: ['admin', 'user'],
    posts: [{ id: '1', title: 'post' }],
    mixed: [{ id: '1' }, null],
    profile: { name: 'Ada' },
  } as unknown as Data

  assert.deepEqual(primitiveArrayResourceNames(data), ['roles', 'mixed'])
})

await test('formatPrimitiveArrayWarning describes the resource problem', () => {
  assert.equal(
    formatPrimitiveArrayWarning('roles'),
    'Warning: "roles" contains primitive values. Resources should usually be arrays of objects with id fields.',
  )
})
