import express from 'express'
import write from './write'
import getFullURL from './get-full-url'
import delay from './delay'
import {Request, Response, Next} from "../utils"
import low from "lowdb"
import Opts from "./opts"

export default (db: low.LowdbSync<any>, name: string, opts: Opts) => {
  const router = express.Router()
  router.use(delay)

  function show(req: Request, res: Response, next: Next) {
    res.locals.data = db.get(name).value()
    next()
  }

  function create(req: Request, res: Response, next: Next) {
    if (opts._isFake) {
      res.locals.data = req.body
    } else {
      db.set(name, req.body).value()
      res.locals.data = db.get(name).value()
    }

    res.setHeader('Access-Control-Expose-Headers', 'Location')
    res.location(`${getFullURL(req)}`)

    res.status(201)
    next()
  }

  function update(req: Request, res: Response, next: Next) {
    if (opts._isFake) {
      if (req.method === 'PUT') {
        res.locals.data = req.body
      } else {
        const resource = db.get(name).value()
        res.locals.data = { ...resource, ...req.body }
      }
    } else {
      if (req.method === 'PUT') {
        db.set(name, req.body).value()
      } else {
        db.get(name)
          .assign(req.body)
          .value()
      }

      res.locals.data = db.get(name).value()
    }

    next()
  }

  const w = write(db)

  router
    .route('/')
    .get(show)
    .post(create, w)
    .put(update, w)
    .patch(update, w)

  return router
}
