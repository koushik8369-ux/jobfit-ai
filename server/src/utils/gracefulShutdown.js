function writeLog(logger, level, event, details = {}) {
  try {
    const write = logger?.[level];
    if (typeof write === 'function') {
      write.call(logger, JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event,
        ...details,
      }));
    }
  } catch {
    // Logging failures must not interrupt resource cleanup.
  }
}

function safeErrorName(error) {
  try {
    if (typeof error?.name !== 'string') return 'Error';
    return error.name.slice(0, 64).replace(/[^\w.-]/g, '') || 'Error';
  } catch {
    return 'Error';
  }
}

function closeHttpServer(server) {
  return new Promise((resolve) => {
    try {
      server.close((error) => resolve(error ?? null));
    } catch (error) {
      resolve(error);
    }
  });
}

function normalizeSignal(signal) {
  return signal === 'SIGINT' || signal === 'SIGTERM' ? signal : 'unknown';
}

export function createGracefulShutdown({
  server,
  disconnect,
  logger = console,
  timeoutMs = 10_000,
  setExitCode = (code) => { process.exitCode = code; },
  terminate = (code) => process.exit(code),
}) {
  let shutdownPromise;
  const markFailed = () => {
    try {
      setExitCode(1);
    } catch (error) {
      writeLog(logger, 'error', 'shutdown_exit_code_failed', {
        errorName: safeErrorName(error),
      });
    }
  };

  return (signal) => {
    if (shutdownPromise) {
      writeLog(logger, 'info', 'shutdown_signal_ignored', {
        signal: normalizeSignal(signal),
      });
      return shutdownPromise;
    }

    const safeSignal = normalizeSignal(signal);
    writeLog(logger, 'info', 'shutdown_started', { signal: safeSignal });

    let timedOut = false;
    let timeout;
    const timeoutPromise = new Promise((resolve) => {
      timeout = setTimeout(() => {
        timedOut = true;
        writeLog(logger, 'error', 'shutdown_timeout', { timeoutMs });
        markFailed();
        try {
          server.closeAllConnections();
        } catch (error) {
          writeLog(logger, 'error', 'http_connections_close_failed', {
            errorName: safeErrorName(error),
          });
        }
        try {
          terminate(1);
        } catch (error) {
          writeLog(logger, 'error', 'shutdown_termination_failed', {
            errorName: safeErrorName(error),
          });
        }
        resolve();
      }, timeoutMs);
    });

    const cleanupPromise = (async () => {
      const closeError = await closeHttpServer(server);
      if (closeError) {
        writeLog(logger, 'error', 'http_server_close_failed', {
          errorName: safeErrorName(closeError),
        });
        markFailed();
        try {
          server.closeAllConnections();
        } catch (error) {
          writeLog(logger, 'error', 'http_connections_close_failed', {
            errorName: safeErrorName(error),
          });
        }
      }

      try {
        await disconnect();
      } catch (error) {
        writeLog(logger, 'error', 'database_disconnect_failed', {
          errorName: safeErrorName(error),
        });
        markFailed();
      }

      if (!timedOut) {
        writeLog(logger, 'info', 'shutdown_complete', { signal: safeSignal });
      }
    })();

    shutdownPromise = Promise.race([cleanupPromise, timeoutPromise])
      .finally(() => clearTimeout(timeout));
    return shutdownPromise;
  };
}
