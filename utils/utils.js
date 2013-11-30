function toNative(value) {
  if (value === 'true' || value === 'false') {
    return value === 'true';
  } else if (!isNaN(+value)) {
    return +value;
  } else {
    return value;
  }
}

exports.toNative = toNative;