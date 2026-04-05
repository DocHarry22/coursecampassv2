import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { apiGetMany } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";

const normalizeCourse = (entry) => ({
  _id: entry?._id,
  name: entry?.title || entry?.name || "Untitled course",
  description: entry?.description || "No description provided.",
  category: entry?.category || "General",
  price: Number(entry?.tuitionFee ?? entry?.price ?? 0),
});

const normalizeSchool = (entry) => ({
  _id: entry?._id,
  name: entry?.name || "Unnamed school",
  city: entry?.city || "Unknown city",
  country: entry?.country || "Unknown country",
  rating: Number(entry?.rating ?? 0),
  ranking: Number(entry?.ranking ?? 0),
});

const SearchPage = () => {
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [results, setResults] = React.useState({ courses: [], schools: [] });

  const runSearch = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const requests = [];
      const searchQuery = new URLSearchParams({
        limit: "20",
        ...(query.trim() ? { search: query.trim() } : {}),
      }).toString();

      if (scope === "all" || scope === "courses") {
        requests.push({ key: "courses", path: `/courses?${searchQuery}&isActive=true` });
      }

      if (scope === "all" || scope === "schools") {
        requests.push({ key: "schools", path: `/schools?${searchQuery}` });
      }

      const response = await apiGetMany(requests);
      setResults({
        courses: Array.isArray(response.courses) ? response.courses.map(normalizeCourse) : [],
        schools: Array.isArray(response.schools) ? response.schools.map(normalizeSchool) : [],
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to run search.");
    } finally {
      setLoading(false);
    }
  }, [query, scope]);

  React.useEffect(() => {
    runSearch();
  }, [runSearch]);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="#64748b" mb={0.5}>
          Search Workspace
        </Typography>
      </Box>

      <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
            <TextField
              fullWidth
              placeholder="Search courses, names, or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ToggleButtonGroup
              exclusive
              value={scope}
              onChange={(_event, value) => value && setScope(value)}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="courses">Courses</ToggleButton>
              <ToggleButton value="schools">Schools</ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" onClick={runSearch} disabled={loading}>
              Search
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <PageLoadingState rows={3} /> : null}

      {!loading && (scope === "all" || scope === "courses") ? (
        <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
              Course Results ({results.courses.length})
            </Typography>
            <Stack spacing={1}>
              {results.courses.map((course) => (
                <Box key={course._id} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.1, backgroundColor: "#fbfdff" }}>
                  <Typography variant="body2" fontWeight={700} color="#0f172a">
                    {course.name}
                  </Typography>
                  <Typography variant="caption" color="#64748b">
                    {course.description || "No description provided."}
                  </Typography>
                  <Box mt={0.75}>
                    <Chip label={`Category: ${course.category || "General"}`} size="small" sx={{ mr: 0.75 }} />
                    <Chip label={`Price: $${Number(course.price || 0).toLocaleString()}`} size="small" />
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {!loading && (scope === "all" || scope === "schools") ? (
        <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
              School Results ({results.schools.length})
            </Typography>
            <Stack spacing={1}>
              {results.schools.map((school) => (
                <Box key={school._id} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.1, backgroundColor: "#fbfdff" }}>
                  <Typography variant="body2" fontWeight={700} color="#0f172a">
                    {school.name}
                  </Typography>
                  <Typography variant="caption" color="#64748b">
                    {school.city || "No city"}
                  </Typography>
                  <Box mt={0.75}>
                    <Chip label={school.country || "No country"} size="small" sx={{ mr: 0.75 }} />
                    <Chip label={`Rating ${Number(school.rating || 0).toFixed(1)}`} size="small" />
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
};

export default SearchPage;
