import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../../auth/SessionContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useSession();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const destination = location.state?.from || "/dashboard";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login({ email, password, remember });
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box minHeight="100vh" sx={{ background: "linear-gradient(135deg, #dce9f7 0%, #f8fbff 100%)" }} display="grid" placeItems="center" px={2}>
      <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 3, border: "1px solid #dbe6f3", boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)" }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2} component="form" onSubmit={handleSubmit}>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a" mb={0.5}>
                Course Campass Sign In
              </Typography>
              <Typography variant="body2" color="#64748b">
                Session-enabled access to dashboard and planning modules.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              required
              type="email"
              label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@example.com"
            />

            <TextField
              required
              type="password"
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 4 characters"
            />

            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />}
              label="Keep me signed in"
            />

            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>

            <Typography variant="caption" color="#64748b">
              Use a valid seeded user email and password from the backend dataset to start an authenticated session.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
