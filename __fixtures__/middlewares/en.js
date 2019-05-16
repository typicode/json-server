module.exports = function(req, res, next) {
  res.header('X-Hello', 'World')
  next()
}
