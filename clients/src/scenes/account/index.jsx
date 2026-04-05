import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../auth/SessionContext";
import { apiGet, apiPatch } from "../../config/apiClient";

const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { session, updateSessionProfile, logout } = useSession();
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [health, setHealth] = React.useState(null);
  const [loadingHealth, setLoadingHealth] = React.useState(true);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [formValue, setFormValue] = React.useState({
    name: session?.name || "",
    email: session?.email || "",
    language: session?.preferences?.language || "English",
    timezone: session?.preferences?.timezone || "Africa/Johannesburg",
    marketingUpdates: Boolean(session?.preferences?.marketingUpdates),
  });

  React.useEffect(() => {
    const loadPageData = async () => {
      setLoadingProfile(true);
      setLoadingHealth(true);

      try {
        const [profileResponse, healthResponse] = await Promise.all([
          apiGet("/account/profile"),
          apiGet("/general/health"),
        ]);

        const user = profileResponse?.user || null;

        if (user) {
          setFormValue((previous) => ({
            ...previous,
            name: user.name || "",
            email: user.email || "",
          }));
        }

        setHealth(healthResponse);
      } catch (_requestError) {
        setHealth(null);
      } finally {
        setLoadingProfile(false);
        setLoadingHealth(false);
      }
    };

    loadPageData();
  }, []);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      await apiPatch("/account/profile", {
        name: formValue.name,
        email: formValue.email,
      });

      updateSessionProfile({
        name: formValue.name,
        email: formValue.email,
        preferences: {
          language: formValue.language,
          timezone: formValue.timezone,
          marketingUpdates: formValue.marketingUpdates,
        },
      });
      setStatus("Profile saved.");
    } catch (requestError) {
      setError(requestError.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="#64748b" mb={0.5}>
          Account Settings
        </Typography>
      </Box>

      {status ? <Alert severity="success">{status}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={1.25}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
                Profile and Preferences
              </Typography>
              <Stack spacing={1.1} component="form" onSubmit={saveSettings}>
                <TextField
                  label="Full name"
                  value={formValue.name}
                  onChange={(event) => setFormValue((previous) => ({ ...previous, name: event.target.value }))}
                />
                <TextField
                  type="email"
                  label="Email"
                  value={formValue.email}
                  onChange={(event) => setFormValue((previous) => ({ ...previous, email: event.target.value }))}
                />
                <TextField
                  label="Language"
                  value={formValue.language}
                  onChange={(event) => setFormValue((previous) => ({ ...previous, language: event.target.value }))}
                />
                <TextField
                  label="Timezone"
                  value={formValue.timezone}
                  onChange={(event) => setFormValue((previous) => ({ ...previous, timezone: event.target.value }))}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValue.marketingUpdates}
                      onChange={(event) =>
                        setFormValue((previous) => ({ ...previous, marketingUpdates: event.target.checked }))
                      }
                    />
                  }
                  label="Receive reminder and marketing updates"
                />
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={saving || loadingProfile}>
                    {saving ? "Saving..." : "Save settings"}
                  </Button>
                  <Button color="error" variant="outlined" onClick={signOut}>
                    Sign out
                  </Button>
                </Stack>
                {loadingProfile ? (
                  <Typography variant="caption" color="#64748b">
                    Loading account profile...
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ border: "1px solid #dbe6f3", boxShadow: "none", borderRadius: 2.5 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.25}>
                Session Summary
              </Typography>
              <Typography variant="body2" color="#475569">ID: {session?.id || "n/a"}</Typography>
              <Typography variant="body2" color="#475569">Role: {session?.role || "n/a"}</Typography>
              <Typography variant="body2" color="#475569">Logged in at: {session?.loggedInAt || "n/a"}</Typography>

              <Box mt={1.5}>
                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={0.8}>
                  System Health
                </Typography>
                {loadingHealth ? (
                  <CircularProgress size={18} />
                ) : (
                  <>
                    <Typography variant="body2" color="#475569">
                      Status: {health?.status || "unknown"}
                    </Typography>
                    <Typography variant="body2" color="#475569">
                      Database: {health?.dbStatus || "unknown"}
                    </Typography>
                    <Typography variant="body2" color="#475569">
                      Environment: {health?.environment || "unknown"}
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AccountSettingsPage;
