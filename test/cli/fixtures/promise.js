const data = require('./seed')()

module.exports = () => {
  return getAsyncData().then(response => {
    return response
  })
}

function getAsyncData() {
  return new Promise((resolve, reject) => {
    resolve(data)
  })
}
