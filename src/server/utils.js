module.exports = {
  parseArgv,
  getPage,
}

function parseArgv(arr) {
  arr = typeof arr === 'string' ? arr.trim().split(/\s+/) : arr
  return (arr || process.argv.slice(2)).reduce((acc, arg) => {
    let [k, ...v] = arg.split(`=`)
    v = v.join(`=`)
    acc[k] =
      v === ``
        ? true
        : /^(true|false)$/.test(v)
        ? v === `true`
        : /[\d|.]+/.test(v)
        ? isNaN(Number(v))
          ? v
          : Number(v)
        : v
    return acc
  }, {})
}

function getPage(array, page, perPage) {
  const obj = {}
  const start = (page - 1) * perPage
  const end = page * perPage

  obj.items = array.slice(start, end)
  if (obj.items.length === 0) {
    return obj
  }

  if (page > 1) {
    obj.prev = page - 1
  }

  if (end < array.length) {
    obj.next = page + 1
  }

  if (obj.items.length !== array.length) {
    obj.current = page
    obj.first = 1
    obj.last = Math.ceil(array.length / perPage)
  }

  return obj
}
