const fetch = require('node-fetch')

module.exports = () => {
  const data = {
    currency: [],
    posts: []
  }

  for (let i = 0; i < 10; i++) {
    data.posts.push({ id: i, name: `user${i}` })
  }

  fetch('https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_MONTHLY&symbol=BTC&market=CNY&apikey=WVS7S95FAMLLH9Z6')
    .then(res => res.json())
    .then(json => data.currency.push(json))

  return data
}
