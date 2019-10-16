const fs = require('fs')
const jwt = require('jsonwebtoken')
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'))

const SECRET_KEY = '123456789'
const EXPIRES_IN = 3600

// Create a token from a payload
function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: EXPIRES_IN })
}

function isAuthenticated({ email, password }) {
  return (
    userdb.users.findIndex(
      user => user.email === email && user.password === password
    ) !== -1
  )
}

// Register New User
function register(req, res) {
  const { email, password } = req.body

  if (isAuthenticated({ email, password }) === true) {
    const status = 401
    const message = 'Email and Password already exist'
    res.status(status).json({ status, message })
    return
  }

  fs.readFile('./users.json', (err, data) => {
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({ status, message })

      return
    }

    const stringfiedData = JSON.parse(data.toString())

    const lastItemId = stringfiedData.length
      ? stringfiedData.users[stringfiedData.users.length - 1].id
      : 1

    // Add new user
    stringfiedData.users.push({
      id: lastItemId + 1,
      email: email,
      password: password
    })

    fs.writeFile('./users.json', JSON.stringify(stringfiedData), err => {
      if (err) {
        const status = 401
        const message = err
        res.status(status).json({ status, message })
      }
    })
  })

  // Create token for new user
  // eslint-disable-next-line camelcase
  const access_token = createToken({ email, password })
  res.status(200).json({ access_token, expires_in: EXPIRES_IN })
}

function login(req, res) {
  const { email, password } = req.body

  if (isAuthenticated({ email, password }) === false) {
    const status = 401
    const message = 'Incorrect email or password'
    res.status(status).json({ status, message })
    return
  }

  // eslint-disable-next-line camelcase
  const access_token = createToken({ email, password })

  const status = 200
  res.status(status).json({ access_token, expires_in: EXPIRES_IN })
}

function getAccountDetails(req, res) {
  const accesToken = req.headers.authorization.split(' ')[1]

  jwt.verify(accesToken, SECRET_KEY, (err, authorizedData) => {
    if (err) {
      res.sendStatus(403).json({
        err
      })
    } else {
      res.json(authorizedData)
    }
  })
}

module.exports = {
  login,
  register,
  getAccountDetails
}
