module.exports = delay => (req, res, next) => {
  const jitter = Math.floor(Math.random() * (delay + 1)) // [0, delay]
  setTimeout(next, jitter)
}
