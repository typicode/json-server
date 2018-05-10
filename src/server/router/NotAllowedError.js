function NotAllowedError(message = 'Not allowed') {
  this.name = 'NotAllowedError'
  this.message = message
  Error.call(this, message)
  Error.captureStackTrace(this, this.constructor)
}

NotAllowedError.prototype = Object.create(Error.prototype)
NotAllowedError.prototype.constructor = NotAllowedError

module.exports = NotAllowedError
