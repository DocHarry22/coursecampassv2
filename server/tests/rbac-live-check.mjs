import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:9000";

const CREDENTIALS = {
  user: { email: "mdonlon1@hostgator.com", password: "XRYBnKAfm" },
  admin: { email: "oveneur2@marketwatch.com", password: "WwDjOlH" },
  superadmin: { email: "kranstead0@narod.ru", password: "omMDCh" },
};

const jsonHeaders = {
  "content-type": "application/json",
};

const requestJson = async (path, { method = "GET", token, body } = {}) => {
  const headers = { ...jsonHeaders };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  return {
    status: response.status,
    headers: {
      dataSource: response.headers.get("x-data-source"),
      fallbackReason: response.headers.get("x-fallback-reason"),
    },
    payload,
  };
};

const login = async (role) => {
  const credentials = CREDENTIALS[role];
  const result = await requestJson("/auth/login", { method: "POST", body: credentials });
  assert.equal(result.status, 200, `${role} login failed`);
  assert.ok(result.payload?.accessToken, `${role} login did not return accessToken`);
  return result.payload.accessToken;
};

const expectStatus = (result, expectedStatus, label) => {
  assert.equal(result.status, expectedStatus, `${label}: expected ${expectedStatus}, got ${result.status}`);
};

const run = async () => {
  const report = {
    baseUrl: BASE_URL,
    health: null,
    unauthenticated: {},
    roleChecks: {
      user: {},
      admin: {},
      superadmin: {},
    },
  };

  const health = await requestJson("/general/health");
  expectStatus(health, 200, "health");
  report.health = {
    dbStatus: health.payload?.dbStatus || "unknown",
    source: health.headers.dataSource,
    fallbackReason: health.headers.fallbackReason,
  };

  const metricsUnauth = await requestJson("/general/metrics");
  expectStatus(metricsUnauth, 401, "unauthenticated metrics");
  report.unauthenticated.generalMetrics = metricsUnauth.status;

  const userToken = await login("user");
  const adminToken = await login("admin");
  const superadminToken = await login("superadmin");

  const userCourses = await requestJson("/courses?limit=1", { token: userToken });
  expectStatus(userCourses, 200, "user courses read");

  const userCreateCourse = await requestJson("/courses", {
    method: "POST",
    token: userToken,
    body: { title: "User should not create" },
  });
  expectStatus(userCreateCourse, 403, "user course create blocked");

  const userClientProducts = await requestJson("/client/products?limit=1", { token: userToken });
  expectStatus(userClientProducts, 403, "user client products blocked");

  const userAdminUsers = await requestJson("/admin/users?limit=1", { token: userToken });
  expectStatus(userAdminUsers, 403, "user admin users blocked");

  const userDashboardContract = await requestJson("/general/dashboard-contract", { token: userToken });
  expectStatus(userDashboardContract, 200, "user dashboard contract");

  report.roleChecks.user = {
    coursesRead: userCourses.status,
    createCourseBlocked: userCreateCourse.status,
    clientProductsBlocked: userClientProducts.status,
    adminUsersBlocked: userAdminUsers.status,
    dashboardSections: {
      learner: Boolean(userDashboardContract.payload?.sections?.learner),
      operations: userDashboardContract.payload?.sections?.operations,
      governance: userDashboardContract.payload?.sections?.governance,
    },
  };

  const adminClientProducts = await requestJson("/client/products?limit=1", { token: adminToken });
  expectStatus(adminClientProducts, 200, "admin client products");

  const adminCreateCourse = await requestJson("/courses", {
    method: "POST",
    token: adminToken,
    body: {
      title: "RBAC verification course",
      description: "Temporary row for role enforcement verification.",
      category: "Verification",
      level: "Beginner",
      mode: "online",
      durationWeeks: 4,
      tuitionFee: 199,
      isActive: true,
    },
  });
  expectStatus(adminCreateCourse, 201, "admin course create");

  const createdCourseId = String(adminCreateCourse.payload?._id || "");
  assert.ok(createdCourseId, "admin-created course id missing");

  const adminDeleteCourse = await requestJson(`/courses/${createdCourseId}`, {
    method: "DELETE",
    token: adminToken,
  });
  expectStatus(adminDeleteCourse, 403, "admin course delete blocked");

  const adminUsersList = await requestJson("/admin/users?limit=1", { token: adminToken });
  expectStatus(adminUsersList, 403, "admin admin-users blocked");

  const adminDashboardContract = await requestJson("/general/dashboard-contract", { token: adminToken });
  expectStatus(adminDashboardContract, 200, "admin dashboard contract");

  report.roleChecks.admin = {
    clientProductsRead: adminClientProducts.status,
    createCourse: adminCreateCourse.status,
    deleteCourseBlocked: adminDeleteCourse.status,
    adminUsersBlocked: adminUsersList.status,
    dashboardSections: {
      learner: Boolean(adminDashboardContract.payload?.sections?.learner),
      operations: Boolean(adminDashboardContract.payload?.sections?.operations),
      governance: adminDashboardContract.payload?.sections?.governance,
    },
  };

  const superadminUsers = await requestJson("/admin/users?limit=5", { token: superadminToken });
  expectStatus(superadminUsers, 200, "superadmin admin users");

  const superadminMetrics = await requestJson("/general/metrics", { token: superadminToken });
  expectStatus(superadminMetrics, 200, "superadmin general metrics");

  const superadminDeleteCourse = await requestJson(`/courses/${createdCourseId}`, {
    method: "DELETE",
    token: superadminToken,
  });
  expectStatus(superadminDeleteCourse, 200, "superadmin course delete");

  const superadminDashboardContract = await requestJson("/general/dashboard-contract", { token: superadminToken });
  expectStatus(superadminDashboardContract, 200, "superadmin dashboard contract");

  report.roleChecks.superadmin = {
    adminUsersRead: superadminUsers.status,
    generalMetricsRead: superadminMetrics.status,
    courseDelete: superadminDeleteCourse.status,
    dashboardSections: {
      learner: Boolean(superadminDashboardContract.payload?.sections?.learner),
      operations: Boolean(superadminDashboardContract.payload?.sections?.operations),
      governance: Boolean(superadminDashboardContract.payload?.sections?.governance),
    },
  };

  console.log(JSON.stringify(report, null, 2));
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
