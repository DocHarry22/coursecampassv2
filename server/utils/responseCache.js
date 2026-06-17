const DEFAULT_CACHE_TTL_MS = 15_000;
const DEFAULT_CACHE_MAX_ENTRIES = 100;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const getCacheConfig = () => ({
  ttlMs: parsePositiveInt(process.env.RESPONSE_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS),
  maxEntries: parsePositiveInt(process.env.RESPONSE_CACHE_MAX_ENTRIES, DEFAULT_CACHE_MAX_ENTRIES),
});

const ensureCacheStore = (app) => {
  if (!app.locals.responseCache) {
    app.locals.responseCache = {
      entries: new Map(),
      pending: new Map(),
    };
  }

  return app.locals.responseCache;
};

const trimEntries = (entries, maxEntries) => {
  while (entries.size > maxEntries) {
    const oldestKey = entries.keys().next().value;
    entries.delete(oldestKey);
  }
};

const getValidEntry = (entries, key) => {
  const entry = entries.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }

  return entry;
};

export const getOrSetResponseCache = async (app, key, producer, options = {}) => {
  const store = ensureCacheStore(app);
  const config = getCacheConfig();
  const ttlMs = parsePositiveInt(options.ttlMs, config.ttlMs);
  const maxEntries = parsePositiveInt(options.maxEntries, config.maxEntries);
  const normalizedKey = String(key || "").trim();

  if (!normalizedKey) {
    const producedValue = await producer();
    return { value: producedValue, cacheHit: false };
  }

  const cachedEntry = getValidEntry(store.entries, normalizedKey);
  if (cachedEntry) {
    return { value: cachedEntry.value, cacheHit: true };
  }

  const pending = store.pending.get(normalizedKey);
  if (pending) {
    const value = await pending;
    return { value, cacheHit: true };
  }

  const pendingPromise = Promise.resolve()
    .then(producer)
    .then((value) => {
      store.entries.set(normalizedKey, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      trimEntries(store.entries, maxEntries);
      return value;
    })
    .finally(() => {
      store.pending.delete(normalizedKey);
    });

  store.pending.set(normalizedKey, pendingPromise);
  const value = await pendingPromise;
  return { value, cacheHit: false };
};

export const invalidateResponseCache = (app, keyPrefix = "") => {
  const store = ensureCacheStore(app);
  const prefix = String(keyPrefix || "").trim();

  if (!prefix) {
    const removed = store.entries.size;
    store.entries.clear();
    return removed;
  }

  let removed = 0;
  for (const key of store.entries.keys()) {
    if (key.startsWith(prefix)) {
      store.entries.delete(key);
      removed += 1;
    }
  }

  return removed;
};
