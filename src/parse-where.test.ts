import assert from 'node:assert/strict'
import test from 'node:test'

import { parseWhere } from './parse-where.ts'

await test('parseWhere', async (t) => {
  const cases: [string, Record<string, unknown>][] = [
    [
      'views:gt=100&title:eq=a',
      {
        views: { gt: 100 },
        title: { eq: 'a' },
      },
    ],
    [
      'title=hello',
      {
        title: { eq: 'hello' },
      },
    ],
    [
      'author.name:lt=c&author.id:ne=2',
      {
        author: {
          name: { lt: 'c' },
          id: { ne: 2 },
        },
      },
    ],
    [
      'views:gt=100&views:lt=300',
      {
        views: { gt: 100, lt: 300 },
      },
    ],
    [
      'name:eq=Alice',
      {
        name: { eq: 'Alice' },
      },
    ],
    [
      'views:gt=100&published:eq=true&ratio:lt=0.5&deleted:eq=null',
      {
        views: { gt: 100 },
        published: { eq: true },
        ratio: { lt: 0.5 },
        deleted: { eq: null },
      },
    ],
    [
      'views:foo=100&title:eq=a',
      {
        title: { eq: 'a' },
      },
    ],
    ['views:foo=100', {}],
    [
      'views_gt=100&title_eq=a',
      {
        views: { gt: 100 },
        title: { eq: 'a' },
      },
    ],
    [
      'first_name_eq=Alice&author.first_name_ne=Bob',
      {
        first_name: { eq: 'Alice' },
        author: {
          first_name: { ne: 'Bob' },
        },
      },
    ],
    [
      'first_name=Alice',
      {
        first_name: { eq: 'Alice' },
      },
    ],
    [
      'views_gt=100&views:lt=300',
      {
        views: { gt: 100, lt: 300 },
      },
    ],
    [
      'id:in=1,3',
      {
        id: { in: [1, 3] },
      },
    ],
    [
      'title_in=hello,world',
      {
        title: { in: ['hello', 'world'] },
      },
    ],
  ]

  for (const [query, expected] of cases) {
    await t.test(query, () => {
      assert.deepEqual(parseWhere(query), expected)
    })
  }
})
