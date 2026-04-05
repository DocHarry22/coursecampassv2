import mongoose from "mongoose";
import { dataUser } from "../data/index.js";

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

const buildFallbackUsers = () =>
  cloneDeep(dataUser).map((user) => ({
    ...user,
    _id: String(user._id),
    accountStatus: "active",
    accountStatusReason: "",
    refreshTokenHash: null,
  }));

export const ensureRuntimeStore = (app) => {
  if (!app.locals.runtimeStore) {
    app.locals.runtimeStore = {
      users: buildFallbackUsers(),
      refreshTokens: new Map(),
      courses: [],
      schools: [],
      financialAids: [],
      todos: [],
      calendarEvents: [],
    };
  }

  return app.locals.runtimeStore;
};

export const getRuntimeCollection = (req, key) => {
  const store = ensureRuntimeStore(req.app);
  if (!Object.prototype.hasOwnProperty.call(store, key)) {
    throw new Error(`Unknown runtime collection '${key}'.`);
  }

  return store[key];
};

export const createRuntimeId = () => new mongoose.Types.ObjectId().toString();

export const findRuntimeUserByEmail = (req, email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const users = getRuntimeCollection(req, "users");

  return users.find((user) => String(user.email || "").trim().toLowerCase() === normalizedEmail) || null;
};

export const findRuntimeUserById = (req, userId) => {
  const users = getRuntimeCollection(req, "users");
  const normalizedId = String(userId);

  return users.find((user) => String(user._id) === normalizedId) || null;
};

export const updateRuntimeUser = (req, userId, updates) => {
  const users = getRuntimeCollection(req, "users");
  const normalizedId = String(userId);
  const index = users.findIndex((user) => String(user._id) === normalizedId);

  if (index < 0) {
    return null;
  }

  const nextUser = {
    ...users[index],
    ...updates,
  };

  users[index] = nextUser;
  return nextUser;
};

export const setRuntimeRefreshTokenHash = (req, userId, tokenHash) => {
  const store = ensureRuntimeStore(req.app);
  store.refreshTokens.set(String(userId), tokenHash);
};

export const getRuntimeRefreshTokenHash = (req, userId) => {
  const store = ensureRuntimeStore(req.app);
  return store.refreshTokens.get(String(userId)) || null;
};

export const clearRuntimeRefreshTokenHash = (req, userId) => {
  const store = ensureRuntimeStore(req.app);
  store.refreshTokens.delete(String(userId));
};

export const clearRuntimeRefreshTokensByUser = (req, userId) => {
  const store = ensureRuntimeStore(req.app);
  store.refreshTokens.delete(String(userId));
};

export const clearAllRuntimeRefreshTokens = (req) => {
  const store = ensureRuntimeStore(req.app);
  store.refreshTokens.clear();
};
