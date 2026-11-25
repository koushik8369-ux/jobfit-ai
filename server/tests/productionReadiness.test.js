import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getTrustProxy } from '../src/config/proxy.js';

function createLogger() {
  const entries = [];
  return {
    entries,
    info(message) { entries.push(JSON.parse(message)); },
    error(message) { entries.push(JSON.parse(message)); },
  };
}

describe('production readiness middleware', () => {
  it('sets API security headers and a generated request ID', async () => {
    const response = await request(createApp()).get('/api/health');

    assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/i);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.match(response.headers['content-security-policy'], /default-src 'none'/);
    assert.equal(response.headers['x-powered-by'], undefined);
  });

  it('logs sanitized structured request data without query values', async () => {
    const logger = createLogger();
    const response = await request(createApp({ logger }))
      .get('/api/health?access_token=must-not-be-logged');

    const record = logger.entries.find((entry) => entry.event === 'http_request');
    assert.equal(record.requestId, response.headers['x-request-id']);
    assert.equal(record.path, '/api/health');
    assert.equal(record.statusCode, 200);
    assert.equal(JSON.stringify(logger.entries).includes('must-not-be-logged'), false);
  });

  it('keeps liveness successful and reports database disconnection as not ready', async () => {
    const app = createApp();
    const liveness = await request(app).get('/api/health/live');
    const readiness = await request(app).get('/api/health/ready');

    assert.equal(liveness.status, 200);
    assert.deepEqual(liveness.body, { status: 'ok' });
    assert.equal(readiness.status, 503);
    assert.deepEqual(readiness.body, { status: 'not_ready', database: 'disconnected' });
  });

  it('limits authentication attempts and includes correlation IDs in rate-limit errors', async () => {
    const app = createApp({
      authRateLimitOptions: { windowMs: 60_000, limit: 2 },
    });

    await request(app).post('/api/auth/login').send({});
    await request(app).post('/api/auth/login').send({});
    const limited = await request(app).post('/api/auth/login').send({});

    assert.equal(limited.status, 429);
    assert.equal(limited.body.message, 'Too many authentication attempts. Please try again later.');
    assert.equal(limited.body.requestId, limited.headers['x-request-id']);
    assert.ok(limited.headers['ratelimit']);
  });

  it('rejects unsafe proxy-hop configuration and accepts an explicit Render hop', () => {
    assert.equal(getTrustProxy({ TRUST_PROXY: '0' }), false);
    assert.equal(getTrustProxy({ TRUST_PROXY: '1' }), 1);
    assert.throws(() => getTrustProxy({ TRUST_PROXY: 'true' }), /proxy-hop count/);
    assert.throws(() => getTrustProxy({ TRUST_PROXY: '11' }), /between 1 and 10/);
  });
});
