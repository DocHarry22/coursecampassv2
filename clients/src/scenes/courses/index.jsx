import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../config/apiClient";
import { useSession } from "../../auth/SessionContext";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

const normalizeCourse = (course) => ({
  _id: course?._id,
  title: course?.title || course?.name || "Untitled course",
  name: course?.title || course?.name || "Untitled course",
  description: course?.description || "No course details available.",
  category: course?.category || "General",
  level: course?.level || "Beginner",
  mode: String(course?.mode || "online").toLowerCase(),
  tuitionFee: Number(course?.tuitionFee ?? course?.price ?? 0),
  price: Number(course?.tuitionFee ?? course?.price ?? 0),
  rating: Number(course?.rating ?? 0),
  durationWeeks: Number(course?.durationWeeks ?? 0),
  schoolId: course?.schoolId ? String(course.schoolId) : "",
  isActive: course?.isActive !== false,
});

const normalizeSchoolOption = (school) => ({
  id: String(school?._id || ""),
  name: school?.name || "Unnamed school",
});

const defaultCourseForm = {
  title: "",
  description: "",
  category: "",
  level: "Beginner",
  mode: "online",
  durationWeeks: "",
  tuitionFee: "",
  schoolId: "",
  isActive: true,
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

const parseNonNegativeNumber = (value, fieldLabel) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldLabel} must be a valid non-negative number.`);
  }

  return parsed;
};

const CourseDiscoveryPage = () => {
  const { capabilities } = useSession();
  const isSuperadmin = Boolean(capabilities?.isSuperadmin);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [courses, setCourses] = React.useState([]);
  const [schools, setSchools] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sort, setSort] = React.useState("title");
  const [priceRange, setPriceRange] = React.useState([0, 5000]);
  const [shortlist, setShortlist] = useLocalStorageState("coursecampass.shortlist.v1", []);
  const [workflowMode, setWorkflowMode] = React.useState("create");
  const [selectedCourseId, setSelectedCourseId] = React.useState("");
  const [formValue, setFormValue] = React.useState(defaultCourseForm);
  const [workflowStatus, setWorkflowStatus] = React.useState("");
  const [workflowError, setWorkflowError] = React.useState("");
  const [workflowSaving, setWorkflowSaving] = React.useState(false);

  const loadCourses = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const queryParams = new URLSearchParams({
        limit: "50",
        sort,
        order: "asc",
        isActive: "true",
        minPrice: String(priceRange[0]),
        maxPrice: String(priceRange[1]),
        ...(query.trim() ? { search: query.trim() } : {}),
        ...(category ? { category } : {}),
      }).toString();

      const rows = await apiGet(`/courses?${queryParams}`);
      setCourses(Array.isArray(rows) ? rows.map(normalizeCourse) : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load courses.");
    } finally {
      setLoading(false);
    }
  }, [query, category, sort, priceRange]);

  const loadSchools = React.useCallback(async () => {
    try {
      const rows = await apiGet("/schools?limit=200&sort=name&order=asc");
      setSchools(Array.isArray(rows) ? rows.map(normalizeSchoolOption) : []);
    } catch (_requestError) {
      setSchools([]);
    }
  }, []);

  React.useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  React.useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const categories = React.useMemo(
    () => [...new Set(courses.map((course) => course.category).filter(Boolean))],
    [courses]
  );

  const selectedCourse = React.useMemo(
    () => courses.find((course) => course._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const schoolNameById = React.useMemo(
    () => new Map(schools.map((school) => [school.id, school.name])),
    [schools]
  );

  React.useEffect(() => {
    if (workflowMode === "create") {
      setFormValue(defaultCourseForm);
      return;
    }

    if (!selectedCourse) {
      return;
    }

    setFormValue({
      title: selectedCourse.title || "",
      description: selectedCourse.description || "",
      category: selectedCourse.category || "",
      level: selectedCourse.level || "Beginner",
      mode: selectedCourse.mode || "online",
      durationWeeks:
        Number.isFinite(selectedCourse.durationWeeks) && selectedCourse.durationWeeks > 0
          ? String(selectedCourse.durationWeeks)
          : "",
      tuitionFee:
        Number.isFinite(selectedCourse.tuitionFee) && selectedCourse.tuitionFee > 0
          ? String(selectedCourse.tuitionFee)
          : "",
      schoolId: selectedCourse.schoolId || "",
      isActive: selectedCourse.isActive !== false,
    });
  }, [workflowMode, selectedCourse]);

  const isShortlisted = (id) => shortlist.includes(id);

  const toggleShortlist = (id) => {
    setShortlist((previousValue) =>
      previousValue.includes(id)
        ? previousValue.filter((entry) => entry !== id)
        : [...previousValue, id]
    );
  };

  const buildCoursePayload = () => {
    const title = String(formValue.title || "").trim();
    if (!title) {
      throw new Error("Course title is required.");
    }

    const payload = {
      title,
      description: String(formValue.description || "").trim(),
      category: String(formValue.category || "").trim() || "General",
      level: String(formValue.level || "Beginner"),
      mode: String(formValue.mode || "online").toLowerCase(),
      schoolId: String(formValue.schoolId || "").trim() || null,
      isActive: Boolean(formValue.isActive),
    };

    const durationWeeksValue = String(formValue.durationWeeks || "").trim();
    if (durationWeeksValue) {
      payload.durationWeeks = parseNonNegativeNumber(durationWeeksValue, "Duration");
    }

    const tuitionFeeValue = String(formValue.tuitionFee || "").trim();
    if (tuitionFeeValue) {
      payload.tuitionFee = parseNonNegativeNumber(tuitionFeeValue, "Tuition fee");
    }

    return payload;
  };

  const handleWorkflowSave = async () => {
    setWorkflowStatus("");
    setWorkflowError("");
    setWorkflowSaving(true);

    try {
      const payload = buildCoursePayload();

      if (workflowMode === "create") {
        await apiPost("/courses", payload);
        setWorkflowStatus("Course created.");
        setFormValue(defaultCourseForm);
      } else {
        if (!selectedCourseId) {
          throw new Error("Select a course to update.");
        }

        await apiPatch(`/courses/${selectedCourseId}`, payload);
        setWorkflowStatus("Course updated.");
      }

      await loadCourses();
      await loadSchools();
    } catch (requestError) {
      setWorkflowError(toApiErrorMessage(requestError, "Unable to save course."));
    } finally {
      setWorkflowSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourseId || !isSuperadmin) {
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this course? This action cannot be undone.");
      if (!confirmed) {
        return;
      }
    }

    setWorkflowStatus("");
    setWorkflowError("");
    setWorkflowSaving(true);

    try {
      await apiDelete(`/courses/${selectedCourseId}`);
      setWorkflowStatus("Course deleted.");
      setWorkflowMode("create");
      setSelectedCourseId("");
      setFormValue(defaultCourseForm);
      await loadCourses();
    } catch (requestError) {
      setWorkflowError(toApiErrorMessage(requestError, "Unable to delete course."));
    } finally {
      setWorkflowSaving(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Course Discovery and Management
        </Typography>
      </Box>

      <RouteStatusBanners success={workflowStatus} error={[workflowError, error]} />

      <Card>
        <CardContent>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              Catalog Workflow
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
                <option value="create">Create new course</option>
                <option value="edit">Edit existing course</option>
              </TextField>

              {workflowMode === "edit" ? (
                <TextField
                  select
                  fullWidth
                  label="Course"
                  SelectProps={{ native: true }}
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </TextField>
              ) : null}
            </Stack>

            <Grid container spacing={1.25}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formValue.title}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, title: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={formValue.category}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, category: event.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Level"
                  SelectProps={{ native: true }}
                  value={formValue.level}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, level: event.target.value }))}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Mode"
                  SelectProps={{ native: true }}
                  value={formValue.mode}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, mode: event.target.value }))}
                >
                  <option value="online">Online</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (weeks)"
                  value={formValue.durationWeeks}
                  onChange={(event) =>
                    setFormValue((previousValue) => ({
                      ...previousValue,
                      durationWeeks: event.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Tuition fee"
                  value={formValue.tuitionFee}
                  onChange={(event) =>
                    setFormValue((previousValue) => ({
                      ...previousValue,
                      tuitionFee: event.target.value,
                    }))
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="School"
                  SelectProps={{ native: true }}
                  value={formValue.schoolId}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, schoolId: event.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formValue.isActive}
                      onChange={(event) =>
                        setFormValue((previousValue) => ({
                          ...previousValue,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                  }
                  label="Active"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Description"
                  value={formValue.description}
                  onChange={(event) => setFormValue((previousValue) => ({ ...previousValue, description: event.target.value }))}
                />
              </Grid>
            </Grid>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Button
                variant="contained"
                onClick={handleWorkflowSave}
                disabled={workflowSaving || (workflowMode === "edit" && !selectedCourseId)}
              >
                {workflowSaving ? "Saving..." : workflowMode === "create" ? "Create course" : "Update course"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setWorkflowMode("create");
                  setSelectedCourseId("");
                  setFormValue(defaultCourseForm);
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
                  onClick={handleDeleteCourse}
                  disabled={workflowSaving || !selectedCourseId}
                  aria-label="Delete selected course"
                >
                  Delete course
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Divider />

      <Card>
        <CardContent>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              Discovery Filters
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <TextField fullWidth label="Search courses" value={query} onChange={(event) => setQuery(event.target.value)} />
              <TextField
                select
                fullWidth
                label="Category"
                SelectProps={{ native: true }}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Sort by"
                SelectProps={{ native: true }}
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="title">Title</option>
                <option value="tuitionFee">Tuition fee</option>
                <option value="durationWeeks">Duration (weeks)</option>
                <option value="createdAt">Recently added</option>
              </TextField>
            </Stack>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Price window (${priceRange[0]} - ${priceRange[1]})
              </Typography>
              <Slider
                value={priceRange}
                onChange={(_event, nextValue) => setPriceRange(nextValue)}
                valueLabelDisplay="auto"
                min={0}
                max={5000}
                step={50}
              />
            </Box>
            <Button variant="contained" onClick={loadCourses} sx={{ alignSelf: "flex-start" }}>
              Refresh results
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading ? <PageLoadingState rows={4} /> : null}

      {!loading && !courses.length ? (
        <RouteEmptyState message="No courses match the current filters." />
      ) : null}

      {!loading && courses.length ? (
        <Grid container spacing={1.5}>
          {courses.map((course) => (
            <Grid item xs={12} md={6} xl={4} key={course._id}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Stack spacing={0.8}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                      {course.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {course.description || "No course details available."}
                    </Typography>
                    <Typography variant="body2" color="text.primary">Category: {course.category || "General"}</Typography>
                    <Typography variant="body2" color="text.primary">Level: {course.level || "Beginner"}</Typography>
                    <Typography variant="body2" color="text.primary">Mode: {course.mode || "online"}</Typography>
                    <Typography variant="body2" color="text.primary">Price: ${Number(course.price || 0).toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.primary">Duration: {Number(course.durationWeeks || 0)} weeks</Typography>
                    <Typography variant="body2" color="text.primary">
                      School: {schoolNameById.get(course.schoolId) || "Unassigned"}
                    </Typography>
                    <Typography variant="body2" color={course.isActive ? "success.main" : "warning.main"}>
                      Status: {course.isActive ? "Active" : "Inactive"}
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8}>
                      <Button
                        variant={isShortlisted(course._id) ? "outlined" : "contained"}
                        onClick={() => toggleShortlist(course._id)}
                        sx={{ alignSelf: "flex-start", mt: 0.5 }}
                      >
                        {isShortlisted(course._id) ? "Remove from shortlist" : "Add to shortlist"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setWorkflowMode("edit");
                          setSelectedCourseId(course._id);
                          setWorkflowStatus("");
                          setWorkflowError("");
                        }}
                        sx={{ alignSelf: "flex-start", mt: 0.5 }}
                      >
                        Edit course
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : null}
    </Stack>
  );
};

export default CourseDiscoveryPage;
