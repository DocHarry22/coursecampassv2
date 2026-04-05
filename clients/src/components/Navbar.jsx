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
import { useDispatch, useSelector } from "react-redux";
import { setMode } from "state";

const Navbar = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.global.mode);

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
            <InputBase placeholder="Search here..." sx={{ flex: 1, fontSize: 13 }} />
            <SearchIcon sx={{ color: "#64748b", fontSize: 18 }} />
          </Box>

          <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 1 }}>
            <PublicOutlinedIcon sx={{ fontSize: 18, color: "#475569" }} />
            <Select
              variant="standard"
              disableUnderline
              value={mode === "light" ? "English" : "English"}
              sx={{ fontSize: 13, color: "#334155" }}
            >
              <MenuItem value="English">English</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: { xs: "none", md: "block" }, width: 1, height: 28, bgcolor: "#dbe6f3" }} />

          <IconButton size="small" sx={{ color: "#334155" }}>
            <Badge badgeContent={4} color="error">
              <NotificationsOutlinedIcon fontSize="small" />
            </Badge>
          </IconButton>

          <IconButton size="small" sx={{ color: "#334155" }}>
            <Badge badgeContent={5} color="primary">
              <MailOutlineIcon fontSize="small" />
            </Badge>
          </IconButton>

          <Box display="flex" alignItems="center" gap={1.25}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: 13 }}>
              D
            </Avatar>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Typography variant="body2" fontWeight={700} lineHeight={1.1}>
                DocHar
              </Typography>
              <Typography variant="caption" color="#64748b">
                Student
              </Typography>
            </Box>
          </Box>

          <IconButton size="small" sx={{ color: "#64748b" }} onClick={() => dispatch(setMode())}>
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
