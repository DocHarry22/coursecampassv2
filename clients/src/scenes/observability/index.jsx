import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { apiGetManySettled, apiPost } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

const formatTimestamp = (value) => {
  if (!value) {
    return "n/a";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "n/a" : parsed.toLocaleString();
};

const formatNumber = (value, fallback = "0") => {
  const castValue = Number(value);
  return Number.isFinite(castValue) ? castValue.toLocaleString() : fallback;
};

const formatMegabytes = (value) => {
  const castValue = Number(value);
  if (!Number.isFinite(castValue)) {
    return "n/a";
  }

  return `${(castValue / (1024 * 1024)).toFixed(1)} MB`;
};

const formatUptime = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) {
    return "n/a";
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const toApiErrorMessage = (requestError, fallbackMessage) => {
  const message =
    requestError?.payload?.error?.message ||
    requestError?.payload?.message ||
    requestError?.message ||
    fallbackMessage;

  const details = requestError?.payload?.error?.details;
  if (Array.isArray(details) && details.length) {
    const detailText = details
      .map((detail) => detail?.message)
      .filter(Boolean)
      .join(" ");

    if (detailText) {
      return `${message} ${detailText}`;
    }
  }

  return message;
};

const formatFailureDetails = (keys, errors) =>
  keys
    .map((key) => {
      const message = errors?.[key]?.message;
      return message ? `${key}: ${message}` : key;
    })
    .join(" | ");

const ObservabilityPage = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [warning, setWarning] = React.useState("");
  const [metricsPayload, setMetricsPayload] = React.useState(null);
  const [auditEvents, setAuditEvents] = React.useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState("");
  const [routeQuery, setRouteQuery] = React.useState("");
  const [busyAction, setBusyAction] = React.useState("");
  const [actionStatus, setActionStatus] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const metricsSnapshotRef = React.useRef(metricsPayload);
  const auditEventsSnapshotRef = React.useRef(auditEvents);
  const hasLoadedSnapshotRef = React.useRef(false);

  React.useEffect(() => {
    metricsSnapshotRef.current = metricsPayload;
  }, [metricsPayload]);

  React.useEffect(() => {
    auditEventsSnapshotRef.current = auditEvents;
  }, [auditEvents]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    setWarning("");

    try {
      const { data, errors, summary } = await apiGetManySettled(
        [
          { key: "metrics", path: "/admin/observability/metrics", required: true },
          { key: "auditEvents", path: "/admin/audit/events?limit=30" },
        ],
        {
          fallbackData: {
            metrics: metricsSnapshotRef.current,
            auditEvents: auditEventsSnapshotRef.current,
          },
        }
      );

      if (summary.hasRequiredFailures) {
        const requiredFailureDetails = formatFailureDetails(summary.requiredFailureKeys, errors);

        if (!hasLoadedSnapshotRef.current) {
          throw new Error(`Unable to load observability metrics (${requiredFailureDetails}).`);
        }

        setWarning(
          `Observability refresh is partially unavailable. Showing the last successful snapshot (${requiredFailureDetails}).`
        );
      }

      setMetricsPayload(data.metrics || null);
      setAuditEvents(Array.isArray(data.auditEvents) ? data.auditEvents : []);
      setLastUpdatedAt(new Date().toISOString());
      hasLoadedSnapshotRef.current = true;

      if (summary.hasOptionalFailures) {
        const optionalFailureDetails = formatFailureDetails(summary.optionalFailureKeys, errors);
        setWarning((previousValue) =>
          previousValue
            ? `${previousValue} Some optional data is temporarily unavailable (${optionalFailureDetails}).`
            : `Some observability data is temporarily unavailable (${optionalFailureDetails}).`
        );
      }
    } catch (requestError) {
      setError(toApiErrorMessage(requestError, "Unable to load observability metrics."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const observability = metricsPayload?.observability || {};
  const memory = observability.memory || {};

  const statusCodeRows = React.useMemo(
    () =>
      Object.entries(observability.statusCodes || {})
        .map(([code, count]) => ({ code, count: Number(count) || 0 }))
        .sort((left, right) => right.count - left.count),
    [observability.statusCodes]
  );

  const routeRows = React.useMemo(() => {
    const entries = Object.entries(observability.topRoutes || {}).map(([routeKey, stats]) => ({
      routeKey,
      hits: Number(stats?.hits) || 0,
      errors: Number(stats?.errors) || 0,
      avgLatencyMs: Number(stats?.avgLatencyMs) || 0,
      maxLatencyMs: Number(stats?.maxLatencyMs) || 0,
    }));

    const normalizedQuery = String(routeQuery || "").trim().toLowerCase();
    const filteredEntries = normalizedQuery
      ? entries.filter((entry) => entry.routeKey.toLowerCase().includes(normalizedQuery))
      : entries;

    return filteredEntries.sort((left, right) => {
      if (right.hits !== left.hits) {
        return right.hits - left.hits;
      }

      return right.avgLatencyMs - left.avgLatencyMs;
    });
  }, [observability.topRoutes, routeQuery]);

  const runAction = async ({ actionKey, confirmationMessage, action, successMessage }) => {
    if (typeof window !== "undefined" && confirmationMessage) {
      const confirmed = window.confirm(confirmationMessage);
      if (!confirmed) {
        return;
      }
    }

    setBusyAction(actionKey);
    setActionStatus("");
    setActionError("");

    try {
      await action();
      setActionStatus(successMessage || "Action completed.");
      await loadData();
    } catch (requestError) {
      setActionError(toApiErrorMessage(requestError, "Action failed."));
    } finally {
      setBusyAction("");
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Superadmin Observability
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Runtime telemetry, route health, and security controls. Updated: {formatTimestamp(lastUpdatedAt)}
        </Typography>
      </Box>

      <RouteStatusBanners success={actionStatus} error={[actionError, error].filter(Boolean)} warning={warning} />

      {loading ? <PageLoadingState rows={3} /> : null}

      {!loading ? (
        <>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Requests total
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {formatNumber(observability.requestsTotal)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Errors total
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {formatNumber(observability.errorsTotal)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Slow requests
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {formatNumber(observability.slowRequestsTotal)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Uptime
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {formatUptime(observability.uptimeSeconds)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
                <TextField
                  fullWidth
                  label="Filter routes"
                  value={routeQuery}
                  onChange={(event) => setRouteQuery(event.target.value)}
                />
                <Button variant="outlined" onClick={loadData}>
                  Refresh metrics
                </Button>
                <Button
                  color="warning"
                  variant="outlined"
                  disabled={busyAction === "revoke-all"}
                  onClick={() =>
                    runAction({
                      actionKey: "revoke-all",
                      confirmationMessage: "Revoke all active sessions across all users? This action is disruptive.",
                      action: () => apiPost("/admin/sessions/revoke-all", {}),
                      successMessage: "All user sessions were revoked.",
                    })
                  }
                  aria-label="Revoke all active sessions"
                >
                  Revoke all sessions
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={1.5}>
            <Grid item xs={12} lg={8}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1}>
                    Top Routes ({routeRows.length})
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  {routeRows.length ? (
                    <List disablePadding>
                      {routeRows.map((entry) => (
                        <ListItem key={entry.routeKey} disableGutters divider>
                          <ListItemText
                            primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}
                            secondaryTypographyProps={{ fontSize: 12, color: "text.secondary" }}
                            primary={entry.routeKey}
                            secondary={`hits: ${entry.hits.toLocaleString()} | errors: ${entry.errors.toLocaleString()} | avg: ${entry.avgLatencyMs.toFixed(2)} ms | max: ${entry.maxLatencyMs.toFixed(2)} ms`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <RouteEmptyState message="No routes match the current filter." />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Stack spacing={1.5}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1}>
                      Status Codes
                    </Typography>
                    {statusCodeRows.length ? (
                      <List disablePadding>
                        {statusCodeRows.map((entry) => (
                          <ListItem key={entry.code} disableGutters divider>
                            <ListItemText
                              primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}
                              secondaryTypographyProps={{ fontSize: 12, color: "text.secondary" }}
                              primary={`HTTP ${entry.code}`}
                              secondary={`${entry.count.toLocaleString()} responses`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <RouteEmptyState message="No status code data available." />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1}>
                      Runtime State
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Service: {metricsPayload?.service || "n/a"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Database: {metricsPayload?.dbStatus || "unknown"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last request: {formatTimestamp(observability.lastRequestAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Started at: {formatTimestamp(observability.startedAt)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shutting down: {observability.isShuttingDown ? "Yes" : "No"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.75}>
                      Memory RSS: {formatMegabytes(memory.rss)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Memory Heap Used: {formatMegabytes(memory.heapUsed)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Process unhandled rejections: {formatNumber(observability.process?.unhandledRejections, "0")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Process uncaught exceptions: {formatNumber(observability.process?.uncaughtExceptions, "0")}
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1}>
                Recent Audit Events
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {auditEvents.length ? (
                <List disablePadding>
                  {auditEvents.slice(0, 15).map((event) => (
                    <ListItem key={event.id || `${event.action}-${event.occurredAt}`} disableGutters divider>
                      <ListItemText
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}
                        secondaryTypographyProps={{ fontSize: 12, color: "text.secondary" }}
                        primary={event.action || "action"}
                        secondary={`${event.actorUserId || "actor:n/a"} | ${event.targetUserId || "target:n/a"} | ${formatTimestamp(event.occurredAt)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <RouteEmptyState message="No audit events available." />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </Stack>
  );
};

export default ObservabilityPage;
