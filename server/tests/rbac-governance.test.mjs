import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireRoles } from "../middleware/auth.js";
import {
  assertUserIsActive,
  normalizeAccountStatus,
  normalizeRole,
  parseAccountStatus,
  parseRole,
} from "../utils/userGovernance.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const read = async (relativePath) => {
  const fullPath = path.join(root, relativePath);
  return readFile(fullPath, "utf8");
};

test("requireRoles denies unauthenticated requests", async () => {
  const middleware = requireRoles("admin", "superadmin");
  const req = {};

  await new Promise((resolve) => {
    middleware(req, {}, (error) => {
      assert.ok(error);
      assert.equal(error.code, "AUTH_UNAUTHORIZED");
      assert.equal(error.statusCode, 401);
      resolve();
    });
  });
});

test("requireRoles denies authenticated requests with insufficient role", async () => {
  const middleware = requireRoles("superadmin");
  const req = {
    auth: {
      role: "admin",
    },
  };

  await new Promise((resolve) => {
    middleware(req, {}, (error) => {
      assert.ok(error);
      assert.equal(error.code, "AUTH_FORBIDDEN");
      assert.equal(error.statusCode, 403);
      resolve();
    });
  });
});

test("requireRoles allows authenticated requests with matching role", async () => {
  const middleware = requireRoles("superadmin");
  const req = {
    auth: {
      role: "superadmin",
    },
  };

  await new Promise((resolve) => {
    middleware(req, {}, (error) => {
      assert.equal(error, undefined);
      resolve();
    });
  });
});

test("governance helpers normalize and validate role/account status", async () => {
  assert.equal(normalizeRole("ADMIN"), "admin");
  assert.equal(normalizeRole("not-a-role"), "user");
  assert.equal(normalizeAccountStatus("SUSPENDED"), "suspended");
  assert.equal(normalizeAccountStatus("n/a"), "active");

  assert.equal(parseRole("superadmin"), "superadmin");
  assert.equal(parseAccountStatus("disabled"), "disabled");

  assert.throws(
    () => parseRole("owner"),
    (error) =>
      error.code === "VALIDATION_ERROR" &&
      Array.isArray(error.details) &&
      error.details.some((entry) => String(entry?.message || "").includes("role must be one of"))
  );

  assert.throws(
    () => parseAccountStatus("locked"),
    (error) =>
      error.code === "VALIDATION_ERROR" &&
      Array.isArray(error.details) &&
      error.details.some((entry) => String(entry?.message || "").includes("accountStatus must be one of"))
  );
});

test("assertUserIsActive blocks suspended and disabled accounts", async () => {
  assert.doesNotThrow(() => assertUserIsActive({ accountStatus: "active" }));
  assert.throws(
    () => assertUserIsActive({ accountStatus: "suspended" }),
    (error) => error.code === "AUTH_ACCOUNT_INACTIVE" && error.statusCode === 403
  );
  assert.throws(
    () => assertUserIsActive({ accountStatus: "disabled" }),
    (error) => error.code === "AUTH_ACCOUNT_INACTIVE" && error.statusCode === 403
  );
});

test("route policy wiring enforces superadmin governance and catalog overrides", async () => {
  const adminRoutes = await read("routes/admin.js");
  const coursesRoutes = await read("routes/courses.js");
  const schoolsRoutes = await read("routes/schools.js");
  const generalRoutes = await read("routes/general.js");

  assert.match(adminRoutes, /router\.use\(authenticateAccessToken, requireSuperadmin\)/);
  assert.match(adminRoutes, /router\.patch\("\/users\/:id\/role", updateUserRole\)/);
  assert.match(adminRoutes, /router\.patch\("\/users\/:id\/status", updateUserAccountStatus\)/);
  assert.match(adminRoutes, /router\.post\("\/sessions\/revoke-all", revokeAllSessionsByAdmin\)/);

  assert.match(coursesRoutes, /router\.use\(authenticateAccessToken\)/);
  assert.match(coursesRoutes, /router\.post\("\/", requireAdmin, createCourse\)/);
  assert.match(coursesRoutes, /router\.delete\("\/:id", requireSuperadmin, deleteCourse\)/);

  assert.match(schoolsRoutes, /router\.use\(authenticateAccessToken\)/);
  assert.match(schoolsRoutes, /router\.post\("\/", requireAdmin, createSchool\)/);
  assert.match(schoolsRoutes, /router\.delete\("\/:id", requireSuperadmin, deleteSchool\)/);

  assert.match(generalRoutes, /router\.get\("\/metrics", authenticateAccessToken, requireSuperadmin, getMetrics\)/);
  assert.match(generalRoutes, /router\.get\("\/health", getHealth\)/);
  assert.match(generalRoutes, /router\.get\("\/ready", getReadiness\)/);
});
