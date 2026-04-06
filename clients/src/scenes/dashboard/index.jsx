import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { apiGetManySettled } from "../../config/apiClient";
import { useSession } from "../../auth/SessionContext";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";
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

const formatBatchFailureDetails = (keys, errors) =>
  keys
    .map((key) => {
      const message = errors?.[key]?.message;
      return message ? `${key}: ${message}` : key;
    })
    .join(" | ");

const Dashboard = () => {
  const { role } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [viewModel, setViewModel] = React.useState(null);
  const [partialWarning, setPartialWarning] = React.useState("");
  const viewModelRef = React.useRef(null);

  React.useEffect(() => {
    viewModelRef.current = viewModel;
  }, [viewModel]);

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) {
      return "n/a";
    }

    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? "n/a" : parsed.toLocaleString();
  };

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setPartialWarning("");

    try {
      const requests = [
        { key: "health", path: "/general/health", required: true },
        { key: "contract", path: "/general/dashboard-contract", required: true },
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

      const { data, errors, summary } = await apiGetManySettled(requests);

      if (summary.hasRequiredFailures) {
        const requiredFailureDetails = formatBatchFailureDetails(summary.requiredFailureKeys, errors);
        const hasCurrentRoleSnapshot = Boolean(
          viewModelRef.current && viewModelRef.current.role === role
        );

        if (hasCurrentRoleSnapshot) {
          setPartialWarning(
            `Dashboard refresh is partially unavailable. Showing the last successful snapshot (${requiredFailureDetails}).`
          );
          return;
        }

        throw new Error(
          `Unable to load the dashboard contract and health summary (${requiredFailureDetails}).`
        );
      }

      setViewModel(buildDashboardViewModel({ role, response: data }));

      if (summary.hasOptionalFailures) {
        const optionalFailureDetails = formatBatchFailureDetails(summary.optionalFailureKeys, errors);
        setPartialWarning(
          `Some module data is temporarily unavailable (${optionalFailureDetails}).`
        );
      }
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
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Dashboard
        </Typography>
        {!loading && viewModel ? (
          <Typography variant="caption" color="text.secondary">
            Role: {viewModel.role} | Contract: {viewModel.contractVersion} | Updated: {formatLastUpdated(viewModel.generatedAt)}
          </Typography>
        ) : null}
      </Box>

        <RouteStatusBanners error={error} warning={partialWarning} />

      {loading ? <PageLoadingState rows={4} /> : null}

        {!loading && !viewModel && !error ? (
          <RouteEmptyState message="No dashboard data was returned for this role." />
        ) : null}

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
