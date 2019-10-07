const fetch = require('node-fetch')
const db = require('../db.json')

function adduser(req, res) {
  if (req.method === 'POST') {
    const userId = req.body.id
    if (userId != null && userId >= 0) {
      const result = db.users.find(user => {
        return user.userId === userId
      })

      if (result) {
        const { id, ...user } = result
        res.status(200).jsonp(user)
      } else {
        res.status(400).jsonp({
          error: 'Bad userId'
        })
      }
    } else {
      res.status(400).jsonp({
        error: 'No valid userId'
      })
    }
  }
}

function getUser(req, res) {
  if (req.method === 'GET') {
    const userId = req.query.id
    if (userId != null && userId >= 0) {
      const result = db.users.find(user => {
        return user.userId === userId
      })

      if (result) {
        const { id, ...user } = result
        res.status(200).jsonp(user)
      } else {
        res.status(400).jsonp({
          error: 'Bad userId'
        })
      }
    } else {
      res.status(400).jsonp({
        error: 'No valid userId'
      })
    }
  }
}

function exchangeCurrency(req, res) {
  if (req.method === 'GET') {
    const from = req.query.from
    const to = req.query.to

    if (from != null && to !== null) {
      fetch(
        `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=WVS7S95FAMLLH9Z6`
      )
        .then(res => res.json())
        .then(json => res.status(200).jsonp(json))
        .catch(() =>
          res.status(500).jsonp({
            error: 'something is wrong with request'
          })
        )
    } else {
      res.status(500).jsonp({
        error: 'something is wrong with server'
      })
    }
  }
}

module.exports = {
  adduser,
  getUser,
  exchangeCurrency
}
