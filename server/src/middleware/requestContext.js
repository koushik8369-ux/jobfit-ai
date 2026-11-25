import { randomUUID } from 'node:crypto';

export function createRequestContext(logger = console) {
  return (request, response, next) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    request.id = requestId;
    request.logger = logger;
    response.setHeader('X-Request-Id', requestId);

    response.once('finish', () => {
      const pathSegments = request.originalUrl
        .split('?', 1)[0]
        .split('/')
        .filter(Boolean)
        .slice(0, 2);
      logger.info(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'http_request',
        requestId,
        method: request.method,
        path: `/${pathSegments.join('/')}`,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    });

    next();
  };
}
