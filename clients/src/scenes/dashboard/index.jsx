import React from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { apiGetMany } from "../../config/apiClient";
import { useSession } from "../../auth/SessionContext";
import PageLoadingState from "../../components/PageLoadingState";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import SuperadminDashboard from "./SuperadminDashboard";

const sectionToRows = (section) => {
  const kpis = Array.isArray(section?.kpis) ? section.kpis : [];
  return kpis.filter((kpi) => kpi?.key && kpi?.label);
};

const buildDashboardViewModel = ({ role, response }) => {
  const contract = response.contract || {};

  return {
    role,
    contractVersion: String(contract?.contractVersion || "unknown"),
    generatedAt: contract?.generatedAt || null,
    health: response.health || null,
    learnerRows: sectionToRows(contract?.sections?.learner),
    operationsRows: sectionToRows(contract?.sections?.operations),
    governanceRows: sectionToRows(contract?.sections?.governance),
    moduleData: {
      todos: Array.isArray(response.todos) ? response.todos : [],
      calendar: Array.isArray(response.calendar) ? response.calendar : [],
      aid: Array.isArray(response.aid) ? response.aid : [],
    },
    superadminData: {
      observability: response.observability || null,
      auditEvents: Array.isArray(response.auditEvents) ? response.auditEvents : [],
    },
  };
};

const Dashboard = () => {
  const { role } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [viewModel, setViewModel] = React.useState(null);

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const requests = [
        { key: "health", path: "/general/health" },
        { key: "contract", path: "/general/dashboard-contract" },
      ];

      if (role === "user") {
        requests.push(
          { key: "todos", path: "/todos?limit=25" },
          { key: "calendar", path: "/calendar?limit=25" },
          { key: "aid", path: "/financial-aid?limit=25" }
        );
      }

      if (role === "superadmin") {
        requests.push(
          { key: "observability", path: "/admin/observability/metrics" },
          { key: "auditEvents", path: "/admin/audit/events" }
        );
      }

      const response = await apiGetMany(requests);
      setViewModel(buildDashboardViewModel({ role, response }));
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="#64748b" mb={0.5}>
          Dashboard
        </Typography>
        {!loading && viewModel ? (
          <Typography variant="caption" color="#94a3b8">
            Role: {viewModel.role} | Contract: {viewModel.contractVersion}
          </Typography>
        ) : null}
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? <PageLoadingState rows={4} /> : null}

      {!loading && viewModel ? (
        role === "superadmin" ? (
          <SuperadminDashboard viewModel={viewModel} onRefresh={loadDashboard} />
        ) : role === "admin" ? (
          <AdminDashboard viewModel={viewModel} onRefresh={loadDashboard} />
        ) : (
          <UserDashboard viewModel={viewModel} onRefresh={loadDashboard} />
        )
      ) : null}
    </Stack>
  );
};

export default Dashboard;
