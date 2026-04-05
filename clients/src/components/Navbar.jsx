import React from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useDispatch, useSelector } from "react-redux";
import { setMode } from "state";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/SessionContext";

const Navbar = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.global.mode);
  const navigate = useNavigate();
  const { session, logout } = useSession();

  const displayName = session?.name || "Learner";
  const displayRole = session?.role || "Student";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((entry) => entry[0]?.toUpperCase())
    .join("") || "CC";

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "#ffffff",
        color: "#1b2a41",
        borderBottom: "1px solid #dbe6f3",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: 2, minHeight: 62 }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
          <Box>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 0.5 }}>
              WELCOME TO COURSE CAMPASS
            </Typography>
            <Typography variant="body2" sx={{ color: "#334155" }}>
              Where we lead you to the right path.
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={{ xs: 1, md: 2 }} minWidth={0}>
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.5,
              borderRadius: 8,
              backgroundColor: "#f5f7fb",
              border: "1px solid #e2e8f0",
              minWidth: 230,
            }}
          >
            <InputBase
              placeholder="Search here..."
              sx={{ flex: 1, fontSize: 13 }}
              inputProps={{ "aria-label": "Search learning data" }}
            />
            <SearchIcon sx={{ color: "#64748b", fontSize: 18 }} />
          </Box>

          <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 1 }}>
            <PublicOutlinedIcon sx={{ fontSize: 18, color: "#475569" }} />
            <Select
              variant="standard"
              disableUnderline
              value={mode === "light" ? "English" : "English"}
              inputProps={{ "aria-label": "Language" }}
              sx={{ fontSize: 13, color: "#334155" }}
            >
              <MenuItem value="English">English</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: { xs: "none", md: "block" }, width: 1, height: 28, bgcolor: "#dbe6f3" }} />

          <IconButton size="small" sx={{ color: "#334155" }} aria-label="Notifications">
            <Badge badgeContent={4} color="error">
              <NotificationsOutlinedIcon fontSize="small" />
            </Badge>
          </IconButton>

          <IconButton size="small" sx={{ color: "#334155" }} aria-label="Messages">
            <Badge badgeContent={5} color="primary">
              <MailOutlineIcon fontSize="small" />
            </Badge>
          </IconButton>

          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: 13 }}>
              {initials}
            </Avatar>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Typography variant="body2" fontWeight={700} lineHeight={1.1}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="#64748b">
                {displayRole}
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            sx={{ color: "#64748b" }}
            onClick={() => dispatch(setMode())}
            aria-label="Toggle color mode"
          >
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>

          <IconButton size="small" sx={{ color: "#64748b" }} onClick={handleSignOut} aria-label="Sign out">
            <LogoutOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
