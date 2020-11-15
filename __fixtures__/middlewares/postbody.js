module.exports = function (req, res, next) {
  res.header('name', req.body.name)
  next()
}
