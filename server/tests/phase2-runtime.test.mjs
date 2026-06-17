import test from "node:test";
import assert from "node:assert/strict";
import { enqueueBackgroundJob, getBackgroundJobs, getBackgroundJobStats } from "../utils/backgroundJobs.js";
import { getOrSetResponseCache, invalidateResponseCache } from "../utils/responseCache.js";

const createApp = () => ({ locals: {} });

test("response cache reuses producer result within ttl", async () => {
  const app = createApp();
  let callCount = 0;
  const producer = async () => {
    callCount += 1;
    return { value: callCount };
  };

  const first = await getOrSetResponseCache(app, "summary", producer, { ttlMs: 1000 });
  const second = await getOrSetResponseCache(app, "summary", producer, { ttlMs: 1000 });

  assert.equal(first.value.value, 1);
  assert.equal(second.value.value, 1);
  assert.equal(callCount, 1);
  assert.equal(second.cacheHit, true);
});

test("response cache invalidation clears matching prefixes", async () => {
  const app = createApp();

  await getOrSetResponseCache(app, "general.summary", async () => ({ users: 1 }), { ttlMs: 1000 });
  await getOrSetResponseCache(app, "general.metrics", async () => ({ requests: 5 }), { ttlMs: 1000 });

  const removed = invalidateResponseCache(app, "general.summary");
  assert.equal(removed, 1);

  const result = await getOrSetResponseCache(app, "general.summary", async () => ({ users: 2 }), { ttlMs: 1000 });
  assert.equal(result.value.users, 2);
  assert.equal(result.cacheHit, false);
});

test("background jobs execute and expose completion status", async () => {
  const app = createApp();
  const req = {
    app,
    auth: { userId: "admin-1" },
    requestId: "req-1",
  };

  enqueueBackgroundJob(req, {
    name: "test.job",
    task: async () => undefined,
  });

  await new Promise((resolve) => setTimeout(resolve, 20));

  const stats = getBackgroundJobStats(app);
  const jobs = getBackgroundJobs(app, 5);

  assert.equal(stats.completed, 1);
  assert.equal(stats.failed, 0);
  assert.equal(jobs[0].name, "test.job");
  assert.equal(jobs[0].status, "completed");
});

test("background jobs capture failures", async () => {
  const app = createApp();
  const req = {
    app,
    auth: { userId: "admin-1" },
    requestId: "req-2",
  };

  enqueueBackgroundJob(req, {
    name: "test.failingJob",
    task: async () => {
      throw new Error("boom");
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 20));

  const stats = getBackgroundJobStats(app);
  const jobs = getBackgroundJobs(app, 5);

  assert.equal(stats.failed, 1);
  assert.equal(jobs[0].status, "failed");
  assert.equal(jobs[0].error, "boom");
});
