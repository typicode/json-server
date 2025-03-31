import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { App } from '@tinyhttp/app'
import { cors } from '@tinyhttp/cors'
import { Eta } from 'eta'
import { Low } from 'lowdb'
import { json } from 'milliparsec'
import sirv from 'sirv'

import { Data, isItem, Item, Service } from './service.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProduction = process.env['NODE_ENV'] === 'production'

export type AppOptions = {
  logger?: boolean
  static?: string[]
  chunk?: number
}

const eta = new Eta({
  views: join(__dirname, '../views'),
  cache: isProduction,
})

export function createApp(db: Low<Data>, options: AppOptions = {}) {
  // Create service
  const service = new Service(db)

  // Create app
  const app = new App()

  // Static files
  app.use(sirv('public', { dev: !isProduction }))
  options.static
    ?.map((path) => (isAbsolute(path) ? path : join(process.cwd(), path)))
    .forEach((dir) => app.use(sirv(dir, { dev: !isProduction })))

  // CORS
  app
    .use((req, res, next) => {
      return cors({
        allowedHeaders: req.headers['access-control-request-headers']
          ?.split(',')
          .map((h) => h.trim()),
      })(req, res, next)
    })
    .options('*', cors())

  // Body parser
  // @ts-expect-error expected
  app.use(json())

  app.get('/', (_req, res) =>
    res.send(eta.render('index.html', { data: db.data })),
  )

  app.get('/:name', (req, res, next) => {
    const { name = '' } = req.params
    const query = Object.fromEntries(
      Object.entries(req.query)
        .map(([key, value]) => {
          if (
            ['_start', '_end', '_limit', '_page', '_per_page'].includes(key) &&
            typeof value === 'string'
          ) {
            return [key, parseInt(value)]
          } else {
            return [key, value]
          }
        })
        .filter(([, value]) => !Number.isNaN(value)),
    )
    res.locals['data'] = service.find(name, query)
    next?.()
  })

  app.get('/sse/:name', (req, res) => {
    res.header('Content-Type', 'text/event-stream');
    const { name = '' } = req.params

    const interval = 200;

    const data = service.find(name) as Item[];
    if (!data.length) {
      return res.sendStatus(404)
    }

    for (let i = 0; i < data.length; i += options.chunk!) {
      setTimeout(() => {
        const payload = JSON.stringify(data.slice(i, options.chunk! + i))
        res.write(`data: ${payload}\n\n`);
        res.flushHeaders();

        if (i >= data.length) {
          res.end();
        }
      }, i * interval);
    }

    return;
  })

  app.get('/:name/:id', (req, res, next) => {
    const { name = '', id = '' } = req.params
    res.locals['data'] = service.findById(name, id, req.query)
    next?.()
  })

  app.post('/:name', async (req, res, next) => {
    const { name = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.create(name, req.body)
    }
    next?.()
  })

  app.put('/:name', async (req, res, next) => {
    const { name = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.update(name, req.body)
    }
    next?.()
  })

  app.put('/:name/:id', async (req, res, next) => {
    const { name = '', id = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.updateById(name, id, req.body)
    }
    next?.()
  })

  app.patch('/:name', async (req, res, next) => {
    const { name = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.patch(name, req.body)
    }
    next?.()
  })

  app.patch('/:name/:id', async (req, res, next) => {
    const { name = '', id = '' } = req.params
    if (isItem(req.body)) {
      res.locals['data'] = await service.patchById(name, id, req.body)
    }
    next?.()
  })

  app.delete('/:name/:id', async (req, res, next) => {
    const { name = '', id = '' } = req.params
    res.locals['data'] = await service.destroyById(
      name,
      id,
      req.query['_dependent'],
    )
    next?.()
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
