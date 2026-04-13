import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getPathname, getQueryParams } from '@tinyhttp/url'

import {
  buildRewrittenUrl,
  matchRoutePattern,
  parseRoutePattern,
  type ParsedRoutePattern,
} from './route-pattern.ts'

export type RoutesConfig = Record<string, string>

export type QueryRewriteMiddlewareOptions = {
  /** When true, logs incoming URL, matched rule, and rewritten URL. */
  debug?: boolean
}

function resolveRewriteDebug(options?: QueryRewriteMiddlewareOptions): boolean {
  if (options?.debug !== undefined) return options.debug
  return process.env['JSON_SERVER_REWRITE_DEBUG'] === '1'
}

export type CompiledRewriteRule = {
  sourcePattern: string
  parsed: ParsedRoutePattern
  destinationTemplate: string
}

export function compileRewriteRules(routes: RoutesConfig): CompiledRewriteRule[] {
  const rules: CompiledRewriteRule[] = []
  for (const [sourcePattern, destinationTemplate] of Object.entries(routes)) {
    rules.push({
      sourcePattern,
      parsed: parseRoutePattern(sourcePattern),
      destinationTemplate,
    })
  }
  return rules
}

function syncRequestUrl(req: { url: string; path?: string; query: Record<string, unknown> }) {
  req.url = req.url.startsWith('/') ? req.url : `/${req.url}`
  req.path = getPathname(req.url)
  req.query = getQueryParams(req.url) as Record<string, unknown>
}

/**
 * Loads `routes.json` from cwd if present. Invalid JSON throws.
 */
export function loadRoutesFile(path = join(process.cwd(), 'routes.json')): RoutesConfig | undefined {
  if (!existsSync(path)) return undefined
  const raw = readFileSync(path, 'utf-8')
  const data = JSON.parse(raw) as unknown
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('routes.json must be a JSON object')
  }
  const out: RoutesConfig = {}
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (k.startsWith('$')) continue
    if (typeof v !== 'string') {
      throw new Error(`routes.json: destination for "${k}" must be a string`)
    }
    out[k] = v
  }
  return out
}

/**
 * Middleware: applies the first matching rewrite rule. Rules are compiled at startup (see {@link compileRewriteRules}).
 * After rewriting, `req.url`, `req.path`, and `req.query` are synced for tinyhttp + json-server.
 *
 * Debug: set `options.debug`, or env `JSON_SERVER_REWRITE_DEBUG=1`.
 */
export function createQueryRewriteMiddleware(
  rules: CompiledRewriteRule[],
  options?: QueryRewriteMiddlewareOptions,
) {
  const debug = resolveRewriteDebug(options)

  return (
    req: { method?: string; url: string; path?: string; query: Record<string, unknown> },
    _res: unknown,
    next: () => void,
  ) => {
    if (debug) console.log('[json-server rewrite] incoming', req.method ?? 'GET', req.url)

    const pathname = getPathname(req.url)
    const query = req.query as Record<string, string | string[] | undefined>

    for (const rule of rules) {
      const result = matchRoutePattern(rule.parsed, pathname, query)
      if (!result.match) continue

      const nextUrl = buildRewrittenUrl(
        rule.destinationTemplate,
        rule.parsed,
        result.params,
        query,
      )

      if (debug) {
        console.log('[json-server rewrite] matched', rule.sourcePattern, '->', rule.destinationTemplate)
        console.log('[json-server rewrite] rewritten', nextUrl)
      }

      req.url = nextUrl
      syncRequestUrl(req)
      return next()
    }

    next()
  }
}
