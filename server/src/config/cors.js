export function getAllowedOrigins(env = process.env) {
  const configured = env.CORS_ALLOWED_ORIGINS?.trim();
  const origins = (configured || (env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS must contain explicit origins in production.');
  }
  if (origins.includes('*')) {
    throw new Error('Wildcard CORS origins are not allowed.');
  }

  return origins.map((origin) => {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('CORS_ALLOWED_ORIGINS must contain valid HTTP(S) origins.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)
        || parsed.username
        || parsed.password
        || parsed.pathname !== '/'
        || parsed.search
        || parsed.hash
        || parsed.origin === 'null') {
      throw new Error('CORS_ALLOWED_ORIGINS must contain origins without credentials, paths, or query strings.');
    }
    if (env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('CORS_ALLOWED_ORIGINS must use HTTPS in production.');
    }
    return parsed.origin;
  });
}

export function createCorsOptions(env = process.env) {
  const allowedOrigins = getAllowedOrigins(env);
  return {
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
  };
}