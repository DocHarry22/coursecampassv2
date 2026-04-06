import React from "react";
import {
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
import { useSearchParams } from "react-router-dom";
import { apiGetManySettled } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

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

const formatFailureDetails = (keys, errors) =>
  keys
    .map((key) => {
      const message = errors?.[key]?.message;
      return message ? `${key}: ${message}` : key;
    })
    .join(" | ");

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warning, setWarning] = React.useState("");
  const [results, setResults] = React.useState({ courses: [], schools: [] });

  const normalizeScope = React.useCallback((value) => {
    return value === "courses" || value === "schools" ? value : "all";
  }, []);

  const runSearch = React.useCallback(async ({ nextQuery = "", nextScope = "all" } = {}) => {
    setLoading(true);
    setError("");
    setWarning("");

    try {
      const requests = [];
      const normalizedQuery = String(nextQuery || "").trim();
      const normalizedScope = normalizeScope(nextScope);
      const searchQuery = new URLSearchParams({
        limit: "20",
        ...(normalizedQuery ? { search: normalizedQuery } : {}),
      }).toString();

      if (normalizedScope === "all" || normalizedScope === "courses") {
        requests.push({ key: "courses", path: `/courses?${searchQuery}&isActive=true` });
      }

      if (normalizedScope === "all" || normalizedScope === "schools") {
        requests.push({ key: "schools", path: `/schools?${searchQuery}` });
      }

      const { data, errors, summary } = await apiGetManySettled(requests);

      if (!Object.keys(data).length && summary.hasFailures) {
        const detailText = formatFailureDetails(summary.failedKeys, errors);
        throw new Error(`Unable to run search (${detailText}).`);
      }

      setResults({
        courses: Array.isArray(data.courses) ? data.courses.map(normalizeCourse) : [],
        schools: Array.isArray(data.schools) ? data.schools.map(normalizeSchool) : [],
      });

      if (summary.hasFailures) {
        const detailText = formatFailureDetails(summary.failedKeys, errors);
        setWarning(`Some search sources are temporarily unavailable (${detailText}).`);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to run search.");
    } finally {
      setLoading(false);
    }
  }, [normalizeScope]);

  React.useEffect(() => {
    const paramQuery = searchParams.get("q") || "";
    const paramScope = normalizeScope(searchParams.get("scope"));

    setQuery(paramQuery);
    setScope(paramScope);
    runSearch({ nextQuery: paramQuery, nextScope: paramScope });
  }, [searchParams, normalizeScope, runSearch]);

  const applySearch = () => {
    const normalizedQuery = query.trim();
    const normalizedScope = normalizeScope(scope);
    const nextParams = new URLSearchParams();

    if (normalizedQuery) {
      nextParams.set("q", normalizedQuery);
    }

    if (normalizedScope !== "all") {
      nextParams.set("scope", normalizedScope);
    }

    setSearchParams(nextParams, { replace: true });
    runSearch({ nextQuery: normalizedQuery, nextScope: normalizedScope });
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Search Workspace
        </Typography>
      </Box>

      <Card>
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
              onChange={(_event, value) => value && setScope(normalizeScope(value))}
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="courses">Courses</ToggleButton>
              <ToggleButton value="schools">Schools</ToggleButton>
            </ToggleButtonGroup>
            <Button variant="contained" onClick={applySearch} disabled={loading}>
              Search
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <RouteStatusBanners error={error} warning={warning} />
      {loading ? <PageLoadingState rows={3} /> : null}

      {!loading && (scope === "all" || scope === "courses") ? (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
              Course Results ({results.courses.length})
            </Typography>
            {results.courses.length ? (
              <Stack spacing={1}>
                {results.courses.map((course) => (
                  <Box
                    key={course._id}
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      p: 1.25,
                      backgroundColor: theme.palette.background.alt,
                    })}
                  >
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {course.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {course.description || "No description provided."}
                    </Typography>
                    <Box mt={0.75}>
                      <Chip label={`Category: ${course.category || "General"}`} size="small" sx={{ mr: 0.75 }} />
                      <Chip label={`Price: $${Number(course.price || 0).toLocaleString()}`} size="small" />
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <RouteEmptyState message="No courses matched your search criteria." />
            )}
          </CardContent>
        </Card>
      ) : null}

      {!loading && (scope === "all" || scope === "schools") ? (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
              School Results ({results.schools.length})
            </Typography>
            {results.schools.length ? (
              <Stack spacing={1}>
                {results.schools.map((school) => (
                  <Box
                    key={school._id}
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      p: 1.25,
                      backgroundColor: theme.palette.background.alt,
                    })}
                  >
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {school.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {school.city || "No city"}
                    </Typography>
                    <Box mt={0.75}>
                      <Chip label={school.country || "No country"} size="small" sx={{ mr: 0.75 }} />
                      <Chip label={`Rating ${Number(school.rating || 0).toFixed(1)}`} size="small" />
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <RouteEmptyState message="No schools matched your search criteria." />
            )}
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
};

export default SearchPage;
