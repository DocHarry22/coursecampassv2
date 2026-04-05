import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { apiGet } from "../../config/apiClient";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import PageLoadingState from "../../components/PageLoadingState";

const normalizeCourse = (course) => ({
  _id: course?._id,
  name: course?.title || course?.name || "Untitled course",
  description: course?.description || "No course details available.",
  category: course?.category || "General",
  price: Number(course?.tuitionFee ?? course?.price ?? 0),
  rating: Number(course?.rating ?? 0),
  durationWeeks: Number(course?.durationWeeks ?? 0),
});

const CourseDiscoveryPage = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [courses, setCourses] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sort, setSort] = React.useState("title");
  const [priceRange, setPriceRange] = React.useState([0, 5000]);
  const [shortlist, setShortlist] = useLocalStorageState("coursecampass.shortlist.v1", []);

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

  React.useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const categories = React.useMemo(
    () => [...new Set(courses.map((course) => course.category).filter(Boolean))],
    [courses]
  );

  const isShortlisted = (id) => shortlist.includes(id);

  const toggleShortlist = (id) => {
    setShortlist((previousValue) =>
      previousValue.includes(id)
        ? previousValue.filter((entry) => entry !== id)
        : [...previousValue, id]
    );
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="#64748b" mb={0.5}>
          Course Discovery
        </Typography>
      </Box>

      <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
        <CardContent>
          <Stack spacing={1.25}>
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
              <Typography variant="caption" color="#64748b">
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

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? <PageLoadingState rows={4} /> : null}

      {!loading ? (
        <Grid container spacing={1.25}>
          {courses.map((course) => (
            <Grid item xs={12} md={6} xl={4} key={course._id}>
              <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5, height: "100%" }}>
                <CardContent>
                  <Stack spacing={0.8}>
                    <Typography variant="subtitle2" fontWeight={700} color="#0f172a">
                      {course.name}
                    </Typography>
                    <Typography variant="caption" color="#64748b">
                      {course.description || "No course details available."}
                    </Typography>
                    <Typography variant="body2" color="#334155">Category: {course.category || "General"}</Typography>
                    <Typography variant="body2" color="#334155">Price: ${Number(course.price || 0).toLocaleString()}</Typography>
                    <Typography variant="body2" color="#334155">Duration: {Number(course.durationWeeks || 0)} weeks</Typography>
                    <Button
                      variant={isShortlisted(course._id) ? "outlined" : "contained"}
                      onClick={() => toggleShortlist(course._id)}
                      sx={{ alignSelf: "flex-start", mt: 0.5 }}
                    >
                      {isShortlisted(course._id) ? "Remove from shortlist" : "Add to shortlist"}
                    </Button>
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
