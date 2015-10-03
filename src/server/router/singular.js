var express = require('express')

module.exports = function (db, name) {

  var router = express.Router()

  function show (req, res, next) {
    res.locals.data = db.object[name]
    next()
  }

  function create (req, res, next) {
    res.locals.data = db.object[name] = req.body
    res.status(201)
    next()
  }

  function update (req, res, next) {
    if (req.method === 'PUT') {
      delete db.object[name]
      db.object[name] = {}
    }

    for (var prop in req.body) {
      db.object[name][prop] = req.body[prop]
    }

    res.locals.data = db.object[name]
    next()
  }

  router.route('/')
    .get(show)
    .post(create)
    .put(update)
    .patch(update)

  return router

}
