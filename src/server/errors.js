// Custom error types for better error handling

class HttpError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(message, 404)
  }
}

class BadRequestError extends HttpError {
  constructor(message = 'Bad request') {
    super(message, 400)
  }
}

class ValidationError extends HttpError {
  constructor(message = 'Validation failed') {
    super(message, 400)
  }
}

class ConflictError extends HttpError {
  constructor(message = 'Resource already exists') {
    super(message, 409)
  }
}

module.exports = {
  HttpError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  ConflictError
}
