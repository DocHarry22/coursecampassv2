import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

const initialEventForm = {
  title: "",
  date: "",
  time: "",
  type: "Study",
  notes: "",
};

const pad = (value) => String(value).padStart(2, "0");

const toInputDate = (dateValue) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
};

const toInputTime = (dateValue) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const normalizeEvent = (entry) => ({
  id: entry?._id || entry?.id,
  title: entry?.title || "",
  date: entry?.startAt ? toInputDate(entry.startAt) : entry?.date || "",
  time: entry?.startAt ? toInputTime(entry.startAt) : entry?.time || "",
  type: entry?.category ? `${entry.category[0]?.toUpperCase() || ""}${entry.category.slice(1)}` : entry?.type || "Study",
  notes: entry?.description || entry?.notes || "",
});

const toEventPayload = (formValue) => {
  const time = formValue.time || "09:00";
  const startAt = new Date(`${formValue.date}T${time}:00`);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  return {
    title: formValue.title.trim(),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    category: String(formValue.type || "Study").trim().toLowerCase(),
    description: String(formValue.notes || "").trim(),
  };
};

const CalendarPage = () => {
  const [events, setEvents] = React.useState([]);
  const [formValue, setFormValue] = React.useState(initialEventForm);
  const [editingId, setEditingId] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    setStatus("");
    setError("");

    try {
      const response = await apiGet("/calendar?limit=200");
      const rows = Array.isArray(response) ? response : [];
      setEvents(rows.map(normalizeEvent));
    } catch (requestError) {
      setError(requestError.message || "Unable to load calendar events.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const sortedEvents = React.useMemo(
    () =>
      [...events].sort((left, right) => {
        const leftKey = `${left.date || "9999-12-31"} ${left.time || "23:59"}`;
        const rightKey = `${right.date || "9999-12-31"} ${right.time || "23:59"}`;
        return leftKey.localeCompare(rightKey);
      }),
    [events]
  );

  const resetForm = () => {
    setFormValue(initialEventForm);
    setEditingId(null);
  };

  const submitEvent = async (event) => {
    event.preventDefault();

    if (!formValue.title.trim() || !formValue.date) {
      return;
    }

    if (editingId) {
      setStatus("");
      setError("");

      try {
        const updated = await apiPatch(`/calendar/${editingId}`, toEventPayload(formValue));
        setEvents((previousValue) =>
          previousValue.map((entry) => (entry.id === editingId ? normalizeEvent(updated) : entry))
        );
        resetForm();
        setStatus("Calendar event updated.");
      } catch (requestError) {
        setError(requestError.message || "Unable to update calendar event.");
      }
      return;
    }

    setStatus("");
    setError("");

    try {
      const created = await apiPost("/calendar", toEventPayload(formValue));
      setEvents((previousValue) => [...previousValue, normalizeEvent(created)]);
      resetForm();
      setStatus("Calendar event created.");
    } catch (requestError) {
      setError(requestError.message || "Unable to create calendar event.");
    }
  };

  const editEvent = (entry) => {
    setEditingId(entry.id);
    setFormValue({
      title: entry.title || "",
      date: entry.date || "",
      time: entry.time || "",
      type: entry.type || "Study",
      notes: entry.notes || "",
    });
  };

  const removeEvent = async (id) => {
    setStatus("");
    setError("");

    try {
      await apiDelete(`/calendar/${id}`);
      setEvents((previousValue) => previousValue.filter((entry) => entry.id !== id));
      setStatus("Calendar event deleted.");
    } catch (requestError) {
      setError(requestError.message || "Unable to delete calendar event.");
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          Calendar CRUD
        </Typography>
      </Box>

      <RouteStatusBanners success={status} error={error} />

      {loading ? <PageLoadingState rows={3} /> : null}

      {!loading ? (
      <>
      <Card>
        <CardContent>
          <Stack spacing={1} component="form" onSubmit={submitEvent}>
            <TextField
              label="Event title"
              value={formValue.title}
              onChange={(event) => setFormValue((previous) => ({ ...previous, title: event.target.value }))}
              required
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                type="date"
                label="Date"
                InputLabelProps={{ shrink: true }}
                value={formValue.date}
                onChange={(event) => setFormValue((previous) => ({ ...previous, date: event.target.value }))}
                required
              />
              <TextField
                type="time"
                label="Time"
                InputLabelProps={{ shrink: true }}
                value={formValue.time}
                onChange={(event) => setFormValue((previous) => ({ ...previous, time: event.target.value }))}
              />
              <TextField
                select
                label="Type"
                SelectProps={{ native: true }}
                value={formValue.type}
                onChange={(event) => setFormValue((previous) => ({ ...previous, type: event.target.value }))}
              >
                <option value="Study">Study</option>
                <option value="Application">Application</option>
                <option value="Reminder">Reminder</option>
                <option value="Meeting">Meeting</option>
              </TextField>
            </Stack>
            <TextField
              label="Notes"
              value={formValue.notes}
              onChange={(event) => setFormValue((previous) => ({ ...previous, notes: event.target.value }))}
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained">
                {editingId ? "Update event" : "Create event"}
              </Button>
              {editingId ? (
                <Button variant="outlined" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={1.25}>
            Event List ({sortedEvents.length})
          </Typography>
          {sortedEvents.length ? (
            <Stack spacing={1}>
              {sortedEvents.map((entry) => (
                <Box
                  key={entry.id}
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 1.25,
                    backgroundColor: theme.palette.background.alt,
                  })}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {entry.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {entry.date} {entry.time ? `at ${entry.time}` : ""} | {entry.type}
                      </Typography>
                      {entry.notes ? (
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          {entry.notes}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => editEvent(entry)} aria-label={`Edit event ${entry.title}`}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => removeEvent(entry.id)} aria-label={`Delete event ${entry.title}`}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <RouteEmptyState message="No calendar events are scheduled yet." />
          )}
        </CardContent>
      </Card>
      </>
      ) : null}
    </Stack>
  );
};

export default CalendarPage;
