import { getDatabaseStatus } from '../config/database.js';

export function getHealth(_request, response) {
  response.status(200).json({
    status: 'ok',
    message: 'JOBFIT AI backend is running',
    database: getDatabaseStatus(),
  });
}

export function getLiveness(_request, response) {
  response.status(200).json({ status: 'ok' });
}

export function getReadiness(_request, response) {
  const database = getDatabaseStatus();
  const ready = database === 'connected';
  response.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    database,
  });
}