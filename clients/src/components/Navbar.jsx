import React from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  InputBase,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import { useDispatch } from "react-redux";
import { setMode } from "state";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../auth/SessionContext";
import { apiGetManySettled } from "../config/apiClient";

const toRelativeTime = (value) => {
  if (!value) {
    return "now";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "now";
  }

  const deltaSeconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (deltaSeconds < 60) {
    return "just now";
  }

  if (deltaSeconds < 3600) {
    const minutes = Math.floor(deltaSeconds / 60);
    return `${minutes}m ago`;
  }

  if (deltaSeconds < 86400) {
    const hours = Math.floor(deltaSeconds / 3600);
    return `${hours}h ago`;
  }

  const days = Math.floor(deltaSeconds / 86400);
  return `${days}d ago`;
};

const Navbar = ({ showMenuButton = false, onMenuClick = null }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout, capabilities, roleHomePath } = useSession();
  const [searchValue, setSearchValue] = React.useState("");
  const [notificationAnchorEl, setNotificationAnchorEl] = React.useState(null);
  const [messagesAnchorEl, setMessagesAnchorEl] = React.useState(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = React.useState(null);
  const [notificationItems, setNotificationItems] = React.useState([]);
  const [messageItems, setMessageItems] = React.useState([]);
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [messageCount, setMessageCount] = React.useState(0);
  const hasLoadedTopNavDataRef = React.useRef(false);

  const canUseSearch = Boolean(capabilities?.canAccessSearch);
  const displayLanguage = session?.preferences?.language || "English";

  const displayName = session?.name || "Learner";
  const displayRole = session?.role || "Student";

  const pageTitle = React.useMemo(() => {
    const path = location.pathname || "";

    if (path.startsWith("/superadmin")) {
      if (path.includes("governance")) {
        return "Governance";
      }

      if (path.includes("observability")) {
        return "Observability";
      }

      return "Superadmin";
    }

    if (path.startsWith("/admin")) {
      if (path.includes("operations")) {
        return "Operations";
      }

      return "Admin Dashboard";
    }

    if (path.startsWith("/search")) {
      return "Search";
    }

    if (path.startsWith("/courses")) {
      return "Courses";
    }

    if (path.startsWith("/schools")) {
      return "Schools";
    }

    if (path.startsWith("/financial-aid")) {
      return "Financial Aid";
    }

    if (path.startsWith("/calendar")) {
      return "Calendar";
    }

    if (path.startsWith("/todo")) {
      return "To-do";
    }

    if (path.startsWith("/account")) {
      return "Account";
    }

    return "Dashboard";
  }, [location.pathname]);

  const loadTopNavData = React.useCallback(async () => {
    if (!session?.accessToken) {
      setNotificationItems([]);
      setMessageItems([]);
      setNotificationCount(0);
      setMessageCount(0);
      return;
    }

    const requests = [{ key: "health", path: "/general/health" }];

    if (capabilities?.canAccessTodo) {
      requests.push({ key: "todos", path: "/todos?limit=30" });
    }

    if (capabilities?.canAccessCalendar) {
      requests.push({ key: "calendar", path: "/calendar?limit=12" });
    }

    if (capabilities?.canAccessGovernance) {
      requests.push({ key: "auditEvents", path: "/admin/audit/events?limit=6" });
    }

    try {
      const { data } = await apiGetManySettled(requests);
      const nextNotifications = [];
      const todos = Array.isArray(data.todos) ? data.todos : [];
      const pendingTodos = todos.filter((task) => !task?.done);

      if (pendingTodos.length > 0) {
        nextNotifications.push({
          id: "todo",
          title: `${pendingTodos.length} pending task${pendingTodos.length === 1 ? "" : "s"}`,
          subtitle: "Review and close items in your To-do workspace",
          path: "/todo",
          time: pendingTodos[0]?.updatedAt || pendingTodos[0]?.createdAt || null,
        });
      }

      const calendarEvents = Array.isArray(data.calendar) ? data.calendar : [];
      if (calendarEvents.length > 0) {
        nextNotifications.push({
          id: "calendar",
          title: `${Math.min(calendarEvents.length, 3)} upcoming calendar item${calendarEvents.length === 1 ? "" : "s"}`,
          subtitle: "Check your upcoming timeline and deadlines",
          path: "/calendar",
          time: calendarEvents[0]?.updatedAt || calendarEvents[0]?.date || null,
        });
      }

      const auditEvents = Array.isArray(data.auditEvents) ? data.auditEvents : [];
      if (auditEvents.length > 0) {
        nextNotifications.push({
          id: "governance",
          title: "Governance activity detected",
          subtitle: "Recent privileged actions are available in audit feed",
          path: "/superadmin/governance",
          time: auditEvents[0]?.occurredAt || null,
        });
      }

      if (!nextNotifications.length) {
        nextNotifications.push({
          id: "all-clear",
          title: "All clear",
          subtitle: "No urgent alerts at the moment",
          path: roleHomePath || "/dashboard",
          time: null,
        });
      }

      const nextMessages = [
        {
          id: "account",
          title: "Profile preferences",
          subtitle: "Update your profile and account settings",
          path: "/account",
        },
      ];

      if (capabilities?.canAccessSearch) {
        nextMessages.push({
          id: "search",
          title: "Search workspace",
          subtitle: "Try a focused search query for faster discovery",
          path: "/search",
        });
      }

      if (capabilities?.canAccessCourseDiscovery) {
        nextMessages.push({
          id: "courses",
          title: "Catalog workflow",
          subtitle: "Review and manage course records",
          path: "/courses",
        });
      }

      if (capabilities?.canAccessSchoolComparison) {
        nextMessages.push({
          id: "schools",
          title: "School comparison",
          subtitle: "Inspect and update school profiles",
          path: "/schools",
        });
      }

      if (capabilities?.canAccessObservability) {
        nextMessages.push({
          id: "ops",
          title: "Runtime observability",
          subtitle: "Open telemetry and route health overview",
          path: "/superadmin/observability",
        });
      }

      setNotificationItems(nextNotifications);
      setMessageItems(nextMessages.slice(0, 5));
      setNotificationCount(nextNotifications.some((entry) => entry.id === "all-clear") ? 0 : Math.min(nextNotifications.length, 9));
      setMessageCount(Math.min(nextMessages.length, 9));
    } catch (_requestError) {
      setNotificationItems([
        {
          id: "fallback",
          title: "Notifications temporarily unavailable",
          subtitle: "Open dashboard for latest updates",
          path: roleHomePath || "/dashboard",
          time: null,
        },
      ]);
      setMessageItems([
        {
          id: "fallback-message",
          title: "Messages temporarily unavailable",
          subtitle: "Open account settings for recent activity",
          path: "/account",
        },
      ]);
      setNotificationCount(0);
      setMessageCount(0);
    }
  }, [capabilities, roleHomePath, session?.accessToken]);

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((entry) => entry[0]?.toUpperCase())
    .join("") || "CC";

  React.useEffect(() => {
    if (location.pathname !== "/search") {
      return;
    }

    const query = new URLSearchParams(location.search).get("q") || "";
    setSearchValue(query);
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    if (!session?.accessToken || hasLoadedTopNavDataRef.current) {
      return;
    }

    hasLoadedTopNavDataRef.current = true;
    loadTopNavData();
  }, [loadTopNavData, session?.accessToken]);

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleOpenNotifications = (event) => {
    setNotificationAnchorEl(event.currentTarget);
    loadTopNavData();
  };

  const handleOpenMessages = (event) => {
    setMessagesAnchorEl(event.currentTarget);
    loadTopNavData();
  };

  const handleCloseNotifications = () => {
    setNotificationAnchorEl(null);
  };

  const handleCloseMessages = () => {
    setMessagesAnchorEl(null);
  };

  const handleOpenSettings = (event) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleCloseSettings = () => {
    setSettingsAnchorEl(null);
  };

  const handleMenuNavigation = (path, closeMenu) => {
    if (typeof closeMenu === "function") {
      closeMenu();
    }

    if (path) {
      navigate(path);
    }
  };

  const handleMarkNotificationsRead = () => {
    setNotificationCount(0);
    handleCloseNotifications();
  };

  const handleMarkMessagesRead = () => {
    setMessageCount(0);
    handleCloseMessages();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    if (!canUseSearch) {
      return;
    }

    const normalizedQuery = searchValue.trim();
    const nextPath = normalizedQuery
      ? `/search?q=${encodeURIComponent(normalizedQuery)}`
      : "/search";

    navigate(nextPath);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", gap: { xs: 1, md: 2 }, minHeight: 64 }}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
          {showMenuButton ? (
            <IconButton
              size="small"
              onClick={onMenuClick}
              sx={{ color: theme.palette.text.primary, mr: 0.25 }}
              aria-label="Open navigation menu"
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          ) : null}

          <Box>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontWeight: 800, letterSpacing: 0.65 }}
            >
              COURSE CAMPASS
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.primary,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              {pageTitle}
              <Typography
                component="span"
                variant="caption"
                sx={{
                  px: 0.8,
                  py: 0.15,
                  borderRadius: 10,
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.secondary,
                  display: { xs: "none", sm: "inline-flex" },
                }}
              >
                {displayRole}
              </Typography>
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={{ xs: 1, md: 2 }} minWidth={0}>
          {canUseSearch ? (
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                borderRadius: 6,
                backgroundColor: theme.palette.background.alt,
                border: `1px solid ${theme.palette.divider}`,
                minWidth: { md: 220, lg: 290 },
              }}
            >
              <InputBase
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search courses or schools"
                sx={{ flex: 1, fontSize: 13 }}
                inputProps={{ "aria-label": "Search courses and schools" }}
              />
              <IconButton type="submit" size="small" sx={{ color: theme.palette.text.secondary }}>
                <SearchIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ) : null}

          <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 1 }}>
            <PublicOutlinedIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
              {displayLanguage}
            </Typography>
          </Box>

          <Box
            sx={{
              display: { xs: "none", md: "block" },
              width: 1,
              height: 28,
              bgcolor: theme.palette.divider,
            }}
          />

          <IconButton size="small" sx={{ color: theme.palette.text.primary }} aria-label="Notifications" onClick={handleOpenNotifications}>
            <Badge badgeContent={notificationCount} color="error">
              <NotificationsOutlinedIcon fontSize="small" />
            </Badge>
          </IconButton>

          <IconButton size="small" sx={{ color: theme.palette.text.primary }} aria-label="Messages" onClick={handleOpenMessages}>
            <Badge badgeContent={messageCount} color="primary">
              <MailOutlineIcon fontSize="small" />
            </Badge>
          </IconButton>

          <Box display="flex" alignItems="center" gap={1.25}>
            <IconButton size="small" onClick={() => navigate("/account")} aria-label="Open account settings">
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, fontSize: 13 }}>
                {initials}
              </Avatar>
            </IconButton>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Typography variant="body2" fontWeight={700} lineHeight={1.1}>
                {displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {displayRole}
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            sx={{ color: theme.palette.text.secondary }}
            onClick={handleOpenSettings}
            aria-label="Open settings menu"
          >
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            sx={{ color: theme.palette.text.secondary }}
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <LogoutOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>

      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleCloseNotifications}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 700, color: "text.primary" }}>
          Notifications
        </MenuItem>
        <Divider />
        {notificationItems.map((item) => (
          <MenuItem key={item.id} onClick={() => handleMenuNavigation(item.path, handleCloseNotifications)}>
            <Box>
              <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>
              {item.time ? (
                <Typography variant="caption" color="text.secondary" display="block">{toRelativeTime(item.time)}</Typography>
              ) : null}
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleMarkNotificationsRead}>
          <ListItemIcon>
            <MarkEmailReadOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Mark all as read
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={messagesAnchorEl}
        open={Boolean(messagesAnchorEl)}
        onClose={handleCloseMessages}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled sx={{ opacity: 1, fontWeight: 700, color: "text.primary" }}>
          Messages
        </MenuItem>
        <Divider />
        {messageItems.map((item) => (
          <MenuItem key={item.id} onClick={() => handleMenuNavigation(item.path, handleCloseMessages)}>
            <Box>
              <Typography variant="body2" fontWeight={700}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleMarkMessagesRead}>
          <ListItemIcon>
            <MarkEmailReadOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Mark all as read
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={settingsAnchorEl}
        open={Boolean(settingsAnchorEl)}
        onClose={handleCloseSettings}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          aria-label="Toggle color mode"
          onClick={() => {
            dispatch(setMode());
            handleCloseSettings();
          }}
        >
          <ListItemIcon>
            <DarkModeOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Toggle color mode
        </MenuItem>

        <MenuItem onClick={() => handleMenuNavigation(roleHomePath || "/dashboard", handleCloseSettings)}>
          <ListItemIcon>
            <DashboardOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Go to role dashboard
        </MenuItem>

        <MenuItem onClick={() => handleMenuNavigation("/account", handleCloseSettings)}>
          <ListItemIcon>
            <PersonOutlineOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Account settings
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Navbar;
