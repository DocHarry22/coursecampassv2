import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  if (kpi?.displayAs === "percent") {
    return `${toNumber(kpi.value)}%`;
  }

  if (kpi?.displayAs === "currency") {
    return `$${toNumber(kpi.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  if (kpi?.displayAs === "text") {
    return String(kpi?.value || "n/a");
  }

  return toNumber(kpi?.value).toLocaleString();
};

const moduleHealthLabel = (value, thresholds) => {
  if (value <= thresholds.good) {
    return { label: "Healthy", color: "success" };
  }

  if (value <= thresholds.warn) {
    return { label: "Watch", color: "warning" };
  }

  return { label: "Attention", color: "error" };
};

const UserDashboard = ({ viewModel, onRefresh }) => {
  const navigate = useNavigate();
  const todos = viewModel.moduleData.todos;
  const calendar = viewModel.moduleData.calendar;
  const aid = viewModel.moduleData.aid;
  const now = new Date();

  const openTodos = todos.filter((todo) => !todo?.completed).length;
  const upcomingEvents = calendar.filter((event) => {
    const startAt = new Date(event?.startAt || event?.date || 0);
    return !Number.isNaN(startAt.getTime()) && startAt >= now;
  }).length;
  const activeAid = aid.filter((item) => ["open", "review", "ready"].includes(String(item?.status || "").toLowerCase())).length;

  const moduleHealth = [
    {
      name: "To-do module",
      metric: `${openTodos} open tasks`,
      ...moduleHealthLabel(openTodos, { good: 3, warn: 8 }),
    },
    {
      name: "Calendar module",
      metric: `${upcomingEvents} upcoming events`,
      ...moduleHealthLabel(Math.abs(upcomingEvents - 3), { good: 1, warn: 3 }),
    },
    {
      name: "Aid tracker",
      metric: `${activeAid} active applications`,
      ...moduleHealthLabel(activeAid, { good: 2, warn: 5 }),
    },
  ];

  return (
    <Grid container spacing={1.25}>
      <Grid item xs={12}>
        <Card sx={{ border: "1px solid #dbe6f3", borderRadius: 2.5, boxShadow: "none" }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
              Personal Planning
            </Typography>
            <List disablePadding>
              {viewModel.learnerRows.map((kpi) => (
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
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={7}>
        <Card sx={{ border: "1px solid #dbe6f3", borderRadius: 2.5, boxShadow: "none" }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
              Owned Module Health
            </Typography>
            <Stack spacing={1}>
              {moduleHealth.map((module) => (
                <Box
                  key={module.name}
                  sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1.1, backgroundColor: "#fbfdff" }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="#0f172a">
                        {module.name}
                      </Typography>
                      <Typography variant="caption" color="#64748b">
                        {module.metric}
                      </Typography>
                    </Box>
                    <Chip label={module.label} size="small" color={module.color} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={5}>
        <Card sx={{ border: "1px solid #dbe6f3", borderRadius: 2.5, boxShadow: "none", height: "100%" }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
              Quick Actions
            </Typography>
            <Stack spacing={1}>
              <Button variant="contained" onClick={() => navigate("/todo")}>Open To-do Board</Button>
              <Button variant="outlined" onClick={() => navigate("/calendar")}>Open Calendar</Button>
              <Button variant="outlined" onClick={() => navigate("/financial-aid")}>Open Aid Tracker</Button>
              <Button variant="text" onClick={onRefresh}>Refresh Planning Data</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default UserDashboard;
