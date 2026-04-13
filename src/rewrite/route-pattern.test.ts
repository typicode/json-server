import assert from 'node:assert'
import { describe, it } from 'node:test'

import {
  applyDestinationPattern,
  buildRewrittenUrl,
  matchRoutePattern,
  parseRoutePattern,
} from './route-pattern.ts'

describe('parseRoutePattern', () => {
  it('parses path and single capture query', () => {
    assert.deepStrictEqual(parseRoutePattern('/blog?customNamedId=:id'), {
      path: '/blog',
      query: { customNamedId: ':id' },
    })
  })

  it('parses multiple query params', () => {
    assert.deepStrictEqual(parseRoutePattern('/a?x=:id&y=fixed&z=:other'), {
      path: '/a',
      query: { x: ':id', y: 'fixed', z: ':other' },
    })
  })
})

describe('matchRoutePattern', () => {
  it('matches blog example and extracts id', () => {
    const pattern = parseRoutePattern('/blog?customNamedId=:id')
    const r = matchRoutePattern(pattern, '/blog', { customNamedId: '1' })
    assert.strictEqual(r.match, true)
    if (r.match) assert.deepStrictEqual(r.params, { id: '1' })
  })

  it('rejects wrong path', () => {
    const pattern = parseRoutePattern('/blog?customNamedId=:id')
    const r = matchRoutePattern(pattern, '/news', { customNamedId: '1' })
    assert.strictEqual(r.match, false)
  })

  it('matches literal query value', () => {
    const pattern = parseRoutePattern('/x?mode=edit&id=:id')
    const r = matchRoutePattern(pattern, '/x', { mode: 'edit', id: '99' })
    assert.strictEqual(r.match, true)
    if (r.match) assert.deepStrictEqual(r.params, { id: '99' })
  })

  it('allows extra query keys on request', () => {
    const pattern = parseRoutePattern('/blog?customNamedId=:id')
    const r = matchRoutePattern(pattern, '/blog', {
      customNamedId: '1',
      sort: 'title',
    })
    assert.strictEqual(r.match, true)
  })
})

describe('applyDestinationPattern', () => {
  it('builds /posts?id=1 from template and params', () => {
    assert.strictEqual(applyDestinationPattern('/posts?id=:id', { id: '1' }), '/posts?id=1')
  })

  it('formats several query params with URLSearchParams', () => {
    assert.strictEqual(
      applyDestinationPattern('/x?a=:x&b=:y', { x: '1', y: 'two' }),
      '/x?a=1&b=two',
    )
  })

  it('encodes special characters in query values', () => {
    assert.strictEqual(
      applyDestinationPattern('/q?n=:name', { name: 'a&b' }),
      '/q?n=a%26b',
    )
  })
})

describe('buildRewrittenUrl', () => {
  it('rewrites and preserves unrelated query params', () => {
    const pattern = parseRoutePattern('/blog?customNamedId=:id')
    const r = matchRoutePattern(pattern, '/blog', {
      customNamedId: '1',
      sort: 'title',
    })
    assert.strictEqual(r.match, true)
    if (!r.match) return
    const url = buildRewrittenUrl('/posts?id=:id', pattern, r.params, {
      customNamedId: '1',
      sort: 'title',
    })
    assert.strictEqual(url, '/posts?id=1&sort=title')
  })
})
