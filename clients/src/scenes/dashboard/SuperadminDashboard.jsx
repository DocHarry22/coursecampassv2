import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { apiDelete, apiPatch, apiPost } from "../../config/apiClient";

const toNumber = (value, fallback = 0) => {
  const castValue = Number(value);
  return Number.isFinite(castValue) ? castValue : fallback;
};

const formatKpiValue = (kpi) => {
  if (kpi?.displayAs === "currency") {
    return `$${toNumber(kpi.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  if (kpi?.displayAs === "percent") {
    return `${toNumber(kpi.value)}%`;
  }

  if (kpi?.displayAs === "text") {
    return String(kpi?.value || "n/a");
  }

  return toNumber(kpi?.value).toLocaleString();
};

const SuperadminDashboard = ({ viewModel, onRefresh }) => {
  const [error, setError] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [busyAction, setBusyAction] = React.useState("");

  const [roleForm, setRoleForm] = React.useState({ userId: "", role: "user" });
  const [statusForm, setStatusForm] = React.useState({ userId: "", accountStatus: "active", reason: "" });
  const [revokeUserId, setRevokeUserId] = React.useState("");
  const [overrideForm, setOverrideForm] = React.useState({ courseId: "", schoolId: "" });

  const observability = viewModel.superadminData.observability?.observability || null;
  const auditEvents = viewModel.superadminData.auditEvents || [];

  const runAction = async (actionKey, action, successMessage = "Action completed.") => {
    setBusyAction(actionKey);
    setError("");
    setStatus("");

    try {
      await action();
      setStatus(successMessage);
      await onRefresh();
    } catch (requestError) {
      setError(requestError?.payload?.message || requestError.message || "Action failed.");
    } finally {
      setBusyAction("");
    }
  };

  const confirmAndRun = ({ actionKey, confirmationMessage, action, successMessage }) => {
    if (typeof window !== "undefined" && !window.confirm(confirmationMessage)) {
      return;
    }

    runAction(actionKey, action, successMessage);
  };

  return (
    <Stack spacing={1.5}>
      {status ? <Alert severity="success">{status}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                Governance Controls
              </Typography>

              <Typography variant="caption" color="text.secondary">Update user role</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} mt={0.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="User ID"
                  value={roleForm.userId}
                  onChange={(event) => setRoleForm((previous) => ({ ...previous, userId: event.target.value }))}
                />
                <TextField
                  select
                  size="small"
                  label="Role"
                  value={roleForm.role}
                  onChange={(event) => setRoleForm((previous) => ({ ...previous, role: event.target.value }))}
                  sx={{ minWidth: 170 }}
                >
                  <MenuItem value="user">user</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                  <MenuItem value="superadmin">superadmin</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  disabled={!roleForm.userId || busyAction === "update-role"}
                  onClick={() =>
                    confirmAndRun({
                      actionKey: "update-role",
                      confirmationMessage: `Apply role ${roleForm.role} to user ${roleForm.userId}?`,
                      action: () =>
                      apiPatch(`/admin/users/${roleForm.userId}/role`, {
                        role: roleForm.role,
                      }),
                      successMessage: `Role updated for user ${roleForm.userId}.`,
                    })
                  }
                >
                  Apply
                </Button>
              </Stack>

              <Typography variant="caption" color="text.secondary" display="block" mt={1.25}>Update account status</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} mt={0.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="User ID"
                  value={statusForm.userId}
                  onChange={(event) => setStatusForm((previous) => ({ ...previous, userId: event.target.value }))}
                />
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={statusForm.accountStatus}
                  onChange={(event) => setStatusForm((previous) => ({ ...previous, accountStatus: event.target.value }))}
                  sx={{ minWidth: 170 }}
                >
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                  <MenuItem value="disabled">disabled</MenuItem>
                </TextField>
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} mt={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Reason"
                  value={statusForm.reason}
                  onChange={(event) => setStatusForm((previous) => ({ ...previous, reason: event.target.value }))}
                />
                <Button
                  variant="outlined"
                  disabled={!statusForm.userId || busyAction === "update-status"}
                  onClick={() =>
                    confirmAndRun({
                      actionKey: "update-status",
                      confirmationMessage: `Update account status for user ${statusForm.userId} to ${statusForm.accountStatus}?`,
                      action: () =>
                      apiPatch(`/admin/users/${statusForm.userId}/status`, {
                        accountStatus: statusForm.accountStatus,
                        reason: statusForm.reason,
                      }),
                      successMessage: `Account status updated for user ${statusForm.userId}.`,
                    })
                  }
                >
                  Apply
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                Observability and Security Actions
              </Typography>

              <Stack spacing={0.5} mb={1.2}>
                {viewModel.governanceRows.map((kpi) => (
                  <Typography key={kpi.key} variant="body2" color="text.primary">
                    {kpi.label}: <strong>{formatKpiValue(kpi)}</strong>
                  </Typography>
                ))}
                <Typography variant="body2" color="text.primary">
                  Slow requests: <strong>{toNumber(observability?.slowRequestsTotal).toLocaleString()}</strong>
                </Typography>
                <Typography variant="body2" color="text.primary">
                  Last request at: <strong>{observability?.lastRequestAt || "n/a"}</strong>
                </Typography>
              </Stack>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Button
                  color="warning"
                  variant="outlined"
                  disabled={busyAction === "revoke-all"}
                  onClick={() =>
                    confirmAndRun({
                      actionKey: "revoke-all",
                      confirmationMessage: "Revoke all active sessions across all users? This action is disruptive.",
                      action: () => apiPost("/admin/sessions/revoke-all", {}),
                      successMessage: "All user sessions were revoked.",
                    })
                  }
                >
                  Revoke All Sessions
                </Button>
                <TextField
                  size="small"
                  label="User ID"
                  value={revokeUserId}
                  onChange={(event) => setRevokeUserId(event.target.value)}
                />
                <Button
                  color="warning"
                  variant="contained"
                  disabled={!revokeUserId || busyAction === "revoke-user"}
                  onClick={() =>
                    confirmAndRun({
                      actionKey: "revoke-user",
                      confirmationMessage: `Revoke all sessions for user ${revokeUserId}?`,
                      action: () => apiPost(`/admin/users/${revokeUserId}/revoke-sessions`, {}),
                      successMessage: `Sessions revoked for user ${revokeUserId}.`,
                    })
                  }
                >
                  Revoke User Sessions
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                Override Tools
              </Typography>
              <Stack spacing={1}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Course ID to delete"
                    value={overrideForm.courseId}
                    onChange={(event) => setOverrideForm((previous) => ({ ...previous, courseId: event.target.value }))}
                  />
                  <Button
                    color="error"
                    variant="outlined"
                    disabled={!overrideForm.courseId || busyAction === "delete-course"}
                    onClick={() =>
                      confirmAndRun({
                        actionKey: "delete-course",
                        confirmationMessage: `Delete course ${overrideForm.courseId}? This action cannot be undone.`,
                        action: () => apiDelete(`/courses/${overrideForm.courseId}`),
                        successMessage: `Course ${overrideForm.courseId} deleted.`,
                      })
                    }
                  >
                    Delete Course
                  </Button>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="School ID to delete"
                    value={overrideForm.schoolId}
                    onChange={(event) => setOverrideForm((previous) => ({ ...previous, schoolId: event.target.value }))}
                  />
                  <Button
                    color="error"
                    variant="outlined"
                    disabled={!overrideForm.schoolId || busyAction === "delete-school"}
                    onClick={() =>
                      confirmAndRun({
                        actionKey: "delete-school",
                        confirmationMessage: `Delete school ${overrideForm.schoolId}? This action cannot be undone.`,
                        action: () => apiDelete(`/schools/${overrideForm.schoolId}`),
                        successMessage: `School ${overrideForm.schoolId} deleted.`,
                      })
                    }
                  >
                    Delete School
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1}>
                Latest Audit Events
              </Typography>
              {auditEvents.length ? (
                <List disablePadding>
                  {auditEvents.slice(0, 8).map((event) => (
                    <ListItem key={event.id || `${event.action}-${event.occurredAt}`} disableGutters divider>
                      <ListItemText
                        primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}
                        secondaryTypographyProps={{ fontSize: 12, color: "text.secondary" }}
                        primary={event.action || "action"}
                        secondary={`${event.actorUserId || "actor:n/a"} | ${event.targetUserId || "target:n/a"} | ${event.occurredAt || "time:n/a"}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">No audit events available.</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default SuperadminDashboard;
