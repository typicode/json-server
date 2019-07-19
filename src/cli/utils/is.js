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
    if (error.code === 'MODULE_NOT_FOUND') {
      return false
    } else {
      throw error
    }
  }
}

function URL(s) {
  return /^(http|https):/.test(s)
}
