const jsonServer = require('json-server')
const routes = require('./src/routes')
const server = jsonServer.create()
const router = jsonServer.router('./db.json')
const middlewares = jsonServer.defaults()
const port = 3001

server.use(jsonServer.bodyParser)
server.use(middlewares)

routes.post.forEach(route => {
  server.post(route.route, route.controller)
})

routes.get.forEach(route => {
  server.get(route.route, route.controller)
})

server.use(router)
server.listen(port)
