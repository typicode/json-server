import assert from 'node:assert'
import { describe, it } from 'node:test'

import { getPathname, getQueryParams } from '@tinyhttp/url'

import { compileRewriteRules, createQueryRewriteMiddleware } from './rewrite-middleware.ts'

function runRewrite(
  url: string,
  query: Record<string, string | string[] | undefined>,
  routes: Record<string, string>,
) {
  const req: {
    method: string
    url: string
    query: Record<string, unknown>
  } = {
    method: 'GET',
    url,
    query: query as Record<string, unknown>,
  }
  const mw = createQueryRewriteMiddleware(compileRewriteRules(routes))
  mw(req, {}, () => {})
  return { req }
}

describe('createQueryRewriteMiddleware', () => {
  it('rewrites /blog?customNamedId=1 to /posts?id=1', () => {
    const { req } = runRewrite(
      '/blog?customNamedId=1',
      { customNamedId: '1' },
      { '/blog?customNamedId=:id': '/posts?id=:id' },
    )
    assert.strictEqual(req.url, '/posts?id=1')
    assert.strictEqual(getPathname(req.url), '/posts')
    assert.strictEqual(getQueryParams(req.url)['id'], '1')
  })

  it('leaves URL unchanged when no rule matches', () => {
    const { req } = runRewrite('/posts', {}, { '/blog?customNamedId=:id': '/posts?id=:id' })
    assert.strictEqual(req.url, '/posts')
  })

  it('handles multiple captured query params', () => {
    const { req } = runRewrite(
      '/search?author=a&tag=js',
      { author: 'a', tag: 'js' },
      { '/search?author=:x&tag=:y': '/posts?user=:x&filter=:y' },
    )
    assert.strictEqual(req.url, '/posts?user=a&filter=js')
  })

  it('does not match when a required pattern query param is missing', () => {
    const { req } = runRewrite('/blog', {}, { '/blog?customNamedId=:id': '/posts?id=:id' })
    assert.strictEqual(req.url, '/blog')
  })
})
