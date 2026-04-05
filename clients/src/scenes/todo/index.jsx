import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";

const defaultTaskForm = {
  title: "",
  dueDate: "",
  priority: "Medium",
};

const toDisplayPriority = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "high") {
    return "High";
  }
  if (normalized === "low") {
    return "Low";
  }
  return "Medium";
};

const normalizeTask = (task) => ({
  id: task?._id || task?.id,
  title: task?.title || "",
  dueDate: task?.dueDate ? String(task.dueDate).slice(0, 10) : "",
  priority: toDisplayPriority(task?.priority),
  done: Boolean(task?.completed ?? task?.done),
});

const TodoManagementPage = () => {
  const [tasks, setTasks] = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [formValue, setFormValue] = React.useState(defaultTaskForm);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadTasks = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiGet("/todos?limit=200");
      const rows = Array.isArray(response) ? response : [];
      setTasks(rows.map(normalizeTask));
    } catch (requestError) {
      setError(requestError.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = async (event) => {
    event.preventDefault();

    if (!formValue.title.trim()) {
      return;
    }

    setError("");

    try {
      const created = await apiPost("/todos", {
        title: formValue.title.trim(),
        dueDate: formValue.dueDate || null,
        priority: formValue.priority.toLowerCase(),
        completed: false,
      });

      setTasks((previousValue) => [normalizeTask(created), ...previousValue]);
      setFormValue(defaultTaskForm);
    } catch (requestError) {
      setError(requestError.message || "Unable to create task.");
    }
  };

  const updateTask = async (id, updates) => {
    setError("");

    try {
      const payload = {};

      if (updates.done !== undefined) {
        payload.completed = Boolean(updates.done);
      }

      if (updates.priority !== undefined) {
        payload.priority = String(updates.priority).toLowerCase();
      }

      const updated = await apiPatch(`/todos/${id}`, payload);

      setTasks((previousValue) =>
        previousValue.map((entry) => (entry.id === id ? normalizeTask(updated) : entry))
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to update task.");
    }
  };

  const removeTask = async (id) => {
    setError("");

    try {
      await apiDelete(`/todos/${id}`);
      setTasks((previousValue) => previousValue.filter((entry) => entry.id !== id));
    } catch (requestError) {
      setError(requestError.message || "Unable to delete task.");
    }
  };

  const visibleTasks = tasks.filter((entry) => {
    if (filter === "open") {
      return !entry.done;
    }

    if (filter === "done") {
      return entry.done;
    }

    return true;
  });

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="#64748b" mb={0.5}>
          To-do Management
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? <PageLoadingState rows={3} /> : null}

      {!loading ? (
      <>
      <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
        <CardContent>
          <Stack spacing={1} component="form" onSubmit={createTask}>
            <TextField
              label="Task"
              value={formValue.title}
              onChange={(event) => setFormValue((previous) => ({ ...previous, title: event.target.value }))}
              required
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                type="date"
                label="Due date"
                InputLabelProps={{ shrink: true }}
                value={formValue.dueDate}
                onChange={(event) => setFormValue((previous) => ({ ...previous, dueDate: event.target.value }))}
              />
              <TextField
                select
                label="Priority"
                SelectProps={{ native: true }}
                value={formValue.priority}
                onChange={(event) => setFormValue((previous) => ({ ...previous, priority: event.target.value }))}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </TextField>
              <Button type="submit" variant="contained">
                Add task
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={0.8}>
        {["all", "open", "done"].map((entry) => (
          <Chip
            key={entry}
            label={entry.toUpperCase()}
            clickable
            color={filter === entry ? "primary" : "default"}
            onClick={() => setFilter(entry)}
          />
        ))}
      </Stack>

      <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
            Tasks ({visibleTasks.length})
          </Typography>
          <Stack spacing={1}>
            {visibleTasks.map((task) => (
              <Box key={task.id} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, p: 1, backgroundColor: "#fbfdff" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Checkbox
                      checked={task.done}
                      onChange={(event) => updateTask(task.id, { done: event.target.checked })}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={700} color={task.done ? "#94a3b8" : "#0f172a"} sx={{ textDecoration: task.done ? "line-through" : "none" }}>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="#64748b">
                        {task.dueDate ? `Due ${task.dueDate}` : "No due date"} | {task.priority}
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton size="small" onClick={() => removeTask(task.id)} aria-label={`Delete task ${task.title}`}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
      </>
      ) : null}
    </Stack>
  );
};

export default TodoManagementPage;
