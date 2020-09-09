import express from 'express'
import methodOverride from 'method-override'
import _ from 'lodash'
import lodashId from 'lodash-id'
import low from 'lowdb'
import Memory from 'lowdb/adapters/Memory'
import FileSync from 'lowdb/adapters/FileSync'
import bodyParser from '../body-parser'
import { validateData } from './validate-data'
import plural from './plural'
import nested from './nested'
import singular from './singular'
import {mixins} from '../mixins'
import Opts from "./opts"
import {Request, Response, Next} from "../utils"

module.exports = (db, opts: Opts = { foreignKeySuffix: 'Id', _isFake: false }) => {
  if (typeof db === 'string') {
    db = low(new FileSync(db))
  } else if (!_.has(db, '__chain__') || !_.has(db, '__wrapped__')) {
    db = low(new Memory()).setState(db)
  }

  // Create router
  const router = express.Router()

  // Add middlewares
  router.use(methodOverride())
  router.use(bodyParser)

  validateData(db.getState())

  // Add lodash-id methods to db
  db._.mixin(lodashId)

  // Add specific mixins
  db._.mixin(mixins)

  // Expose database
  router.db = db

  // Expose render
  router.render = (req, res) => {
    res.jsonp(res.locals.data)
  }

  // GET /db
  router.get('/db', (req, res) => {
    res.jsonp(db.getState())
  })

  // Handle /:parent/:parentId/:resource
  router.use(nested(opts))

  // Create routes
  db.forEach((value, key) => {
    if (_.isPlainObject(value)) {
      router.use(`/${key}`, singular(db, key, opts))
      return
    }

    if (_.isArray(value)) {
      router.use(`/${key}`, plural(db, key, opts))
      return
    }

    var sourceMessage = ''
    // if (!_.isObject(source)) {
    //   sourceMessage = `in ${source}`
    // }

    const msg =
      `Type of "${key}" (${typeof value}) ${sourceMessage} is not supported. ` +
      `Use objects or arrays of objects.`

    throw new Error(msg)
  }).value()

  router.use((req: Request, res: Response, next: Next) => {
    if (!res.locals.data) {
      res.status(404)
      res.locals.data = {}
    }

    router.render(req, res)
  })

  router.use((err: any, req: Request, res: Response, next: Next) => {
    console.error(err.stack)
    res.status(500).send(err.stack)
  })

  return router
}
