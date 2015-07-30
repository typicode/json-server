module.exports = {
  JSON: isJSON,
  JS: isJS,
  URL: isURL
}

function isJSON (s) {
  return /\.json$/.test(s)
}

function isJS (s) {
  return /\.js$/.test(s)
}

function isURL (s) {
  return /^(http|https):/.test(s)
}
