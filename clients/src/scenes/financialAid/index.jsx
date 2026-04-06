import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { apiDelete, apiGetManySettled, apiPatch, apiPost } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

const defaultApplication = {
  provider: "",
  amount: "",
  deadline: "",
  status: "Open",
  notes: "",
};

const toDisplayStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "ready") {
    return "Ready";
  }
  if (normalized === "submitted") {
    return "Submitted";
  }
  if (normalized === "closed") {
    return "Closed";
  }
  if (normalized === "review") {
    return "Review";
  }
  return "Open";
};

const normalizeAidRecord = (entry) => ({
  id: entry?._id || entry?.id,
  provider: entry?.provider || entry?.name || "",
  amount: Number(entry?.amountMax ?? entry?.amountMin ?? 0),
  deadline: entry?.deadline ? String(entry.deadline).slice(0, 10) : "",
  status: toDisplayStatus(entry?.status),
  notes: entry?.notes || "",
});

const formatFailureDetails = (keys, errors) =>
  keys
    .map((key) => {
      const message = errors?.[key]?.message;
      return message ? `${key}: ${message}` : key;
    })
    .join(" | ");

const AidTrackingPage = () => {
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [warning, setWarning] = React.useState("");
  const [contract, setContract] = React.useState(null);
  const [summary, setSummary] = React.useState(null);
  const [formValue, setFormValue] = React.useState(defaultApplication);
  const [applications, setApplications] = React.useState([]);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setStatus("");
      setError("");
      setWarning("");

      try {
        const { data, errors, summary: fetchSummary } = await apiGetManySettled([
          { key: "summary", path: "/general/summary" },
          { key: "dashboardContract", path: "/general/dashboard-contract" },
          { key: "applications", path: "/financial-aid?limit=200" },
        ]);

        if (!Object.keys(data).length && fetchSummary.hasFailures) {
          const detailText = formatFailureDetails(fetchSummary.failedKeys, errors);
          throw new Error(`Unable to load aid data (${detailText}).`);
        }

        setSummary(data.summary || null);
        setContract(data.dashboardContract || null);
        setApplications(Array.isArray(data.applications) ? data.applications.map(normalizeAidRecord) : []);

        if (fetchSummary.hasFailures) {
          const detailText = formatFailureDetails(fetchSummary.failedKeys, errors);
          setWarning(`Some aid-related modules are temporarily unavailable (${detailText}).`);
        }
      } catch (requestError) {
        setError(requestError.message || "Unable to load aid data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddApplication = async (event) => {
    event.preventDefault();

    if (!formValue.provider.trim()) {
      return;
    }

    setStatus("");
    setError("");

    try {
      const created = await apiPost("/financial-aid", {
        name: formValue.provider.trim(),
        provider: formValue.provider.trim(),
        amountMin: Number(formValue.amount || 0),
        amountMax: Number(formValue.amount || 0),
        deadline: formValue.deadline || null,
        status: String(formValue.status || "Open").toLowerCase(),
        notes: formValue.notes,
      });

      setApplications((previousValue) => [normalizeAidRecord(created), ...previousValue]);
      setFormValue(defaultApplication);
      setStatus("Aid tracker entry added.");
    } catch (requestError) {
      setError(requestError.message || "Unable to create aid tracker entry.");
    }
  };

  const updateStatus = async (id, status) => {
    setStatus("");
    setError("");

    try {
      const updated = await apiPatch(`/financial-aid/${id}`, {
        status: String(status || "Open").toLowerCase(),
      });

      setApplications((previousValue) =>
        previousValue.map((entry) => (entry.id === id ? normalizeAidRecord(updated) : entry))
      );
      setStatus(`Aid status updated to ${toDisplayStatus(status)}.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to update aid status.");
    }
  };

  const removeApplication = async (id) => {
    setStatus("");
    setError("");

    try {
      await apiDelete(`/financial-aid/${id}`);
      setApplications((previousValue) => previousValue.filter((entry) => entry.id !== id));
      setStatus("Aid tracker entry deleted.");
    } catch (requestError) {
      setError(requestError.message || "Unable to delete aid tracker entry.");
    }
  };

  const totalTracked = applications.reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const learnerKpis = Array.isArray(contract?.sections?.learner?.kpis) ? contract.sections.learner.kpis : [];
  const activeAidApplications = Number(
    learnerKpis.find((entry) => entry?.key === "activeAidApplications")?.value ?? 0
  );
  const visibleCourseCount = Number(
    learnerKpis.find((entry) => entry?.key === "coursesVisible")?.value ?? 0
  );

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Aid Tracking
        </Typography>
      </Box>

      <RouteStatusBanners success={status} error={error} warning={warning} />

      {loading ? <PageLoadingState rows={3} /> : (
        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={5}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                  Add Aid Application
                </Typography>
                <Stack spacing={1.25} component="form" onSubmit={handleAddApplication}>
                  <TextField
                    label="Provider"
                    value={formValue.provider}
                    onChange={(event) => setFormValue((previous) => ({ ...previous, provider: event.target.value }))}
                    required
                  />
                  <TextField
                    label="Target Amount"
                    type="number"
                    value={formValue.amount}
                    onChange={(event) => setFormValue((previous) => ({ ...previous, amount: event.target.value }))}
                  />
                  <TextField
                    label="Deadline"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formValue.deadline}
                    onChange={(event) => setFormValue((previous) => ({ ...previous, deadline: event.target.value }))}
                  />
                  <TextField
                    select
                    label="Status"
                    SelectProps={{ native: true }}
                    value={formValue.status}
                    onChange={(event) => setFormValue((previous) => ({ ...previous, status: event.target.value }))}
                  >
                    <option value="Open">Open</option>
                    <option value="Review">Review</option>
                    <option value="Ready">Ready</option>
                    <option value="Submitted">Submitted</option>
                  </TextField>
                  <TextField
                    label="Notes"
                    multiline
                    minRows={2}
                    value={formValue.notes}
                    onChange={(event) => setFormValue((previous) => ({ ...previous, notes: event.target.value }))}
                  />
                  <Button type="submit" variant="contained" sx={{ alignSelf: "flex-start" }}>
                    Add tracker
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Stack spacing={1.25}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1}>
                    Snapshot
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recommendations available: {summary?.recommendations?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active aid applications: {activeAidApplications.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Courses visible for your role: {visibleCourseCount.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tracked local aid total: ${totalTracked.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                    Application Tracker ({applications.length})
                  </Typography>
                  {applications.length ? (
                    <Stack spacing={1}>
                      {applications.map((entry) => (
                        <Box
                          key={entry.id}
                          sx={(theme) => ({
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 2,
                            p: 1.25,
                            backgroundColor: theme.palette.background.alt,
                          })}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="body2" fontWeight={700} color="text.primary">
                                {entry.provider}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ${Number(entry.amount || 0).toLocaleString()} {entry.deadline ? `| Deadline ${entry.deadline}` : ""}
                              </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => removeApplication(entry.id)} aria-label={`Delete aid application ${entry.provider}`}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                          <Stack direction="row" spacing={0.8} mt={1}>
                            {["Open", "Review", "Ready", "Submitted"].map((statusValue) => (
                              <Chip
                                key={statusValue}
                                label={statusValue}
                                clickable
                                onClick={() => updateStatus(entry.id, statusValue)}
                                color={entry.status === statusValue ? "primary" : "default"}
                                size="small"
                              />
                            ))}
                          </Stack>
                          {entry.notes ? (
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                              {entry.notes}
                            </Typography>
                          ) : null}
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <RouteEmptyState message="No aid applications are being tracked yet." />
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
};

export default AidTrackingPage;
