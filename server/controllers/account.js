import User from "../models/User.js";
import { AppError, createValidationError } from "../utils/errors.js";
import { sendApiResponse } from "../utils/response.js";
import { isDatabaseConnected } from "../utils/fallbackData.js";
import { findRuntimeUserById, updateRuntimeUser } from "../utils/runtimeStore.js";
import { hashPassword, verifyPasswordAgainstUser } from "../utils/passwords.js";
import { sanitizeUser } from "../utils/authUser.js";

const allowedProfileFields = ["name", "email", "city", "state", "country", "occupation", "phoneNumber"];

const getResolvedUser = async (req) => {
  const userId = String(req.auth.userId);

  if (isDatabaseConnected(req)) {
    const user = await User.findById(userId).lean();

    if (user) {
      return { user, source: "database" };
    }
  }

  const runtimeUser = findRuntimeUserById(req, userId);
  if (runtimeUser) {
    return { user: runtimeUser, source: "fallback" };
  }

  return null;
};

const parseProfilePayload = (body) => {
  const payload = {};

  for (const field of allowedProfileFields) {
    if (body[field] !== undefined) {
      payload[field] = String(body[field] || "").trim();
    }
  }

  if (payload.email && !payload.email.includes("@")) {
    throw createValidationError([{ field: "email", message: "email must be a valid email address." }]);
  }

  return payload;
};

export const getAccountProfile = async (req, res, next) => {
  try {
    const resolved = await getResolvedUser(req);

    if (!resolved) {
      throw new AppError(404, "NOT_FOUND", "Account profile was not found.");
    }

    sendApiResponse(
      res,
      200,
      {
        user: sanitizeUser(resolved.user),
      },
      { source: resolved.source }
    );
  } catch (error) {
    next(error);
  }
};

export const updateAccountProfile = async (req, res, next) => {
  try {
    const userId = String(req.auth.userId);
    const payload = parseProfilePayload(req.body || {});

    if (!Object.keys(payload).length) {
      throw createValidationError([{ field: "body", message: "At least one profile field is required." }]);
    }

    if (isDatabaseConnected(req)) {
      const updated = await User.findByIdAndUpdate(userId, payload, {
        new: true,
        runValidators: true,
      }).lean();

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Account profile was not found.");
      }

      sendApiResponse(
        res,
        200,
        {
          user: sanitizeUser(updated),
        },
        { source: "database" }
      );
      return;
    }

    const updatedRuntimeUser = updateRuntimeUser(req, userId, payload);

    if (!updatedRuntimeUser) {
      throw new AppError(404, "NOT_FOUND", "Account profile was not found.");
    }

    sendApiResponse(
      res,
      200,
      {
        user: sanitizeUser(updatedRuntimeUser),
      },
      { source: "fallback", fallbackReason: "database_unavailable" }
    );
  } catch (error) {
    next(error);
  }
};

export const updateAccountPassword = async (req, res, next) => {
  try {
    const userId = String(req.auth.userId);
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      throw createValidationError([
        { field: "currentPassword", message: "currentPassword is required." },
        { field: "newPassword", message: "newPassword is required." },
      ]);
    }

    if (newPassword.length < 8) {
      throw createValidationError([{ field: "newPassword", message: "newPassword must be at least 8 characters." }]);
    }

    const resolved = await getResolvedUser(req);

    if (!resolved) {
      throw new AppError(404, "NOT_FOUND", "Account profile was not found.");
    }

    const isValid = await verifyPasswordAgainstUser(resolved.user, currentPassword);

    if (!isValid) {
      throw new AppError(401, "AUTH_UNAUTHORIZED", "Current password is incorrect.");
    }

    const passwordHash = await hashPassword(newPassword);

    if (isDatabaseConnected(req) && resolved.source === "database") {
      await User.findByIdAndUpdate(userId, {
        $set: { passwordHash },
        $unset: { password: 1 },
      });

      sendApiResponse(res, 200, { message: "Password updated successfully." }, { source: "database" });
      return;
    }

    updateRuntimeUser(req, userId, {
      passwordHash,
      password: undefined,
    });

    sendApiResponse(
      res,
      200,
      { message: "Password updated successfully." },
      { source: "fallback", fallbackReason: "database_unavailable" }
    );
  } catch (error) {
    next(error);
  }
};
