import express from 'express'
import pluralize from 'pluralize'
import delay from './delay'
import {Request, Response, Next} from "../utils"
import Opts from "./opts"

export default (opts: Opts) => {
  const router = express.Router()
  router.use(delay)

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request query
  function get(req: Request, res: Response, next: Next) {
    const prop = pluralize.singular(req.params.resource)
    req.query[`${prop}${opts.foreignKeySuffix}`] = req.params.id
    req.url = `/${req.params.nested}`
    next()
  }

  // Rewrite URL (/:resource/:id/:nested -> /:nested) and request body
  function post(req: Request, res: Response, next: Next) {
    const prop = pluralize.singular(req.params.resource)
    req.body[`${prop}${opts.foreignKeySuffix}`] = req.params.id
    req.url = `/${req.params.nested}`
    next()
  }

  return router
    .get('/:resource/:id/:nested', get)
    .post('/:resource/:id/:nested', post)
}
