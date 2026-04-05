import React from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { apiGet } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";

const toSchoolProfiles = (schools) =>
  schools.map((school) => ({
    id: school?._id,
    name: school?.name || "Unnamed school",
    country: school?.country || "Unknown",
    city: school?.city || "Unknown",
    rating: Number(school?.rating ?? 0),
    ranking: Number(school?.ranking ?? 0),
    facilitiesCount: Array.isArray(school?.facilities) ? school.facilities.length : 0,
  }));

const MetricsCard = ({ title, value }) => (
  <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.1, backgroundColor: "#fbfdff" }}>
    <Typography variant="caption" color="#64748b">
      {title}
    </Typography>
    <Typography variant="h6" color="#0f172a" fontWeight={800}>
      {value}
    </Typography>
  </Box>
);

const SchoolComparisonPage = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [schools, setSchools] = React.useState([]);
  const [leftId, setLeftId] = React.useState("");
  const [rightId, setRightId] = React.useState("");

  React.useEffect(() => {
    const loadSchools = async () => {
      setLoading(true);
      setError("");

      try {
        const rows = await apiGet("/schools?limit=100&sort=name&order=asc");
        const profiles = toSchoolProfiles(Array.isArray(rows) ? rows : []);
        setSchools(profiles);

        if (profiles.length >= 2) {
          setLeftId(profiles[0].id);
          setRightId(profiles[1].id);
        } else if (profiles.length === 1) {
          setLeftId(profiles[0].id);
          setRightId(profiles[0].id);
        }
      } catch (requestError) {
        setError(requestError.message || "Unable to load school comparison data.");
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
  }, []);

  const leftSchool = schools.find((school) => school.id === leftId) || null;
  const rightSchool = schools.find((school) => school.id === rightId) || null;

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="#64748b" mb={0.5}>
          School Comparison
        </Typography>
      </Box>

      <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
        <CardContent>
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
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading ? <PageLoadingState rows={2} /> : null}

      {!loading && leftSchool && rightSchool ? (
        <Grid container spacing={1.25}>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={1.25}>
                  {leftSchool.name}
                </Typography>
                <Stack spacing={1}>
                  <MetricsCard title="Country" value={leftSchool.country} />
                  <MetricsCard title="Rating" value={leftSchool.rating.toFixed(1)} />
                  <MetricsCard title="Ranking" value={leftSchool.ranking || "n/a"} />
                  <MetricsCard title="Facilities" value={leftSchool.facilitiesCount} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="#0f172a" mb={1.25}>
                  {rightSchool.name}
                </Typography>
                <Stack spacing={1}>
                  <MetricsCard title="Country" value={rightSchool.country} />
                  <MetricsCard title="Rating" value={rightSchool.rating.toFixed(1)} />
                  <MetricsCard title="Ranking" value={rightSchool.ranking || "n/a"} />
                  <MetricsCard title="Facilities" value={rightSchool.facilitiesCount} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} color="#334155">
                  Quick Verdict
                </Typography>
                <Divider sx={{ my: 1.2 }} />
                <Typography variant="body2" color="#475569">
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
