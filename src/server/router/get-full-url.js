const url = require('url')

module.exports = function getFullURL(req) {
  const root = url.format({
    protocol: req.protocol,
    host: req.get('host')
  })

  return `${root}${req.originalUrl}`
}
