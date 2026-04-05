import User from "../models/User.js";
import { revokeAllSessions, revokeUserSessions } from "./auth.js";
import { getObservabilitySnapshot } from "../middleware/observability.js";
import { AppError, createValidationError } from "../utils/errors.js";
import { sendApiResponse } from "../utils/response.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import { listAuditEvents, recordAuditEvent } from "../utils/auditLog.js";
import { findRuntimeUserById, getRuntimeCollection, updateRuntimeUser } from "../utils/runtimeStore.js";
import { parseListQuery, escapeRegExp, applyInMemoryListQuery } from "../utils/queryOptions.js";
import { normalizeAccountStatus, parseAccountStatus, parseRole } from "../utils/userGovernance.js";
import { sanitizeUser } from "../utils/authUser.js";

const notFound = (message = "User was not found.") => new AppError(404, "NOT_FOUND", message);

const buildUsersQuery = (req) =>
  parseListQuery(req.query, {
    defaultLimit: 25,
    defaultSortField: "name",
    defaultSortOrder: 1,
    allowedSortFields: ["_id", "name", "email", "role", "accountStatus", "country"],
    allowedFilters: ["search", "role", "accountStatus", "country"],
  });

const applyUserFiltersInMemory = (rows, queryOptions) => {
  const searchExpr = queryOptions.filters.search
    ? new RegExp(escapeRegExp(queryOptions.filters.search), "i")
    : null;

  const filtered = rows.filter((row) => {
    if (queryOptions.filters.role && String(row.role || "").toLowerCase() !== queryOptions.filters.role.toLowerCase()) {
      return false;
    }

    if (
      queryOptions.filters.accountStatus &&
      normalizeAccountStatus(row.accountStatus) !== normalizeAccountStatus(queryOptions.filters.accountStatus)
    ) {
      return false;
    }

    if (queryOptions.filters.country && String(row.country || "").toLowerCase() !== queryOptions.filters.country.toLowerCase()) {
      return false;
    }

    if (searchExpr) {
      const haystack = `${row.name || ""} ${row.email || ""}`;
      return searchExpr.test(haystack);
    }

    return true;
  });

  return applyInMemoryListQuery(filtered, queryOptions);
};

const getUserById = async (req, userId) => {
  const normalizedUserId = String(userId || "");
  if (!normalizedUserId) {
    return null;
  }

  if (isDatabaseConnected(req)) {
    const dbUser = await User.findById(normalizedUserId).lean();
    if (dbUser) {
      return { user: dbUser, source: "database" };
    }
  }

  const runtimeUser = findRuntimeUserById(req, normalizedUserId);
  if (runtimeUser) {
    return { user: runtimeUser, source: "fallback" };
  }

  return null;
};

const countSuperadmins = async (req) => {
  if (isDatabaseConnected(req)) {
    return User.countDocuments({ role: /^superadmin$/i });
  }

  const users = getRuntimeCollection(req, "users");
  return users.filter((user) => String(user.role || "").toLowerCase() === "superadmin").length;
};

const guardLastSuperadminDemotion = async (req, targetUser, nextRole) => {
  const currentRole = String(targetUser.role || "").toLowerCase();
  if (currentRole !== "superadmin" || nextRole === "superadmin") {
    return;
  }

  const totalSuperadmins = await countSuperadmins(req);

  if (totalSuperadmins <= 1) {
    throw createValidationError([
      {
        field: "role",
        message: "Cannot remove role from the final remaining superadmin.",
      },
    ]);
  }
};

const guardLastSuperadminDeactivation = async (req, targetUser, nextStatus) => {
  const currentRole = String(targetUser.role || "").toLowerCase();
  if (currentRole !== "superadmin" || nextStatus === "active") {
    return;
  }

  const totalSuperadmins = await countSuperadmins(req);

  if (totalSuperadmins <= 1) {
    throw createValidationError([
      {
        field: "accountStatus",
        message: "Cannot deactivate the final remaining superadmin.",
      },
    ]);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const queryOptions = buildUsersQuery(req);

    if (isDatabaseConnected(req)) {
      const filter = {};

      if (queryOptions.filters.role) {
        filter.role = new RegExp(`^${escapeRegExp(queryOptions.filters.role)}$`, "i");
      }

      if (queryOptions.filters.accountStatus) {
        filter.accountStatus = new RegExp(`^${escapeRegExp(queryOptions.filters.accountStatus)}$`, "i");
      }

      if (queryOptions.filters.country) {
        filter.country = new RegExp(`^${escapeRegExp(queryOptions.filters.country)}$`, "i");
      }

      if (queryOptions.filters.search) {
        const searchExpr = new RegExp(escapeRegExp(queryOptions.filters.search), "i");
        filter.$or = [{ name: searchExpr }, { email: searchExpr }];
      }

      const rows = await User.find(filter)
        .sort({ [queryOptions.sortField]: queryOptions.sortOrder })
        .skip(queryOptions.skip)
        .limit(queryOptions.limit)
        .lean();

      sendApiResponse(
        res,
        200,
        rows.map((row) => sanitizeUser(row)),
        { source: "database" }
      );
      return;
    }

    const users = getRuntimeCollection(req, "users");
    const rows = applyUserFiltersInMemory(users, queryOptions).map((row) => sanitizeUser(row));

    sendApiResponse(res, 200, rows, { source: "fallback", fallbackReason: "database_unavailable" });
  } catch (error) {
    next(error);
  }
};

