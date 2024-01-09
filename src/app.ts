import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { App } from '@tinyhttp/app'
import { cors } from '@tinyhttp/cors'
import { Eta } from 'eta'
import { Low } from 'lowdb'
import { json } from 'milliparsec'
import sirv from 'sirv'

import { Data, isItem, Service } from './service.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProduction = process.env['NODE_ENV'] === 'production'

export type AppOptions = {
  logger?: boolean
  static?: string[]
}

const eta = new Eta({
  views: join(__dirname, 'views'),
  cache: isProduction,
})

export function createApp(db: Low<Data>, options: AppOptions = {}) {
  // Create service
  const service = new Service(db)

  // Create app
  const app = new App()

  // Static files
  app.use(sirv(join(__dirname, '../public'), { dev: !isProduction }))
  options.static
    ?.map((path) => (isAbsolute(path) ? path : join(process.cwd(), path)))
    .forEach((dir) => app.use(sirv(dir, { dev: !isProduction })))

  // CORS
  app.use(cors()).options('*', cors())

  // Body parser
  app.use(json())

  app.get('/', (_req, res) =>
    res.send(eta.render('index.html', { data: db.data })),
  )

  app.get('/:name', (req, res, next) => {
    const { name = '' } = req.params
    res.locals['data'] = service.find(name, req.query)
    next()
  })

  app.get('/:name/:id', (req, res, next) => {
    const { name = '', id = '' } = req.params
    res.locals['data'] = service.findById(name, id, req.query)
    next()
  })

  app.post('/:name', async (req, res, next) => {
    const { name = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.create(name, req.body)
    }
    next()
  })

  app.put('/:name', async (req, res, next) => {
    const { name = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.update(name, req.body)
    }
    next()
  })

  app.put('/:name/:id', async (req, res, next) => {
    const { name = '', id = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.updateById(name, id, req.body)
    }
    next()
  })

  app.patch('/:name', async (req, res, next) => {
    const { name = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.patch(name, req.body)
    }
    next()
  })

  app.patch('/:name/:id', async (req, res, next) => {
    const { name = '', id = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.patchById(name, id, req.body)
    }
    next()
  })

  app.delete('/:name/:id', async (req, res, next) => {
    const { name = '', id = '' } = req.params
    res.locals['data'] = await service.destroyById(name, id)
    next()
  })

  app.use('/:name', (req, res) => {
    const { data } = res.locals
    if (data === undefined) {
      res.sendStatus(404)
    } else {
      if (req.method === 'POST') res.status(201)
      res.json(data)
    }
  })

  return app
}
