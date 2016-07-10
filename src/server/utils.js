module.exports = {
  toNative: toNative
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
