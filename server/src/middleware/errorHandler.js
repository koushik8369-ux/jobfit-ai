export function notFoundHandler(_request, response, next) {
  const error = new Error('Route not found.');
  error.status = 404;
  next(error);
}

export function errorHandler(error, request, response, next, logger = request.logger ?? console) {
  if (response.headersSent) {
    return next(error);
  }

  const candidateStatus = error.status ?? error.statusCode;
  const status = Number.isInteger(candidateStatus)
      && ((candidateStatus >= 400 && candidateStatus < 500) || candidateStatus === 503)
    ? candidateStatus
    : 500;
  const message = error.type === 'entity.parse.failed'
    ? 'Malformed JSON request.'
    : status === 500 ? 'An unexpected internal error occurred.' : error.message;

  const errorResponse = {
    message,
    status,
    timestamp: new Date().toISOString(),
  };
  if (request.id) {
    errorResponse.requestId = request.id;
  }
  if (status === 400 && error.errors) {
    errorResponse.errors = error.errors;
  }

  if (status >= 500) {
    logger.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'http_error',
      requestId: request.id,
      statusCode: status,
      errorName: typeof error.name === 'string' ? error.name : 'Error',
    }));
  }

  response.status(status).json(errorResponse);
}