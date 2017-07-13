const express = require('express')
const rewrite = require('express-urlrewrite')

module.exports = routes => {
  const router = express.Router()

  router.get('/__rules', (req, res) => {
    res.json(routes)
  })

  Object.keys(routes).forEach(key => {
    router.use(rewrite(key, routes[key]))
  })

  return router
}
