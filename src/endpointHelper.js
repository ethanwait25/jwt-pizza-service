const logger = require('./logger.js');

class StatusCodeError extends Error {
  constructor(message, statusCode) {
    super(message);
    logger.log('error', 'error', { response: JSON.stringify({ message, statusCode }) });
    this.statusCode = statusCode;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  asyncHandler,
  StatusCodeError,
};