export const getUserDetails = async (req, res, next) => {
  try {
    const resolvedUser = await getUserById(req, req.params.id);

    if (!resolvedUser) {
      throw notFound();
    }

    sendApiResponse(res, 200, { user: sanitizeUser(resolvedUser.user) }, { source: resolvedUser.source });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const targetUserId = String(req.params.id);
    const actorUserId = String(req.auth.userId);
    const nextRole = parseRole(req.body?.role);
    const resolvedUser = await getUserById(req, targetUserId);

    if (!resolvedUser) {
      throw notFound();
    }

    await guardLastSuperadminDemotion(req, resolvedUser.user, nextRole);

    const currentRole = String(resolvedUser.user.role || "user").toLowerCase();
    if (actorUserId === targetUserId && currentRole === "superadmin" && nextRole !== "superadmin") {
      throw createValidationError([
        {
          field: "role",
          message: "Superadmin self-demotion is not allowed.",
        },
      ]);
    }

    let updatedUser = null;

    if (resolvedUser.source === "database" && isDatabaseConnected(req)) {
      updatedUser = await User.findByIdAndUpdate(
        targetUserId,
        {
          role: nextRole,
        },
        { new: true, runValidators: true }
      ).lean();
    } else {
      updatedUser = updateRuntimeUser(req, targetUserId, { role: nextRole });
    }

    if (!updatedUser) {
      throw notFound();
    }

    recordAuditEvent(req, {
      action: "user.role.updated",
      targetUserId,
      details: {
        previousRole: currentRole,
        nextRole,
      },
    });

    sendApiResponse(res, 200, { user: sanitizeUser(updatedUser) }, { source: resolvedUser.source });
  } catch (error) {
    next(error);
  }
};

export const updateUserAccountStatus = async (req, res, next) => {
  try {
    const targetUserId = String(req.params.id);
    const nextStatus = parseAccountStatus(req.body?.accountStatus);
    const reason = String(req.body?.reason || "").trim();
    const revokeSessions = req.body?.revokeSessions !== false;
    const resolvedUser = await getUserById(req, targetUserId);

    if (!resolvedUser) {
      throw notFound();
    }

    await guardLastSuperadminDeactivation(req, resolvedUser.user, nextStatus);

    const updates = {
      accountStatus: nextStatus,
      accountStatusReason: reason,
    };

    let updatedUser = null;
    if (resolvedUser.source === "database" && isDatabaseConnected(req)) {
      updatedUser = await User.findByIdAndUpdate(targetUserId, updates, { new: true, runValidators: true }).lean();
    } else {
      updatedUser = updateRuntimeUser(req, targetUserId, updates);
    }

    if (!updatedUser) {
      throw notFound();
    }

    if (revokeSessions || nextStatus !== "active") {
      await revokeUserSessions(req, targetUserId);
    }

    recordAuditEvent(req, {
      action: "user.accountStatus.updated",
      targetUserId,
      details: {
        nextStatus,
        reason,
        revokeSessions: revokeSessions || nextStatus !== "active",
      },
    });

    sendApiResponse(res, 200, { user: sanitizeUser(updatedUser) }, { source: resolvedUser.source });
  } catch (error) {
    next(error);
  }
};

export const revokeUserSessionsByAdmin = async (req, res, next) => {
  try {
    const targetUserId = String(req.params.id);
    const resolvedUser = await getUserById(req, targetUserId);

    if (!resolvedUser) {
      throw notFound();
    }

    await revokeUserSessions(req, targetUserId);

    recordAuditEvent(req, {
      action: "user.sessions.revoked",
      targetUserId,
      details: {
        scope: "single_user",
      },
    });

    sendApiResponse(res, 200, { message: "User sessions revoked." }, { source: resolvedUser.source });
  } catch (error) {
    next(error);
  }
};

export const revokeAllSessionsByAdmin = async (req, res, next) => {
  try {
    await revokeAllSessions(req);

    recordAuditEvent(req, {
      action: "sessions.revoked",
      targetUserId: null,
      details: {
        scope: "all_users",
      },
    });

    sendApiResponse(res, 200, { message: "All sessions revoked." }, { source: "system" });
  } catch (error) {
    next(error);
  }
};

export const getAuditEvents = (req, res, next) => {
  try {
    const events = listAuditEvents(req);
    sendApiResponse(res, 200, events, { source: "system" });
  } catch (error) {
    next(error);
  }
};

export const getAdminObservabilityMetrics = (req, res) => {
  const snapshot = getObservabilitySnapshot(req.app);

  sendApiResponse(
    res,
    200,
    {
      service: "coursecampass-api",
      dbStatus: req.app.locals.dbStatus ?? "unknown",
      observability: snapshot,
    },
    { source: "system" }
  );
};
