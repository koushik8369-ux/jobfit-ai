import mongoose from 'mongoose';

export function getMongoUri(env = process.env) {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI must be configured before connecting to MongoDB.');
  }
  return uri;
}

export function getDatabaseStatus(connection = mongoose.connection) {
  return connection.readyState === 1 ? 'connected' : 'disconnected';
}

export async function connectDatabase({ env = process.env, client = mongoose, logger = console } = {}) {
  const uri = getMongoUri(env);

  try {
    await client.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: false,
      autoCreate: false,
    });
    logger.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'database_connected',
    }));
  } catch (error) {
    logger.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'database_connection_failed',
      errorName: typeof error?.name === 'string' ? error.name : 'ConnectionError',
    }));
    throw new Error('MongoDB connection failed. Check MONGODB_URI and database availability.');
  }
}