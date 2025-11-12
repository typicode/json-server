// Query parameter parsing utility
// Extracts and removes special query parameters used by json-server

const SPECIAL_PARAMS = [
  'q',
  '_page',
  '_limit',
  '_sort',
  '_order',
  '_start',
  '_end',
  '_embed',
  '_expand'
]

/**
 * Extract special query parameters and remove them from req.query
 * @param {Object} query - Express req.query object
 * @returns {Object} Extracted parameters
 */
function extractQueryParams(query) {
  const params = {
    // Full-text search
    q: query.q,

    // Pagination
    _page: query._page,
    _limit: query._limit,
    _start: query._start,
    _end: query._end,

    // Sorting
    _sort: query._sort,
    _order: query._order,

    // Relationships
    _embed: query._embed,
    _expand: query._expand,

    // Remaining filters
    filters: {}
  }

  // Remove special params from query
  SPECIAL_PARAMS.forEach(param => {
    delete query[param]
  })

  // Extract filter operators (remove them from query, store in filters)
  Object.keys(query).forEach(key => {
    const isOperator =
      /_lte$/.test(key) ||
      /_gte$/.test(key) ||
      /_ne$/.test(key) ||
      /_like$/.test(key)

    if (!isOperator) {
      params.filters[key] = query[key]
      delete query[key]
    }
  })

  return params
}

/**
 * Check if a query key is a filter operator
 * @param {string} key - Query parameter key
 * @returns {boolean}
 */
function isFilterOperator(key) {
  return (
    /_lte$/.test(key) ||
    /_gte$/.test(key) ||
    /_ne$/.test(key) ||
    /_like$/.test(key)
  )
}

module.exports = {
  extractQueryParams,
  isFilterOperator,
  SPECIAL_PARAMS
}
