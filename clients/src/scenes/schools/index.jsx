import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../config/apiClient";
import { useSession } from "../../auth/SessionContext";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

const toSchoolProfiles = (schools) =>
  schools.map((school) => ({
    id: school?._id,
    name: school?.name || "Unnamed school",
    country: school?.country || "Unknown",
    city: school?.city || "Unknown",
    state: school?.state || "",
    website: school?.website || "",
    rating: Number(school?.rating ?? 0),
    ranking: Number(school?.ranking ?? 0),
    facilities: Array.isArray(school?.facilities) ? school.facilities : [],
    facilitiesCount: Array.isArray(school?.facilities) ? school.facilities.length : 0,
  }));

const defaultSchoolForm = {
  name: "",
  country: "",
  city: "",
  state: "",
  website: "",
  rating: "",
  ranking: "",
  facilities: "",
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

const parseNonNegativeNumber = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number.`);
  }

  return parsed;
};

const MetricsCard = ({ title, value }) => (
  <Box
    sx={(theme) => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 2,
      p: 1.25,
      backgroundColor: theme.palette.background.alt,
    })}
  >
    <Typography variant="caption" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h6" color="text.primary" fontWeight={800}>
      {value}
    </Typography>
  </Box>
);

const SchoolComparisonPage = () => {
  const { capabilities } = useSession();
  const isSuperadmin = Boolean(capabilities?.isSuperadmin);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [schools, setSchools] = React.useState([]);
  const [leftId, setLeftId] = React.useState("");
  const [rightId, setRightId] = React.useState("");
  const [workflowMode, setWorkflowMode] = React.useState("create");
  const [selectedSchoolId, setSelectedSchoolId] = React.useState("");
  const [formValue, setFormValue] = React.useState(defaultSchoolForm);
  const [workflowStatus, setWorkflowStatus] = React.useState("");
  const [workflowError, setWorkflowError] = React.useState("");
  const [workflowSaving, setWorkflowSaving] = React.useState(false);

  const loadSchools = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const rows = await apiGet("/schools?limit=100&sort=name&order=asc");
      const profiles = toSchoolProfiles(Array.isArray(rows) ? rows : []);
      setSchools(profiles);

      setLeftId((previousValue) => {
        if (profiles.some((profile) => profile.id === previousValue)) {
          return previousValue;
        }

        return profiles[0]?.id || "";
      });

      setRightId((previousValue) => {
        if (profiles.some((profile) => profile.id === previousValue)) {
          return previousValue;
        }

        return profiles[1]?.id || profiles[0]?.id || "";
      });

      setSelectedSchoolId((previousValue) => {
        if (profiles.some((profile) => profile.id === previousValue)) {
          return previousValue;
        }

        return "";
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load school comparison data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const leftSchool = schools.find((school) => school.id === leftId) || null;
  const rightSchool = schools.find((school) => school.id === rightId) || null;
  const selectedSchool = schools.find((school) => school.id === selectedSchoolId) || null;

  React.useEffect(() => {
    if (workflowMode === "create") {
      setFormValue(defaultSchoolForm);
      return;
    }

    if (!selectedSchool) {
      return;
    }

    setFormValue({
      name: selectedSchool.name || "",
      country: selectedSchool.country || "",
      city: selectedSchool.city || "",
      state: selectedSchool.state || "",
      website: selectedSchool.website || "",
      rating:
        Number.isFinite(selectedSchool.rating) && selectedSchool.rating > 0
          ? String(selectedSchool.rating)
          : "",
      ranking:
        Number.isFinite(selectedSchool.ranking) && selectedSchool.ranking > 0
          ? String(selectedSchool.ranking)
          : "",
      facilities: Array.isArray(selectedSchool.facilities) ? selectedSchool.facilities.join(", ") : "",
    });
  }, [workflowMode, selectedSchool]);

  const buildSchoolPayload = () => {
    const name = String(formValue.name || "").trim();

    if (!name) {
      throw new Error("School name is required.");
    }

    const payload = {
      name,
      country: String(formValue.country || "").trim(),
      city: String(formValue.city || "").trim(),
      state: String(formValue.state || "").trim(),
      website: String(formValue.website || "").trim(),
      facilities: String(formValue.facilities || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    };

    const ratingValue = String(formValue.rating || "").trim();
    if (ratingValue) {
      const parsedRating = parseNonNegativeNumber(ratingValue, "Rating");
      if (parsedRating > 5) {
        throw new Error("Rating must be between 0 and 5.");
      }
      payload.rating = parsedRating;
    }

    const rankingValue = String(formValue.ranking || "").trim();
    if (rankingValue) {
      const parsedRanking = parseNonNegativeNumber(rankingValue, "Ranking");
      if (parsedRanking < 1) {
        throw new Error("Ranking must be at least 1.");
      }
      payload.ranking = parsedRanking;
    }

    return payload;
  };

  const handleWorkflowSave = async () => {
    setWorkflowStatus("");
    setWorkflowError("");
    setWorkflowSaving(true);

    try {
      const payload = buildSchoolPayload();

      if (workflowMode === "create") {
        await apiPost("/schools", payload);
        setWorkflowStatus("School created.");
        setFormValue(defaultSchoolForm);
      } else {
        if (!selectedSchoolId) {
          throw new Error("Select a school to update.");
        }

        await apiPatch(`/schools/${selectedSchoolId}`, payload);
        setWorkflowStatus("School updated.");
      }

      await loadSchools();
    } catch (requestError) {
      setWorkflowError(toApiErrorMessage(requestError, "Unable to save school."));
    } finally {
      setWorkflowSaving(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!selectedSchoolId || !isSuperadmin) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this school? This action cannot be undone.");
      if (!confirmed) {
        return;
      }
    }

    setWorkflowStatus("");
    setWorkflowError("");
    setWorkflowSaving(true);

    try {
      await apiDelete(`/schools/${selectedSchoolId}`);
      setWorkflowStatus("School deleted.");
      setWorkflowMode("create");
      setSelectedSchoolId("");
      setFormValue(defaultSchoolForm);
      await loadSchools();
    } catch (requestError) {
      setWorkflowError(toApiErrorMessage(requestError, "Unable to delete school."));
    } finally {
      setWorkflowSaving(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          School Comparison and Management
        </Typography>
      </Box>

      <RouteStatusBanners success={workflowStatus} error={[workflowError, error]} />

      <Card>
        <CardContent>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              School Catalog Workflow
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <TextField
                select
                fullWidth
                label="Workflow"
                SelectProps={{ native: true }}
                value={workflowMode}
                onChange={(event) => setWorkflowMode(event.target.value)}
              >
                <option value="create">Create new school</option>
                <option value="edit">Edit existing school</option>
              </TextField>

              {workflowMode === "edit" ? (
                <TextField
                  select
                  fullWidth
                  label="School"
                  SelectProps={{ native: true }}
                  value={selectedSchoolId}
                  onChange={(event) => setSelectedSchoolId(event.target.value)}
                >
                  <option value="">Select a school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </TextField>
              ) : null}
            </Stack>

            <Grid container spacing={1.25}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formValue.name}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, name: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={formValue.country}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, country: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={formValue.city}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, city: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="State / Province"
                  value={formValue.state}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, state: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={formValue.website}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, website: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Rating"
                  value={formValue.rating}
                  inputProps={{ min: 0, max: 5, step: 0.1 }}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, rating: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Ranking"
                  value={formValue.ranking}
                  inputProps={{ min: 1, step: 1 }}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, ranking: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Facilities (comma-separated)"
                  value={formValue.facilities}
                  onChange={(event) =>
                    setFormValue((previousValue) => ({
                      ...previousValue,
                      facilities: event.target.value,
                    }))
                  }
                />
              </Grid>
            </Grid>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Button
                variant="contained"
                onClick={handleWorkflowSave}
                disabled={workflowSaving || (workflowMode === "edit" && !selectedSchoolId)}
              >
                {workflowSaving ? "Saving..." : workflowMode === "create" ? "Create school" : "Update school"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setWorkflowMode("create");
                  setSelectedSchoolId("");
                  setFormValue(defaultSchoolForm);
                  setWorkflowStatus("");
                  setWorkflowError("");
                }}
                disabled={workflowSaving}
              >
                Reset form
              </Button>
              {isSuperadmin && workflowMode === "edit" ? (
                <Button
                  color="error"
                  variant="outlined"
                  onClick={handleDeleteSchool}
                  disabled={workflowSaving || !selectedSchoolId}
                  aria-label="Delete selected school"
                >
                  Delete school
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Divider />

      <Card>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              Comparison Workspace
            </Typography>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Compare school A"
                SelectProps={{ native: true }}
                value={leftId}
                onChange={(event) => setLeftId(event.target.value)}
              >
                {!schools.length ? <option value="">No schools available</option> : null}
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Compare school B"
                SelectProps={{ native: true }}
                value={rightId}
                onChange={(event) => setRightId(event.target.value)}
              >
                {!schools.length ? <option value="">No schools available</option> : null}
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </TextField>
            </Grid>
          </Grid>
          </Stack>
        </CardContent>
      </Card>

      {loading ? <PageLoadingState rows={2} /> : null}

      {!loading && (!leftSchool || !rightSchool) ? (
        <RouteEmptyState message="Not enough school records are available to compare yet." />
      ) : null}

      {!loading && leftSchool && rightSchool ? (
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                  {leftSchool.name}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setWorkflowMode("edit");
                    setSelectedSchoolId(leftSchool.id);
                    setWorkflowStatus("");
                    setWorkflowError("");
                  }}
                  sx={{ mb: 1.25 }}
                >
                  Edit school
                </Button>
                <Stack spacing={1}>
                  <MetricsCard title="Country" value={leftSchool.country} />
                  <MetricsCard title="Rating" value={Number.isFinite(leftSchool.rating) ? leftSchool.rating.toFixed(1) : "0.0"} />
                  <MetricsCard title="Ranking" value={leftSchool.ranking || "n/a"} />
                  <MetricsCard title="Facilities" value={leftSchool.facilitiesCount} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
                  {rightSchool.name}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setWorkflowMode("edit");
                    setSelectedSchoolId(rightSchool.id);
                    setWorkflowStatus("");
                    setWorkflowError("");
                  }}
                  sx={{ mb: 1.25 }}
                >
                  Edit school
                </Button>
                <Stack spacing={1}>
                  <MetricsCard title="Country" value={rightSchool.country} />
                  <MetricsCard title="Rating" value={Number.isFinite(rightSchool.rating) ? rightSchool.rating.toFixed(1) : "0.0"} />
                  <MetricsCard title="Ranking" value={rightSchool.ranking || "n/a"} />
                  <MetricsCard title="Facilities" value={rightSchool.facilitiesCount} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  Quick Verdict
                </Typography>
                <Divider sx={{ my: 1.2 }} />
                <Typography variant="body2" color="text.secondary">
                  {leftSchool.rating >= rightSchool.rating ? leftSchool.name : rightSchool.name} has the stronger rating profile, while {(leftSchool.ranking || Number.MAX_SAFE_INTEGER) <= (rightSchool.ranking || Number.MAX_SAFE_INTEGER) ? leftSchool.name : rightSchool.name} has the better ranking position.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}
    </Stack>
  );
};

export default SchoolComparisonPage;
