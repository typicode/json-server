const parsedSites = {}

function getPaginationInfo({ _limit = 25, _page = 0 }, data) {
  const totalElements = data.length
  const maxPage = Math.ceil(totalElements / +_limit)
  return {
    first: +_page === 0,
    last: +_page === maxPage,
    limit: +_limit,
    paging: +_page,
    totalElements,
    totalPages: maxPage
  }
}

module.exports = {
  parseBefore: function(req, res, next, db) {
    const { query } = req
    if (
      Object.prototype.hasOwnProperty.call(query, '_page') ||
      Object.prototype.hasOwnProperty.call(query, '_limit') ||
      Object.prototype.hasOwnProperty.call(query, '_pagination')
    ) {
      const { url } = req
      const [id] = new RegExp('([^/?:&])+').exec(url)
      const content = db.get(id).value()
      if (content && Array.isArray(content)) {
        parsedSites[req.originalUrl] = getPaginationInfo(req.query, content)
      }
    }
    next()
  },
  parseAfter: function(req, res) {
    const url = req.originalUrl
    const {
      locals: { data }
    } = res
    let result = data
    if (Object.prototype.hasOwnProperty.call(parsedSites, url)) {
      result = { data, ...parsedSites[url] }
    }
    res.jsonp(result)
  }
}
