import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const read = async (relativePath) => {
  const fullPath = path.join(root, relativePath);
  return readFile(fullPath, "utf8");
};

test("route-level code splitting is enabled in app routing", async () => {
  const appSource = await read("src/App.js");

  assert.match(appSource, /lazy\(\(\) => import\("scenes\/dashboard"\)\)/);
  assert.match(appSource, /lazy\(\(\) => import\("scenes\/search"\)\)/);
  assert.match(appSource, /<Suspense\s+fallback=\{<RouteLoadingState\s*\/>\}>/);
});

test("loading skeleton fallback is wired for route and scene loading", async () => {
  const appSource = await read("src/App.js");
  const dashboardSource = await read("src/scenes/dashboard/index.jsx");
  const coursesSource = await read("src/scenes/courses/index.jsx");

  assert.match(appSource, /RouteLoadingState/);
  assert.match(dashboardSource, /PageLoadingState/);
  assert.match(coursesSource, /PageLoadingState/);
});

test("role-aware dashboard entry points are present", async () => {
  const appSource = await read("src/App.js");
  const guardsSource = await read("src/components/RouteGuards.jsx");
  const sessionSource = await read("src/auth/SessionContext.jsx");

  assert.match(appSource, /path="\/dashboard"/);
  assert.match(appSource, /path="\/admin\/dashboard"/);
  assert.match(appSource, /path="\/superadmin\/dashboard"/);
  assert.match(appSource, /RequireRoles\s+allowedRoles=\{\["user"\]\}/);
  assert.match(appSource, /RequireRoles\s+allowedRoles=\{\["admin"\]\}/);
  assert.match(appSource, /RequireRoles\s+allowedRoles=\{\["superadmin"\]\}/);
  assert.match(appSource, /path="\/admin\/operations"/);
  assert.match(appSource, /path="\/superadmin\/governance"/);
  assert.match(appSource, /path="\/superadmin\/observability"/);
  assert.match(appSource, /RequireCapability\s+capability="canAccessSearch"/);
  assert.match(appSource, /RequireCapability\s+capability="canAccessGovernance"/);
  assert.match(guardsSource, /RedirectToRoleDashboard/);
  assert.match(guardsSource, /RequireCapability/);
  assert.match(guardsSource, /Navigate to=\{roleHomePath\} replace/);
  assert.match(sessionSource, /getRoleHomePath/);
  assert.match(sessionSource, /canAccessGovernance/);
  assert.match(sessionSource, /showAdminSection/);
  assert.match(sessionSource, /canAccessSearch: isAdminLike/);
  assert.match(sessionSource, /canAccessObservability: isSuperadmin/);
});

test("navigation defines learner admin and superadmin sections", async () => {
  const layoutSource = await read("src/scenes/layout/index.jsx");

  assert.match(layoutSource, /title:\s*"Learner"/);
  assert.match(layoutSource, /title:\s*"Admin"/);
  assert.match(layoutSource, /title:\s*"Superadmin"/);
  assert.match(layoutSource, /sectionCapability:\s*"showAdminSection"/);
  assert.match(layoutSource, /sectionCapability:\s*"showSuperadminSection"/);
  assert.match(layoutSource, /label:\s*"Admin Dashboard"/);
  assert.match(layoutSource, /label:\s*"Super Dashboard"/);
  assert.match(layoutSource, /canAccessAdminOperations/);
  assert.match(layoutSource, /canAccessGovernance/);
});

test("dashboard split renders role-specific dashboard variants", async () => {
  const dashboardSource = await read("src/scenes/dashboard/index.jsx");

  assert.match(dashboardSource, /role === "superadmin" \? \(/);
  assert.match(dashboardSource, /<SuperadminDashboard viewModel=\{viewModel\} onRefresh=\{loadDashboard\} \/>/);
  assert.match(dashboardSource, /role === "admin" \? \(/);
  assert.match(dashboardSource, /<AdminDashboard viewModel=\{viewModel\} onRefresh=\{loadDashboard\} \/>/);
  assert.match(dashboardSource, /<UserDashboard viewModel=\{viewModel\} onRefresh=\{loadDashboard\} \/>/);
});

test("capability-gated routes exist for restricted deep links", async () => {
  const appSource = await read("src/App.js");

  assert.match(appSource, /RequireCapability\s+capability="canAccessSearch"/);
  assert.match(appSource, /RequireCapability\s+capability="canAccessCourseDiscovery"/);
  assert.match(appSource, /RequireCapability\s+capability="canAccessSchoolComparison"/);
  assert.match(appSource, /RequireCapability\s+capability="canAccessAdminOperations"/);
  assert.match(appSource, /RequireCapability\s+capability="canAccessGovernance"/);
  assert.match(appSource, /RequireCapability\s+capability="canAccessObservability"/);
});

test("dashboard uses role-safe contract endpoint instead of admin-only analytics endpoints", async () => {
  const dashboardSource = await read("src/scenes/dashboard/index.jsx");

  assert.match(dashboardSource, /path:\s*"\/general\/dashboard-contract"/);
  assert.doesNotMatch(dashboardSource, /"\/management\/dashboard"/);
  assert.doesNotMatch(dashboardSource, /"\/management\/transactions"/);
  assert.doesNotMatch(dashboardSource, /"\/client\/products"/);
  assert.doesNotMatch(dashboardSource, /"\/client\/customers"/);
  assert.doesNotMatch(dashboardSource, /"\/sales\/overview"/);
});

test("user-facing scenes avoid admin-only data endpoints", async () => {
  const searchSource = await read("src/scenes/search/index.jsx");
  const coursesSource = await read("src/scenes/courses/index.jsx");
  const schoolsSource = await read("src/scenes/schools/index.jsx");
  const aidSource = await read("src/scenes/financialAid/index.jsx");

  assert.doesNotMatch(searchSource, /"\/client\/products"/);
  assert.doesNotMatch(searchSource, /"\/client\/customers"/);
  assert.doesNotMatch(coursesSource, /"\/client\/products"/);
  assert.doesNotMatch(schoolsSource, /"\/client\/customers"/);
  assert.doesNotMatch(aidSource, /"\/sales\/overview"/);
});

test("accessibility labels exist for icon-only controls", async () => {
  const navbarSource = await read("src/components/Navbar.jsx");
  const layoutSource = await read("src/scenes/layout/index.jsx");

  assert.match(navbarSource, /aria-label="Notifications"/);
  assert.match(navbarSource, /aria-label="Messages"/);
  assert.match(navbarSource, /aria-label="Toggle color mode"/);
  assert.match(navbarSource, /aria-label="Sign out"/);
  assert.match(layoutSource, /Skip to main content/);
  assert.match(layoutSource, /id="main-content"/);
});

test("high-risk action buttons expose descriptive aria labels", async () => {
  const todoSource = await read("src/scenes/todo/index.jsx");
  const calendarSource = await read("src/scenes/calendar/index.jsx");
  const aidSource = await read("src/scenes/financialAid/index.jsx");

  assert.match(todoSource, /aria-label=\{`Delete task \$\{task\.title\}`\}/);
  assert.match(calendarSource, /aria-label=\{`Edit event \$\{entry\.title\}`\}/);
  assert.match(calendarSource, /aria-label=\{`Delete event \$\{entry\.title\}`\}/);
  assert.match(aidSource, /aria-label=\{`Delete aid application \$\{entry\.provider\}`\}/);
});
