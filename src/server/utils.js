module.exports = {
  toNative: toNative,
  getPage: getPage
}

// Turns string to native.
// Example:
//   'true' -> true
//   '1' -> 1
function toNative (value) {
  if (typeof value === 'string') {
    if (
      value === '' ||
      value.trim() !== value ||
      (value.length > 1 && value[0] === '0')
    ) {
      return value
    } else if (value === 'true' || value === 'false') {
      return value === 'true'
    } else if (!isNaN(+value)) {
      var numValue = Number.parseInt(value, 10)

      // If the number is too large (not safe) for
      // Javascript's Number object, return it as a string
      if (!Number.isSafeInteger(numValue)) {
        return '' + value
      }

      return numValue
    }
  }
  return value
}

function getPage (array, page, perPage) {
  var obj = {}
  var start = (page - 1) * perPage
  var end = page * perPage

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
