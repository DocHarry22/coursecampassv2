import test from "node:test";
import assert from "node:assert/strict";
import { getDashboardContract } from "../controllers/general.js";

const createResponseStub = () => {
  const headers = {};

  return {
    headers,
    statusCode: null,
    payload: null,
    setHeader(name, value) {
      headers[name] = value;
    },
    removeHeader(name) {
      delete headers[name];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
};

const createRequestStub = (role) => ({
  auth: {
    userId: "user-1",
    role,
  },
  app: {
    locals: {
      dbStatus: "disabled",
      runtimeStore: {
        users: [
          { _id: "user-1", role: "user", accountStatus: "active" },
          { _id: "admin-1", role: "admin", accountStatus: "active" },
          { _id: "super-1", role: "superadmin", accountStatus: "active" },
          { _id: "suspended-1", role: "user", accountStatus: "suspended" },
        ],
        refreshTokens: new Map(),
        courses: [{ _id: "course-1" }, { _id: "course-2" }],
        schools: [{ _id: "school-1" }],
        financialAids: [
          { _id: "aid-1", userId: "user-1", status: "open" },
          { _id: "aid-2", userId: "user-1", status: "submitted" },
        ],
        todos: [
          { _id: "todo-1", userId: "user-1", completed: true },
          { _id: "todo-2", userId: "user-1", completed: false },
        ],
        calendarEvents: [
          { _id: "event-1", userId: "user-1", startAt: new Date(Date.now() + 60_000).toISOString() },
          { _id: "event-2", userId: "admin-1", startAt: new Date(Date.now() + 60_000).toISOString() },
        ],
      },
    },
  },
});

test("user role contract exposes learner section only", async () => {
  const req = createRequestStub("user");
  const res = createResponseStub();

  await getDashboardContract(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["X-Data-Source"], "fallback");
  assert.equal(res.headers["X-Fallback-Reason"], "database_unavailable");
  assert.equal(res.payload.contractVersion, "2026-04-06.dashboard.v1");
  assert.equal(res.payload.role, "user");
  assert.ok(res.payload.sections.learner);
  assert.equal(res.payload.sections.operations, null);
  assert.equal(res.payload.sections.governance, null);
});

test("admin role contract exposes learner and operations sections", async () => {
  const req = createRequestStub("admin");
  const res = createResponseStub();

  await getDashboardContract(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.role, "admin");
  assert.ok(res.payload.sections.learner);
  assert.ok(res.payload.sections.operations);
  assert.equal(res.payload.sections.governance, null);

  const operationsKeys = res.payload.sections.operations.kpis.map((kpi) => kpi.key);
  assert.ok(operationsKeys.includes("totalUsers"));
  assert.ok(operationsKeys.includes("catalogCourses"));
});

test("superadmin role contract exposes learner, operations, and governance sections", async () => {
  const req = createRequestStub("superadmin");
  const res = createResponseStub();

  await getDashboardContract(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.role, "superadmin");
  assert.ok(res.payload.sections.learner);
  assert.ok(res.payload.sections.operations);
  assert.ok(res.payload.sections.governance);

  const governanceKeys = res.payload.sections.governance.kpis.map((kpi) => kpi.key);
  assert.ok(governanceKeys.includes("superadminCount"));
  assert.ok(governanceKeys.includes("suspendedUsers"));
  assert.ok(governanceKeys.includes("observabilityRequests"));
});
