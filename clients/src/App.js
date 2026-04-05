import { CssBaseline, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { Suspense, lazy, useMemo } from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { themeSettings } from "theme";
import AppErrorBoundary from "components/AppErrorBoundary";
import {
  RequireCapability,
  RedirectIfAuthenticated,
  RedirectToRoleDashboard,
  RequireRoles,
  RequireSession,
} from "components/RouteGuards";
import RouteLoadingState from "components/RouteLoadingState";

const Layout = lazy(() => import("scenes/layout"));
const Dashboard = lazy(() => import("scenes/dashboard"));
const DestinationScene = lazy(() => import("scenes/destination"));
const Login = lazy(() => import("scenes/login"));
const SearchPage = lazy(() => import("scenes/search"));
const CourseDiscoveryPage = lazy(() => import("scenes/courses"));
const SchoolComparisonPage = lazy(() => import("scenes/schools"));
const AidTrackingPage = lazy(() => import("scenes/financialAid"));
const TodoManagementPage = lazy(() => import("scenes/todo"));
const CalendarPage = lazy(() => import("scenes/calendar"));
const AccountSettingsPage = lazy(() => import("scenes/account"));


function App() {
  const mode = useSelector((state) => state.global.mode);
  const theme = useMemo(() => createTheme(themeSettings(mode)), [mode]);

  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<RouteLoadingState />}>
              <Routes>
                <Route element={<RedirectIfAuthenticated />}>
                  <Route path="/login" element={<Login />} />
                </Route>

                <Route element={<RequireSession />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<RedirectToRoleDashboard />} />

                    <Route element={<RequireRoles allowedRoles={["user"]} />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                    </Route>

                    <Route element={<RequireRoles allowedRoles={["admin"]} />}>
                      <Route path="/admin/dashboard" element={<Dashboard />} />
                    </Route>

                    <Route element={<RequireRoles allowedRoles={["superadmin"]} />}>
                      <Route path="/superadmin/dashboard" element={<Dashboard />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessTools" />}>
                      <Route
                        path="/tools"
                        element={<DestinationScene title="Tools" subtitle="Operational tools and module configuration status." requests={[{ key: "summary", path: "/general/summary" }]} />}
                      />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessSearch" />}>
                      <Route path="/search" element={<SearchPage />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessCourseDiscovery" />}>
                      <Route path="/courses" element={<CourseDiscoveryPage />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessSchoolComparison" />}>
                      <Route path="/schools" element={<SchoolComparisonPage />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessFinancialAid" />}>
                      <Route path="/financial-aid" element={<AidTrackingPage />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessTodo" />}>
                      <Route path="/todo" element={<TodoManagementPage />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessCalendar" />}>
                      <Route path="/calendar" element={<CalendarPage />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessAccount" />}>
                      <Route path="/account" element={<AccountSettingsPage />} />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessAdminOperations" />}>
                      <Route
                        path="/admin/operations"
                        element={<DestinationScene title="Admin Operations" subtitle="Operational analytics and activity telemetry for admin workflows." requests={[{ key: "managementDashboard", path: "/management/dashboard" }, { key: "salesOverview", path: "/sales/overview" }, { key: "transactions", path: "/management/transactions?limit=12" }]} />}
                      />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessGovernance" />}>
                      <Route
                        path="/superadmin/governance"
                        element={<DestinationScene title="Superadmin Governance" subtitle="User role, account status, and governance event overview." requests={[{ key: "users", path: "/admin/users?limit=20" }, { key: "auditEvents", path: "/admin/audit/events?limit=20" }]} />}
                      />
                    </Route>

                    <Route element={<RequireCapability capability="canAccessObservability" />}>
                      <Route
                        path="/superadmin/observability"
                        element={<DestinationScene title="Superadmin Observability" subtitle="Privileged runtime metrics and recent audit state." requests={[{ key: "observability", path: "/admin/observability/metrics" }, { key: "auditEvents", path: "/admin/audit/events?limit=10" }]} />}
                      />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppErrorBoundary>
      </ThemeProvider>
    </div>
  );
}

export default App;
