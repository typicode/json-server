module.exports = {
  JSON: isJSON,
  JS: isJS,
  URL: isURL
}

function isJSON (s) {
  return !isURL(s) && /\.json$/.test(s)
}

function isJS (s) {
  return !isURL(s) && /\.js$/.test(s)
}

function isURL (s) {
  return /^(http|https):/.test(s)
}
