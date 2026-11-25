import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGracefulShutdown } from '../src/utils/gracefulShutdown.js';

function createHarness({ close, disconnect, timeoutMs = 1000 } = {}) {
  const logs = [];
  const events = [];
  let exitCode;
  const terminationCodes = [];
  const server = {
    close(callback) {
      events.push('http-close');
      if (close) close(callback);
      else callback();
    },
    closeAllConnections() {
      events.push('force-close');
    },
  };
  const shutdown = createGracefulShutdown({
    server,
    disconnect: disconnect ?? (async () => { events.push('database-disconnect'); }),
    logger: {
      info(message) { logs.push(JSON.parse(message)); },
      error(message) { logs.push(JSON.parse(message)); },
    },
    timeoutMs,
    setExitCode(code) { exitCode = code; },
    terminate(code) { terminationCodes.push(code); },
  });
  return { shutdown, events, logs, getExitCode: () => exitCode, terminationCodes };
}

describe('graceful shutdown', () => {
  it('closes HTTP before MongoDB and logs successful completion', async () => {
    const harness = createHarness();

    await harness.shutdown('SIGTERM');

    assert.deepEqual(harness.events, ['http-close', 'database-disconnect']);
    assert.equal(harness.logs.at(-1).event, 'shutdown_complete');
    assert.equal(harness.logs.at(-1).signal, 'SIGTERM');
    assert.equal(harness.getExitCode(), undefined);
  });

  it('continues MongoDB cleanup and safely logs HTTP close failures', async () => {
    const harness = createHarness({
      close(callback) {
        callback(Object.assign(new Error('private connection detail'), { name: 'HttpError' }));
      },
    });

    await harness.shutdown('SIGINT');

    assert.deepEqual(harness.events, ['http-close', 'force-close', 'database-disconnect']);
    assert.equal(harness.getExitCode(), 1);
    const failure = harness.logs.find((entry) => entry.event === 'http_server_close_failed');
    assert.equal(failure.errorName, 'HttpError');
    assert.equal(JSON.stringify(failure).includes('private connection detail'), false);
  });

  it('safely logs MongoDB disconnection failures', async () => {
    const harness = createHarness({
      disconnect() {
        throw Object.assign(new Error('private database detail'), { name: 'MongoError' });
      },
    });

    await harness.shutdown('SIGTERM');

    assert.equal(harness.getExitCode(), 1);
    const failure = harness.logs.find((entry) => entry.event === 'database_disconnect_failed');
    assert.equal(failure.errorName, 'MongoError');
    assert.equal(JSON.stringify(failure).includes('private database detail'), false);
  });

  it('keeps the timeout active while MongoDB disconnection is stalled', async () => {
    let finishDisconnect;
    const harness = createHarness({
      timeoutMs: 10,
      disconnect() {
        harness.events.push('database-disconnect');
        return new Promise((resolve) => { finishDisconnect = resolve; });
      },
    });

    await harness.shutdown('SIGTERM');

    assert.deepEqual(harness.events, ['http-close', 'database-disconnect', 'force-close']);
    assert.equal(harness.getExitCode(), 1);
    assert.deepEqual(harness.terminationCodes, [1]);
    assert.ok(harness.logs.some((entry) => entry.event === 'shutdown_timeout'));

    finishDisconnect();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(harness.logs.some((entry) => entry.event === 'shutdown_complete'), false);
  });

  it('times out a stalled HTTP close without waiting or terminating the process', async () => {
    const harness = createHarness({
      timeoutMs: 10,
      close() {},
    });

    await harness.shutdown('SIGTERM');

    assert.deepEqual(harness.events, ['http-close', 'force-close']);
    assert.equal(harness.getExitCode(), 1);
    assert.deepEqual(harness.terminationCodes, [1]);
    assert.ok(harness.logs.some((entry) => entry.event === 'shutdown_timeout'));
  });

  it('handles repeated signals with one cleanup sequence', async () => {
    const logs = [];
    const events = [];
    let closeCallback;
    const shutdown = createGracefulShutdown({
      server: {
        close(callback) {
          events.push('http-close');
          closeCallback = callback;
        },
        closeAllConnections() { events.push('force-close'); },
      },
      async disconnect() { events.push('database-disconnect'); },
      logger: {
        info(message) { logs.push(JSON.parse(message)); },
        error(message) { logs.push(JSON.parse(message)); },
      },
      timeoutMs: 1000,
      setExitCode() {},
      terminate() {},
    });

    const first = shutdown('SIGTERM');
    const second = shutdown('SIGINT');
    assert.equal(first, second);
    closeCallback();
    await first;

    assert.deepEqual(events, ['http-close', 'database-disconnect']);
    assert.ok(logs.some((entry) => entry.event === 'shutdown_signal_ignored'));
  });

  it('continues cleanup when the logger itself fails', async () => {
    const events = [];
    const shutdown = createGracefulShutdown({
      server: { close(callback) { callback(); }, closeAllConnections() {} },
      async disconnect() { events.push('database-disconnect'); },
      logger: { info() { throw new Error('logger failure'); }, error() { throw new Error('logger failure'); } },
      timeoutMs: 1000,
      setExitCode() {},
      terminate() {},
    });

    await shutdown('SIGTERM');

    assert.deepEqual(events, ['database-disconnect']);
  });
});
