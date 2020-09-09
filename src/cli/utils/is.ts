function FILE(s: string) {
  return !URL(s) && /\.json$/.test(s)
}

function JS(s: string) {
  return !URL(s) && /\.js$/.test(s)
}

function URL(s: string) {
  return /^(http|https):/.test(s)
}

export {
  FILE,
  JS,
  URL
}