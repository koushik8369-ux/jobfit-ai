const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_PAGE = 1000;
const MAX_LIMIT = 100;

function parseBoundedInteger(value, fallback, maximum) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export function validateHistoryPagination(request, _response, next) {
  const page = parseBoundedInteger(request.query.page, DEFAULT_PAGE, MAX_PAGE);
  const limit = parseBoundedInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  if (page === null || limit === null) {
    const error = new Error('Pagination values must be positive integers within the supported limits.');
    error.status = 400;
    return next(error);
  }

  request.pagination = { page, limit };
  return next();
}
