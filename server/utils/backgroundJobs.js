const DEFAULT_MAX_HISTORY = 100;

const ensureJobStore = (app) => {
  if (!app.locals.backgroundJobs) {
    app.locals.backgroundJobs = {
      nextId: 1,
      running: 0,
      queue: Promise.resolve(),
      jobs: [],
    };
  }

  return app.locals.backgroundJobs;
};

const toJobSummary = (job) => ({
  id: job.id,
  name: job.name,
  status: job.status,
  createdAt: job.createdAt,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
  actorUserId: job.actorUserId,
  requestId: job.requestId,
  error: job.error,
});

export const enqueueBackgroundJob = (req, config) => {
  const store = ensureJobStore(req.app);
  const maxHistory = Number.parseInt(String(process.env.BACKGROUND_JOBS_HISTORY || ""), 10) || DEFAULT_MAX_HISTORY;
  const job = {
    id: `job-${store.nextId++}`,
    name: String(config?.name || "background.job"),
    status: "queued",
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    actorUserId: req.auth?.userId || null,
    requestId: req.requestId || null,
    error: null,
  };

  store.jobs.unshift(job);
  if (store.jobs.length > maxHistory) {
    store.jobs.splice(maxHistory);
  }

  store.queue = store.queue
    .catch(() => undefined)
    .then(async () => {
      store.running += 1;
      job.status = "running";
      job.startedAt = new Date().toISOString();

      try {
        await config.task();
        job.status = "completed";
      } catch (error) {
        job.status = "failed";
        job.error = error instanceof Error ? error.message : String(error);
      } finally {
        store.running = Math.max(0, store.running - 1);
        job.finishedAt = new Date().toISOString();
      }
    });

  return toJobSummary(job);
};

export const getBackgroundJobs = (app, limit = 20) => {
  const store = ensureJobStore(app);
  const parsedLimit = Number.parseInt(String(limit || ""), 10);
  const normalizedLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);
  return store.jobs.slice(0, normalizedLimit).map(toJobSummary);
};

export const getBackgroundJobStats = (app) => {
  const store = ensureJobStore(app);
  const stats = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    total: store.jobs.length,
  };

  for (const job of store.jobs) {
    if (job.status === "queued") {
      stats.queued += 1;
    } else if (job.status === "running") {
      stats.running += 1;
    } else if (job.status === "completed") {
      stats.completed += 1;
    } else if (job.status === "failed") {
      stats.failed += 1;
    }
  }

  return stats;
};
