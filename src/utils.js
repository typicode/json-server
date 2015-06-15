module.exports = {
  toNative: toNative
}

// Turns string to native.
// Example:
//   'true' -> true
//   '1' -> 1
function toNative (value) {
  if (typeof value === 'string') {
    if (value === ''
       || value.trim() !== value
       || (value.length > 1 && value[0] === '0')) {
      return value
    } else if (value === 'true' || value === 'false') {
      return value === 'true'
    } else if (!isNaN(+value)) {
      return +value
    }
  }
  return value
}
