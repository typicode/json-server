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

function exchangeCurrencyHistory(req, res) {
  if (req.method === 'GET') {
    const fregvencyOptions = {
      daily: 'DIGITAL_CURRENCY_DAILY',
      weekly: 'DIGITAL_CURRENCY_WEEKLY',
      monthly: 'DIGITAL_CURRENCY_MONTHLY'
    }

    const from = req.query.from
    const to = req.query.to
    const frequency =
      fregvencyOptions[req.query.frequency] || fregvencyOptions.daily

    if (from != null && to !== null) {
      fetch(
        `https://www.alphavantage.co/query?function=${frequency}&symbol=${from}&market=${to}&apikey=WVS7S95FAMLLH9Z6`
      )
        .then(res => res.json())
        .then(json => {
          const data = json['Time Series (Digital Currency Daily)']

          const rowData = Object.keys(data).map(key => {
            return {
              date: key,
              open: data[key][`1a. open (${to})`],
              high: data[key][`2a. high (${to})`],
              low: data[key][`3a. low (${to})`],
              close: data[key][`4a. close (${to})`]
            }
          })

          res.status(200).jsonp(rowData)
        })
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
  exchangeCurrency,
  exchangeCurrencyHistory
}
