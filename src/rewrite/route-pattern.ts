/**
 * Query-based route patterns like `/blog?customNamedId=:id`.
 * A query value that is exactly `:paramName` captures that segment into `params`.
 * Any other value is matched literally against the request.
 */

const PARAM_VALUE = /^:([a-zA-Z_][a-zA-Z0-9_]*)$/

export type ParsedRoutePattern = {
  path: string
  /** Keys and pattern values; capture values look like `:id`, literals are plain strings */
  query: Record<string, string>
}

function leadSlash(p: string): string {
  if (p === '' || p === '/') return '/'
  return p.startsWith('/') ? p : `/${p}`
}

/**
 * Parse a route pattern such as `/blog?customNamedId=:id` or `/x?a=:id&b=fixed`.
 * Returns path plus query map (values are either `:param` or literal strings).
 */
export function parseRoutePattern(pattern: string): ParsedRoutePattern {
  const trimmed = pattern.trim()
  const q = trimmed.indexOf('?')
  const pathPart = (q === -1 ? trimmed : trimmed.slice(0, q)).trim()
  const queryPart = q === -1 ? '' : trimmed.slice(q + 1).trim()

  const query: Record<string, string> = {}
  if (queryPart) {
    for (const segment of queryPart.split('&')) {
      if (segment === '') continue
      const eq = segment.indexOf('=')
      if (eq === -1) {
        throw new Error(`Invalid query segment in route pattern (missing '='): ${segment}`)
      }
      const key = decodeURIComponent(segment.slice(0, eq).trim())
      const rawVal = segment.slice(eq + 1)
      const value = decodeURIComponent(rawVal.trim())
      query[key] = value
    }
  }

  return { path: leadSlash(pathPart), query }
}

function firstQueryValue(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v.at(0) : v
}

/**
 * True if the pattern value denotes a capture (e.g. `:id`).
 */
export function isQueryParamToken(value: string): boolean {
  return PARAM_VALUE.test(value)
}

export function captureNameFromQueryValue(value: string): string | undefined {
  const m = PARAM_VALUE.exec(value)
  return m?.[1]
}

export type MatchResult =
  | { match: true; params: Record<string, string> }
  | { match: false; params: Record<string, string> }

/**
 * Match a parsed pattern against a request path and query object.
 * Extra query keys on the request do not prevent a match.
 */
export function matchRoutePattern(
  pattern: ParsedRoutePattern,
  requestPath: string,
  requestQuery: Record<string, string | string[] | undefined>,
): MatchResult {
  const path = leadSlash(requestPath)
  if (path !== pattern.path) {
    return { match: false, params: {} }
  }

  const params: Record<string, string> = {}

  for (const [key, spec] of Object.entries(pattern.query)) {
    const raw = firstQueryValue(requestQuery[key])
    if (raw === undefined) {
      return { match: false, params: {} }
    }

    const cap = captureNameFromQueryValue(spec)
    if (cap !== undefined) {
      params[cap] = raw
    } else if (raw !== spec) {
      return { match: false, params: {} }
    }
  }

  return { match: true, params }
}

const DEST_PARAM = /:([a-zA-Z_][a-zA-Z0-9_]*)/g

function replacePathParams(segment: string, params: Record<string, string>): string {
  return segment.replace(DEST_PARAM, (_, name: string) => {
    const v = params[name]
    if (v === undefined) {
      throw new Error(`Missing param "${name}" for destination path`)
    }
    return encodeURIComponent(v)
  })
}

/** Replace `:param` in a query value; values stay decoded — URLSearchParams encodes on serialize. */
function replaceQueryValueParams(template: string, params: Record<string, string>): string {
  return template.replace(DEST_PARAM, (_, name: string) => {
    const v = params[name]
    if (v === undefined) {
      throw new Error(`Missing param "${name}" for destination query`)
    }
    return v
  })
}

/**
 * Build path + query from a destination template and captured params.
 * Query pairs use URLSearchParams so encoding and multi-value keys are handled consistently.
 *
 * @example applyDestinationPattern("/posts?id=:id", { id: "1" }) -> "/posts?id=1"
 */
export function applyDestinationPattern(
  destinationPattern: string,
  params: Record<string, string>,
): string {
  const trimmed = destinationPattern.trim()
  const qi = trimmed.indexOf('?')
  const pathTemplate = (qi === -1 ? trimmed : trimmed.slice(0, qi)).trim()
  const queryTemplate = qi === -1 ? '' : trimmed.slice(qi + 1)

  const path = replacePathParams(pathTemplate, params)

  if (!queryTemplate.trim()) {
    return leadSlash(path)
  }

  const out = new URLSearchParams()
  for (const segment of queryTemplate.split('&')) {
    if (segment === '') continue
    const eq = segment.indexOf('=')
    if (eq === -1) {
      throw new Error(`Invalid destination query segment (missing '='): ${segment}`)
    }
    const key = decodeURIComponent(segment.slice(0, eq).trim())
    const valueTemplate = decodeURIComponent(segment.slice(eq + 1).trim())
    out.append(key, replaceQueryValueParams(valueTemplate, params))
  }

  const search = out.toString()
  return search ? `${leadSlash(path)}?${search}` : leadSlash(path)
}

/** Same as {@link applyDestinationPattern} (kept for callers that used the old name). */
export function substituteDestinationParams(
  destinationTemplate: string,
  params: Record<string, string>,
): string {
  return applyDestinationPattern(destinationTemplate, params)
}

/**
 * Merge query params from the original request that were only used for pattern matching
 * into the rewritten URL, without clobbering keys already present in the destination.
 */
export function mergePreservedQueryParams(
  rewrittenPathAndQuery: string,
  patternQueryKeys: string[],
  originalQuery: Record<string, string | string[] | undefined>,
): string {
  const qIndex = rewrittenPathAndQuery.indexOf('?')
  const pathOnly = qIndex === -1 ? rewrittenPathAndQuery : rewrittenPathAndQuery.slice(0, qIndex)
  const destSearch = qIndex === -1 ? '' : rewrittenPathAndQuery.slice(qIndex + 1)

  const out = new URLSearchParams(destSearch)
  const consumed = new Set(patternQueryKeys)

  for (const [key, val] of Object.entries(originalQuery)) {
    if (consumed.has(key)) continue
    if (out.has(key)) continue
    const s = firstQueryValue(val)
    if (s === undefined) continue
    out.append(key, s)
  }

  const search = out.toString()
  return search ? `${pathOnly}?${search}` : pathOnly
}

/**
 * Full rewrite: substitute captures, then append non-consumed original query keys.
 */
export function buildRewrittenUrl(
  destinationTemplate: string,
  pattern: ParsedRoutePattern,
  params: Record<string, string>,
  originalQuery: Record<string, string | string[] | undefined>,
): string {
  const withSubs = applyDestinationPattern(destinationTemplate, params)
  const patternKeys = Object.keys(pattern.query)
  return mergePreservedQueryParams(withSubs, patternKeys, originalQuery)
}
