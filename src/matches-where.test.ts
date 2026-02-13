import assert from 'node:assert/strict'
import test from 'node:test'

import type { JsonObject } from 'type-fest'

import { matchesWhere } from './matches-where.ts'

await test('matchesWhere', async (t) => {
  const obj: JsonObject = { a: 10, b: 20, c: 'x', nested: { a: 10, b: 20 } }
  const cases: [JsonObject, boolean][] = [
    [{ a: { eq: 10 } }, true],
    [{ a: { eq: 11 } }, false],
    [{ c: { ne: 'y' } }, true],
    [{ c: { ne: 'x' } }, false],
    [{ a: { lt: 11 } }, true],
    [{ a: { lt: 10 } }, false],
    [{ a: { lte: 10 } }, true],
    [{ a: { lte: 9 } }, false],
    [{ b: { gt: 19 } }, true],
    [{ b: { gt: 20 } }, false],
    [{ b: { gte: 20 } }, true],
    [{ b: { gte: 21 } }, false],
    [{ a: { gt: 0 }, b: { lt: 30 } }, true],
    [{ a: { gt: 10 }, b: { lt: 30 } }, false],
    [{ or: [{ a: { lt: 0 } }, { b: { gt: 19 } }] }, true],
    [{ or: [{ a: { lt: 0 } }, { b: { gt: 20 } }] }, false],
    [{ nested: { a: { eq: 10 } } }, true],
    [{ nested: { b: { lt: 20 } } }, false],
    [{ a: { foo: 10 } }, true],
    [{ a: { foo: 10, eq: 10 } }, true],
    [{ missing: { foo: 1 } }, true],
  ]

  for (const [query, expected] of cases) {
    await t.test(JSON.stringify(query), () => {
      assert.equal(matchesWhere(obj, query), expected)
    })
  }
})
