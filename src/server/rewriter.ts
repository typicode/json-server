import express from 'express'
import rewrite from 'express-urlrewrite'

export default (routes: Array<any>) => {
  const router = express.Router()

  router.get('/__rules', (req, res) => {
    res.json(routes)
  })

  Object.keys(routes).forEach((key: any) => {
    router.use(rewrite(key, routes[key]))
  })

  return router
}
