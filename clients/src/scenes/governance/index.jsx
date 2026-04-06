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
import { apiGetManySettled, apiPatch, apiPost } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

const ROLE_OPTIONS = ["all", "user", "admin", "superadmin"];
const STATUS_OPTIONS = ["all", "active", "suspended", "disabled"];

const formatTimestamp = (value) => {
  if (!value) {
    return "n/a";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "n/a" : parsed.toLocaleString();
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

const GovernancePage = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [warning, setWarning] = React.useState("");
  const [users, setUsers] = React.useState([]);
  const [auditEvents, setAuditEvents] = React.useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState("");

  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [roleDraft, setRoleDraft] = React.useState("user");
  const [statusDraft, setStatusDraft] = React.useState("active");
  const [statusReason, setStatusReason] = React.useState("");

  const [busyAction, setBusyAction] = React.useState("");
  const [actionStatus, setActionStatus] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const usersSnapshotRef = React.useRef(users);
  const auditEventsSnapshotRef = React.useRef(auditEvents);
  const hasLoadedSnapshotRef = React.useRef(false);

  React.useEffect(() => {
    usersSnapshotRef.current = users;
  }, [users]);

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
          { key: "users", path: "/admin/users?limit=100&sort=name&order=asc", required: true },
          { key: "auditEvents", path: "/admin/audit/events?limit=40" },
        ],
        {
          fallbackData: {
            users: usersSnapshotRef.current,
            auditEvents: auditEventsSnapshotRef.current,
          },
        }
      );

      if (summary.hasRequiredFailures) {
        const requiredFailureDetails = formatFailureDetails(summary.requiredFailureKeys, errors);

        if (!hasLoadedSnapshotRef.current) {
          throw new Error(`Unable to load governance data (${requiredFailureDetails}).`);
        }

        setWarning(
          `Governance refresh is partially unavailable. Showing the last successful snapshot (${requiredFailureDetails}).`
        );
      }

      const nextUsers = Array.isArray(data.users) ? data.users : [];
      setUsers(nextUsers);
      setAuditEvents(Array.isArray(data.auditEvents) ? data.auditEvents : []);
      setLastUpdatedAt(new Date().toISOString());
      hasLoadedSnapshotRef.current = true;

      if (summary.hasOptionalFailures) {
        const optionalFailureDetails = formatFailureDetails(summary.optionalFailureKeys, errors);
        setWarning((previousValue) =>
          previousValue
            ? `${previousValue} Some optional data is temporarily unavailable (${optionalFailureDetails}).`
            : `Some governance data is temporarily unavailable (${optionalFailureDetails}).`
        );
      }

      setSelectedUserId((previousValue) => {
        if (nextUsers.some((user) => user?._id === previousValue)) {
          return previousValue;
        }

        return nextUsers[0]?._id || "";
      });
    } catch (requestError) {
      setError(toApiErrorMessage(requestError, "Unable to load governance data."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = React.useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return users.filter((user) => {
      const role = String(user?.role || "user").toLowerCase();
      const accountStatus = String(user?.accountStatus || "active").toLowerCase();

      if (roleFilter !== "all" && role !== roleFilter) {
        return false;
      }

      if (statusFilter !== "all" && accountStatus !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${user?.name || ""} ${user?.email || ""} ${user?.country || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [users, query, roleFilter, statusFilter]);

  const selectedUser = React.useMemo(
    () => users.find((user) => user?._id === selectedUserId) || null,
    [users, selectedUserId]
  );

  React.useEffect(() => {
    if (!selectedUser) {
      return;
    }

    setRoleDraft(String(selectedUser.role || "user").toLowerCase());
    setStatusDraft(String(selectedUser.accountStatus || "active").toLowerCase());
    setStatusReason("");
  }, [selectedUser]);

  const governanceSummary = React.useMemo(() => {
    const byRole = users.reduce(
      (accumulator, user) => {
        const role = String(user?.role || "user").toLowerCase();
        accumulator[role] = (accumulator[role] || 0) + 1;
        return accumulator;
      },
      { user: 0, admin: 0, superadmin: 0 }
    );

    const nonActiveUsers = users.filter((user) => String(user?.accountStatus || "active").toLowerCase() !== "active").length;

    return {
      totalUsers: users.length,
      admins: byRole.admin,
      superadmins: byRole.superadmin,
      nonActiveUsers,
    };
  }, [users]);

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
          Superadmin Governance
        </Typography>
        <Typography variant="caption" color="text.secondary">
          User role and account policy controls with audit visibility. Updated: {formatTimestamp(lastUpdatedAt)}
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
                    Total users
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {governanceSummary.totalUsers.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Admins
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {governanceSummary.admins.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Superadmins
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {governanceSummary.superadmins.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Non-active accounts
                  </Typography>
                  <Typography variant="h4" color="text.primary" fontWeight={800}>
                    {governanceSummary.nonActiveUsers.toLocaleString()}
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
                  label="Search users"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <TextField
                  select
                  label="Role"
                  SelectProps={{ native: true }}
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  {ROLE_OPTIONS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Status"
                  SelectProps={{ native: true }}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  sx={{ minWidth: 170 }}
                >
                  {STATUS_OPTIONS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </TextField>
                <Button variant="outlined" onClick={loadData}>
                  Refresh
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={1.5}>
            <Grid item xs={12} lg={6}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                    User Directory ({filteredUsers.length})
                  </Typography>

                  <Stack spacing={1} maxHeight={420} sx={{ overflowY: "auto" }}>
                    {filteredUsers.map((user) => (
                      <Box
                        key={user._id}
                        sx={(theme) => ({
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                          p: 1,
                          backgroundColor:
                            selectedUserId === user._id
                              ? theme.palette.background.alt
                              : theme.palette.background.paper,
                        })}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Box minWidth={0}>
                            <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>
                              {user.name || user.email || "Unnamed user"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {user.email || "no-email"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                              role: {user.role || "user"} | status: {user.accountStatus || "active"} | country: {user.country || "n/a"}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant={selectedUserId === user._id ? "contained" : "outlined"}
                            onClick={() => {
                              setSelectedUserId(user._id);
                              setActionStatus("");
                              setActionError("");
                            }}
                          >
                            Manage
                          </Button>
                        </Stack>
                      </Box>
                    ))}

                    {!filteredUsers.length ? (
                      <RouteEmptyState message="No users match the current filters." />
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                    Governance Actions
                  </Typography>

                  {selectedUser ? (
                    <Stack spacing={1.25}>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {selectedUser.name || selectedUser.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedUser._id}
                        </Typography>
                      </Box>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                        <TextField
                          select
                          label="Role"
                          SelectProps={{ native: true }}
                          value={roleDraft}
                          onChange={(event) => setRoleDraft(event.target.value)}
                          sx={{ minWidth: 180 }}
                        >
                          {ROLE_OPTIONS.filter((entry) => entry !== "all").map((entry) => (
                            <option key={entry} value={entry}>
                              {entry}
                            </option>
                          ))}
                        </TextField>
                        <Button
                          variant="contained"
                          disabled={busyAction === "update-role"}
                          onClick={() =>
                            runAction({
                              actionKey: "update-role",
                              confirmationMessage: `Update role for ${selectedUser.email} to ${roleDraft}?`,
                              action: () => apiPatch(`/admin/users/${selectedUser._id}/role`, { role: roleDraft }),
                              successMessage: `Role updated for ${selectedUser.email}.`,
                            })
                          }
                        >
                          Apply role
                        </Button>
                      </Stack>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                        <TextField
                          select
                          label="Account status"
                          SelectProps={{ native: true }}
                          value={statusDraft}
                          onChange={(event) => setStatusDraft(event.target.value)}
                          sx={{ minWidth: 180 }}
                        >
                          {STATUS_OPTIONS.filter((entry) => entry !== "all").map((entry) => (
                            <option key={entry} value={entry}>
                              {entry}
                            </option>
                          ))}
                        </TextField>
                        <TextField
                          fullWidth
                          label="Reason"
                          value={statusReason}
                          onChange={(event) => setStatusReason(event.target.value)}
                        />
                      </Stack>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                        <Button
                          variant="outlined"
                          disabled={busyAction === "update-status"}
                          onClick={() =>
                            runAction({
                              actionKey: "update-status",
                              confirmationMessage: `Update account status for ${selectedUser.email} to ${statusDraft}?`,
                              action: () =>
                                apiPatch(`/admin/users/${selectedUser._id}/status`, {
                                  accountStatus: statusDraft,
                                  reason: statusReason,
                                }),
                              successMessage: `Account status updated for ${selectedUser.email}.`,
                            })
                          }
                        >
                          Apply status
                        </Button>
                        <Button
                          color="warning"
                          variant="outlined"
                          disabled={busyAction === "revoke-user"}
                          onClick={() =>
                            runAction({
                              actionKey: "revoke-user",
                              confirmationMessage: `Revoke all sessions for ${selectedUser.email}?`,
                              action: () => apiPost(`/admin/users/${selectedUser._id}/revoke-sessions`, {}),
                              successMessage: `Sessions revoked for ${selectedUser.email}.`,
                            })
                          }
                        >
                          Revoke sessions
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <RouteEmptyState message="Select a user to manage governance controls." />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1}>
                Audit Feed
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {auditEvents.length ? (
                <List disablePadding>
                  {auditEvents.slice(0, 20).map((event) => (
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

export default GovernancePage;
