import assert from 'node:assert/strict'
import test from 'node:test'

import { paginate } from './paginate.ts'

await test('paginate', async (t) => {
  // Pagination: page boundaries and clamping behavior.
  const cases = [
    {
      name: 'page=1 perPage=2 items=5 -> [1,2]',
      items: [1, 2, 3, 4, 5],
      page: 1,
      perPage: 2,
      expected: {
        first: 1,
        prev: null,
        next: 2,
        last: 3,
        pages: 3,
        items: 5,
        data: [1, 2],
      },
    },
    {
      name: 'page=2 perPage=2 items=5 -> [3,4]',
      items: [1, 2, 3, 4, 5],
      page: 2,
      perPage: 2,
      expected: {
        first: 1,
        prev: 1,
        next: 3,
        last: 3,
        pages: 3,
        items: 5,
        data: [3, 4],
      },
    },
    {
      name: 'page=9 perPage=2 items=5 -> clamp to last',
      items: [1, 2, 3, 4, 5],
      page: 9,
      perPage: 2,
      expected: {
        first: 1,
        prev: 2,
        next: null,
        last: 3,
        pages: 3,
        items: 5,
        data: [5],
      },
    },
    {
      name: 'page=0 perPage=2 items=3 -> clamp to first',
      items: [1, 2, 3],
      page: 0,
      perPage: 2,
      expected: {
        first: 1,
        prev: null,
        next: 2,
        last: 2,
        pages: 2,
        items: 3,
        data: [1, 2],
      },
    },
    {
      name: 'items=[] page=1 perPage=2 -> stable empty pagination',
      items: [],
      page: 1,
      perPage: 2,
      expected: {
        first: 1,
        prev: null,
        next: null,
        last: 1,
        pages: 1,
        items: 0,
        data: [],
      },
    },
    {
      name: 'perPage=0 -> clamp perPage to 1',
      items: [1, 2, 3],
      page: 1,
      perPage: 0,
      expected: {
        first: 1,
        prev: null,
        next: 2,
        last: 3,
        pages: 3,
        items: 3,
        data: [1],
      },
    },
  ]

  for (const tc of cases) {
    await t.test(tc.name, () => {
      const res = paginate(tc.items, tc.page, tc.perPage)
      assert.deepEqual(res, tc.expected)
    })
  }
})
