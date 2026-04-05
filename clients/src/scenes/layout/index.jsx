import React from "react";
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";
import { useSession } from "auth/SessionContext";
import Navbar from "components/Navbar";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChecklistOutlinedIcon from "@mui/icons-material/ChecklistOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";

const navSections = [
    {
        key: "learner",
        title: "Learner",
        sectionCapability: "showLearnerSection",
        items: [
            { label: "Dashboard", icon: DashboardOutlinedIcon, path: "/dashboard", capability: "canAccessDashboard", roleHome: true },
            { label: "Tools", icon: BuildOutlinedIcon, path: "/tools", capability: "canAccessTools" },
            { label: "Financial Aid", icon: SavingsOutlinedIcon, path: "/financial-aid", capability: "canAccessFinancialAid" },
            { label: "Calendar", icon: CalendarMonthOutlinedIcon, path: "/calendar", capability: "canAccessCalendar" },
            { label: "To-do", icon: ChecklistOutlinedIcon, path: "/todo", capability: "canAccessTodo" },
            { label: "Account", icon: PersonOutlineOutlinedIcon, path: "/account", capability: "canAccessAccount" },
        ],
    },
    {
        key: "admin",
        title: "Admin",
        sectionCapability: "showAdminSection",
        items: [
            { label: "Admin Dashboard", icon: AdminPanelSettingsOutlinedIcon, path: "/admin/dashboard", capability: "canAccessAdminDashboard" },
            { label: "Operations", icon: EngineeringOutlinedIcon, path: "/admin/operations", capability: "canAccessAdminOperations" },
            { label: "Search", icon: SearchOutlinedIcon, path: "/search", capability: "canAccessSearch" },
            { label: "Courses", icon: SchoolOutlinedIcon, path: "/courses", capability: "canAccessCourseDiscovery" },
            { label: "Schools", icon: AccountBalanceOutlinedIcon, path: "/schools", capability: "canAccessSchoolComparison" },
        ],
    },
    {
        key: "superadmin",
        title: "Superadmin",
        sectionCapability: "showSuperadminSection",
        items: [
            { label: "Super Dashboard", icon: AdminPanelSettingsOutlinedIcon, path: "/superadmin/dashboard", capability: "canAccessSuperadminDashboard" },
            { label: "Governance", icon: ManageAccountsOutlinedIcon, path: "/superadmin/governance", capability: "canAccessGovernance" },
            { label: "Observability", icon: InsightsOutlinedIcon, path: "/superadmin/observability", capability: "canAccessObservability" },
        ],
    },
];


const Layout = () => {
    const { roleHomePath, capabilities } = useSession();
    const computedNavItems = React.useMemo(
        () =>
            navSections
                .filter((section) => capabilities?.[section.sectionCapability])
                .map((section) => ({
                    ...section,
                    items: section.items
                        .filter((item) => capabilities?.[item.capability])
                        .map((item) => ({
                            ...item,
                            path: item.roleHome ? roleHomePath : item.path,
                        })),
                }))
                .filter((section) => section.items.length > 0),
        [capabilities, roleHomePath]
    );

    return (
        <Box width="100%" minHeight="100vh" bgcolor="#dce9f7">
            <Box
                component="a"
                href="#main-content"
                sx={{
                    position: "absolute",
                    left: -9999,
                    top: "auto",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                    '&:focus': {
                        left: 12,
                        top: 12,
                        width: "auto",
                        height: "auto",
                        zIndex: 10,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: "#ffffff",
                        color: "#0f172a",
                        border: "1px solid #dbe6f3",
                    },
                }}
            >
                Skip to main content
            </Box>
            <Box minHeight="100vh" display="flex">
                <Box
                    sx={{
                        width: { xs: 76, md: 88 },
                        background: "linear-gradient(180deg, #ffb400 0%, #f59e0b 42px, #375a9e 42px, #365b9c 100%)",
                        color: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        pt: 1,
                        pb: 2,
                        boxShadow: "2px 0 14px rgba(22, 52, 104, 0.08)",
                        zIndex: 2,
                    }}
                >
                    <Box width="100%" px={1.25} pb={1.25}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography fontSize={10} fontWeight={800} lineHeight={1.1}>
                                Course Campass
                            </Typography>
                            <IconButton size="small" sx={{ color: "#fff" }} aria-label="Toggle navigation menu">
                                <MenuIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Box>
                    </Box>

                    <Avatar
                        sx={{
                            width: 38,
                            height: 38,
                            bgcolor: "#ffffff",
                            color: "#365b9c",
                            mb: 1.5,
                            border: "2px solid rgba(255,255,255,0.8)",
                        }}
                    >
                        CC
                    </Avatar>

                    <Stack spacing={0.6} width="100%" px={0.75}>
                        {computedNavItems.map((section) => (
                            <Box key={section.key}>
                                <Typography
                                    sx={{
                                        display: { xs: "none", md: "block" },
                                        px: 1.1,
                                        py: 0.6,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: "0.04em",
                                        textTransform: "uppercase",
                                        color: "rgba(248, 251, 255, 0.85)",
                                    }}
                                >
                                    {section.title}
                                </Typography>

                                <Stack spacing={0.4}>
                                    {section.items.map((item) => {
                                        const Icon = item.icon;

                                        return (
                                            <Tooltip title={item.label} placement="right" key={item.label}>
                                                <NavLink to={item.path} style={{ textDecoration: "none" }} aria-label={item.label}>
                                                    {({ isActive }) => (
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 1,
                                                                py: 1.1,
                                                                px: 1.1,
                                                                borderRadius: 2,
                                                                backgroundColor: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                                                                color: "#f8fbff",
                                                                cursor: "pointer",
                                                                '&:hover': {
                                                                    backgroundColor: "rgba(255,255,255,0.12)",
                                                                },
                                                            }}
                                                        >
                                                            <Icon sx={{ fontSize: 16 }} />
                                                            <Typography
                                                                sx={{
                                                                    display: { xs: "none", md: "block" },
                                                                    fontSize: 12,
                                                                    fontWeight: isActive ? 700 : 500,
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {item.label}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </NavLink>
                                            </Tooltip>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                </Box>

                <Box flex={1} minWidth={0}>
                    <Navbar />
                    <Box component="main" id="main-content" px={{ xs: 1.25, md: 2 }} py={{ xs: 1.25, md: 1.75 }}>
                        <Outlet />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default Layout;
