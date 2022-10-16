module.exports = {
  FILE,
  JS,
  URL,
}

function FILE(s) {
  return !URL(s) && /\.json$/.test(s)
}

function JS(s) {
  return !URL(s) && /\.c?js$/.test(s)
}

function URL(s) {
  return /^(http|https):/.test(s)
}
