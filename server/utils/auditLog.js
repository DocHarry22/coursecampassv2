import { applyInMemoryListQuery, parseListQuery } from "./queryOptions.js";

const ensureAuditStore = (app) => {
  if (!app.locals.auditEvents) {
    app.locals.auditEvents = [];
  }

  return app.locals.auditEvents;
};

export const recordAuditEvent = (req, event) => {
  const store = ensureAuditStore(req.app);
  const entry = {
    id: `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`,
    createdAt: new Date().toISOString(),
    actorUserId: req.auth?.userId || null,
    actorRole: req.auth?.role || null,
    requestId: req.requestId || null,
    action: event.action || "unknown",
    targetUserId: event.targetUserId || null,
    details: event.details || null,
  };

  store.unshift(entry);
  if (store.length > 2000) {
    store.splice(2000);
  }

  return entry;
};

export const listAuditEvents = (req) => {
  const queryOptions = parseListQuery(req.query, {
    defaultLimit: 50,
    defaultSortField: "createdAt",
    defaultSortOrder: -1,
    allowedSortFields: ["createdAt", "action", "actorUserId", "targetUserId"],
    allowedFilters: ["action", "actorUserId", "targetUserId"],
  });

  const rows = ensureAuditStore(req.app);
  const filtered = rows.filter((entry) => {
    if (queryOptions.filters.action && String(entry.action || "").toLowerCase() !== queryOptions.filters.action.toLowerCase()) {
      return false;
    }

    if (queryOptions.filters.actorUserId && String(entry.actorUserId || "") !== String(queryOptions.filters.actorUserId)) {
      return false;
    }

    if (queryOptions.filters.targetUserId && String(entry.targetUserId || "") !== String(queryOptions.filters.targetUserId)) {
      return false;
    }

    return true;
  });

  return applyInMemoryListQuery(filtered, queryOptions);
};
