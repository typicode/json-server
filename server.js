const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')
const routes = require('./src/routes')
const server = jsonServer.create()
const port = 3001

const SECRET_KEY = '123456789'

// Verify the token
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) =>
    decode !== undefined ? decode : err
  )
}

server.use(bodyParser.urlencoded({ extended: true }))
server.use(bodyParser.json())
server.use(jsonServer.defaults())

// server.use(/^(?!\/auth).*$/, (req, res, next) => {
//   if (
//     req.headers.authorization === undefined ||
//     req.headers.authorization.split(' ')[0] !== 'Bearer'
//   ) {
//     const status = 401
//     const message = 'Error in authorization format'
//     res.status(status).json({ status, message })
//     return
//   }
//   try {
//     const verifyTokenResult = verifyToken(
//       req.headers.authorization.split(' ')[1]
//     )

//     if (verifyTokenResult instanceof Error) {
//       const status = 401
//       const message = 'Access token not provided'
//       res.status(status).json({ status, message })
//       return
//     }

//     next()
//   } catch (err) {
//     const status = 401
//     const message = 'Error access_token is revoked'
//     res.status(status).json({ status, message })
//   }
// })

routes.forEach(route => {
  if (route.method === 'POST') {
    server.post(route.route, route.controller)
  } else {
    server.get(route.route, route.controller)
  }
})

server.listen(port)
