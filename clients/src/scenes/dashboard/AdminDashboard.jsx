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
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

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

const AdminDashboard = ({ viewModel, onRefresh }) => {
  const navigate = useNavigate();

  return (
    <Grid container spacing={1.25}>
      <Grid item xs={12} lg={7}>
        <Card sx={{ border: "1px solid #dbe6f3", borderRadius: 2.5, boxShadow: "none", height: "100%" }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
              Operational Metrics
            </Typography>
            {viewModel.operationsRows.length > 0 ? (
              <List disablePadding>
                {viewModel.operationsRows.map((kpi) => (
                  <ListItem key={kpi.key} disableGutters divider>
                    <ListItemText
                      primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}
                      secondaryTypographyProps={{ fontSize: 12, color: "#64748b" }}
                      primary={kpi.label}
                      secondary={formatKpiValue(kpi)}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="warning">No operations KPI section was returned for this role contract.</Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Card sx={{ border: "1px solid #dbe6f3", borderRadius: 2.5, boxShadow: "none", height: "100%" }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
              Catalog Management Actions
            </Typography>
            <Stack spacing={1}>
              <Button variant="contained" onClick={() => navigate("/courses")}>Manage Course Catalog</Button>
              <Button variant="outlined" onClick={() => navigate("/schools")}>Manage School Catalog</Button>
              <Button variant="outlined" onClick={() => navigate("/search")}>Search Operational Records</Button>
              <Button variant="text" onClick={onRefresh}>Refresh Operational Metrics</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ border: "1px solid #dbe6f3", borderRadius: 2.5, boxShadow: "none" }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1}>
              Admin Feature Panels
            </Typography>
            <Box
              display="grid"
              gridTemplateColumns={{ xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
              gap={1}
            >
              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.1, backgroundColor: "#fbfdff" }}>
                <Typography variant="body2" fontWeight={700} color="#0f172a">Catalog Workflow</Typography>
                <Typography variant="caption" color="#64748b">Create and update courses and schools using role-approved write routes.</Typography>
              </Box>
              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.1, backgroundColor: "#fbfdff" }}>
                <Typography variant="body2" fontWeight={700} color="#0f172a">Operations Snapshot</Typography>
                <Typography variant="caption" color="#64748b">Track users, products, transactions, and revenue from contract-backed metrics.</Typography>
              </Box>
              <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.1, backgroundColor: "#fbfdff" }}>
                <Typography variant="body2" fontWeight={700} color="#0f172a">Role Boundaries</Typography>
                <Typography variant="caption" color="#64748b">Governance and destructive overrides remain superadmin-only by policy.</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AdminDashboard;
