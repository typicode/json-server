module.exports = {
  FILE,
  Module,
  URL
}

function FILE(s) {
  return !URL(s) && /\.json$/.test(s)
}

function Module(s) {
  try {
    require(s)
    return true
  } catch (error) {
    return false
  }
}

function URL(s) {
  return /^(http|https):/.test(s)
}
