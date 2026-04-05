const getSlowRequestThresholdMs = () => {
  const parsed = Number.parseInt(String(process.env.OBS_SLOW_REQUEST_MS || ""), 10);
  return Number.isNaN(parsed) ? 1000 : parsed;
};

const nowIso = () => new Date().toISOString();

const defaultObservability = () => ({
  startedAt: nowIso(),
  requestsTotal: 0,
  errorsTotal: 0,
  slowRequestsTotal: 0,
  statusCodes: {},
  routes: {},
  process: {
    unhandledRejections: 0,
    uncaughtExceptions: 0,
  },
  lastRequestAt: null,
});

const routeKeyForRequest = (req) => {
  const path = String(req.originalUrl || req.url || "").split("?")[0] || "/";
  return `${req.method} ${path}`;
};

const incrementCounter = (obj, key) => {
  obj[key] = (obj[key] || 0) + 1;
};

export const initializeObservability = (app) => {
  if (!app.locals.observability) {
    app.locals.observability = defaultObservability();
  }
};

export const observabilityMiddleware = (req, res, next) => {
  initializeObservability(req.app);
  const observability = req.app.locals.observability;
  const startNs = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const roundedDurationMs = Number(durationMs.toFixed(2));
    const status = res.statusCode || 0;
    const routeKey = routeKeyForRequest(req);

    observability.requestsTotal += 1;
    observability.lastRequestAt = nowIso();
    incrementCounter(observability.statusCodes, String(status));

    if (!observability.routes[routeKey]) {
      observability.routes[routeKey] = {
        hits: 0,
        errors: 0,
        avgLatencyMs: 0,
        maxLatencyMs: 0,
      };
    }

    const routeStats = observability.routes[routeKey];
    routeStats.hits += 1;

    if (status >= 400) {
      observability.errorsTotal += 1;
      routeStats.errors += 1;
    }

    routeStats.maxLatencyMs = Math.max(routeStats.maxLatencyMs, roundedDurationMs);
    routeStats.avgLatencyMs = Number(
      ((routeStats.avgLatencyMs * (routeStats.hits - 1) + roundedDurationMs) / routeStats.hits).toFixed(2)
    );

    const slowThreshold = getSlowRequestThresholdMs();
    const isSlow = roundedDurationMs >= slowThreshold;

    if (isSlow) {
      observability.slowRequestsTotal += 1;
    }

    if ((process.env.NODE_ENV || "development") === "production" && (isSlow || status >= 500)) {
      console.log(
        JSON.stringify({
          level: status >= 500 ? "error" : "warn",
          message: status >= 500 ? "Request failed" : "Slow request",
          requestId: req.requestId || null,
          method: req.method,
          path: String(req.originalUrl || "").split("?")[0] || "/",
          status,
          durationMs: roundedDurationMs,
        })
      );
    }
  });

  next();
};

const safeExit = (code) => {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  process.exit(code);
};

export const registerProcessHooks = ({ app, server }) => {
  if (app.locals.processHooksRegistered) {
    return;
  }

  app.locals.processHooksRegistered = true;
  let shuttingDown = false;

  const closeServer = (signal, exitCode) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    app.locals.isShuttingDown = true;

    console.log(
      JSON.stringify({
        level: "warn",
        message: "Graceful shutdown initiated",
        signal,
      })
    );

    const forceCloseTimer = setTimeout(() => {
      console.error(
        JSON.stringify({
          level: "error",
          message: "Graceful shutdown timed out; forcing exit",
          signal,
        })
      );
      safeExit(1);
    }, 10_000);

    forceCloseTimer.unref?.();

    server.close(() => {
      clearTimeout(forceCloseTimer);
      safeExit(exitCode);
    });
  };

  process.on("SIGTERM", () => closeServer("SIGTERM", 0));
  process.on("SIGINT", () => closeServer("SIGINT", 0));

  process.on("unhandledRejection", (reason) => {
    initializeObservability(app);
    app.locals.observability.process.unhandledRejections += 1;

    console.error(
      JSON.stringify({
        level: "error",
        message: "Unhandled rejection detected",
        reason: reason instanceof Error ? reason.message : String(reason),
      })
    );
  });

  process.on("uncaughtException", (error) => {
    initializeObservability(app);
    app.locals.observability.process.uncaughtExceptions += 1;

    console.error(
      JSON.stringify({
        level: "fatal",
        message: "Uncaught exception detected",
        error: error.message,
      })
    );

    closeServer("UNCAUGHT_EXCEPTION", 1);
  });
};

const topRoutes = (routes, limit = 15) =>
  Object.entries(routes)
    .sort((left, right) => right[1].hits - left[1].hits)
    .slice(0, limit)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

export const getObservabilitySnapshot = (app) => {
  initializeObservability(app);
  const observability = app.locals.observability;

  return {
    startedAt: observability.startedAt,
    requestsTotal: observability.requestsTotal,
    errorsTotal: observability.errorsTotal,
    slowRequestsTotal: observability.slowRequestsTotal,
    statusCodes: observability.statusCodes,
    lastRequestAt: observability.lastRequestAt,
    process: observability.process,
    topRoutes: topRoutes(observability.routes),
    uptimeSeconds: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    isShuttingDown: Boolean(app.locals.isShuttingDown),
  };
};
