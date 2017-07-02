module.exports = function(req, res, next) {
  res.header('X-Konnichiwa', 'Sekai')
  next()
}
