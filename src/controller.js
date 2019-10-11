const fetch = require('node-fetch')

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
  exchangeCurrency
}
