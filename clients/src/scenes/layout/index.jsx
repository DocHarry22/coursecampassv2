import React from "react";
import {
    alpha,
  Avatar,
  Box,
    Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
    useMediaQuery,
    useTheme,
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

const SIDEBAR_BACKGROUND = "linear-gradient(180deg, #ffb400 0%, #f59e0b 42px, #375a9e 42px, #365b9c 100%)";


const Layout = () => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const { roleHomePath, capabilities, session } = useSession();
    const sidebarWidth = { xs: 78, md: 92 };
    const expandedSidebarWidth = { xs: 214, md: 236 };
    const profileImageUrl = session?.avatarUrl || session?.profileImageUrl || session?.photoUrl || null;
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = React.useState(isDesktop);
    const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

    React.useEffect(() => {
        setIsDesktopSidebarExpanded(isDesktop);

        if (isDesktop) {
            setIsMobileNavOpen(false);
        }
    }, [isDesktop]);

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

    const handleToggleDesktopSidebar = () => {
        setIsDesktopSidebarExpanded((previousValue) => !previousValue);
    };

    const handleOpenMobileNav = () => {
        setIsMobileNavOpen(true);
    };

    const handleCloseMobileNav = () => {
        setIsMobileNavOpen(false);
    };

    const handleNavItemSelect = () => {
        if (!isDesktop) {
            setIsMobileNavOpen(false);
        }
    };

    const renderNavContent = ({ expanded, onToggle }) => (
        <>
            <Box
                width="100%"
                px={expanded ? 1.25 : 1}
                pb={1}
                sx={{
                    borderBottom: `1px solid ${alpha("#ffffff", 0.22)}`,
                    backgroundColor: alpha("#13356f", 0.13),
                    backdropFilter: "blur(5px)",
                }}
            >
                <Box display="flex" alignItems="center" justifyContent="space-between" minHeight={34}>
                    <Box minWidth={0}>
                        {expanded ? (
                            <Typography fontSize={11} fontWeight={800} lineHeight={1.15} letterSpacing="0.01em">
                                Course Campass
                            </Typography>
                        ) : null}
                        {expanded ? (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: alpha("#ffffff", 0.72),
                                    letterSpacing: "0.04em",
                                }}
                            >
                                Navigation Hub
                            </Typography>
                        ) : null}
                    </Box>
                    <IconButton
                        size="small"
                        onClick={onToggle}
                        sx={{
                            color: "#fff",
                            ml: expanded ? 0 : "auto",
                            border: `1px solid ${alpha("#ffffff", 0.24)}`,
                            backgroundColor: alpha("#ffffff", 0.08),
                            '&:hover': {
                                backgroundColor: alpha("#ffffff", 0.18),
                            },
                        }}
                        aria-label={expanded ? "Collapse navigation menu" : "Expand navigation menu"}
                    >
                        <MenuIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                </Box>
            </Box>

            {profileImageUrl ? (
                <Avatar
                    src={profileImageUrl}
                    alt={session?.name || "User profile"}
                    sx={{
                        width: 42,
                        height: 42,
                        mt: 1,
                        mb: 1.5,
                        border: "2px solid rgba(255,255,255,0.8)",
                        boxShadow: `0 8px 20px ${alpha("#0a1f44", 0.32)}`,
                    }}
                />
            ) : null}

            <Stack
                spacing={0.75}
                width="100%"
                px={expanded ? 1.25 : 0.9}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    pb: 1,
                    '&::-webkit-scrollbar': {
                        width: 6,
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: alpha("#ffffff", 0.35),
                        borderRadius: 99,
                    },
                }}
            >
                {computedNavItems.map((section) => (
                    <Box key={section.key}>
                        {expanded ? (
                            <Box display="flex" alignItems="center" gap={0.8} px={1} py={0.5}>
                                <Typography
                                    sx={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "rgba(248, 251, 255, 0.85)",
                                    }}
                                >
                                    {section.title}
                                </Typography>
                                <Box
                                    flex={1}
                                    height={1}
                                    sx={{
                                        background: `linear-gradient(90deg, ${alpha("#ffffff", 0.28)}, ${alpha("#ffffff", 0.04)})`,
                                    }}
                                />
                            </Box>
                        ) : null}

                        <Stack spacing={0.5}>
                            {section.items.map((item) => {
                                const Icon = item.icon;

                                const linkContent = (
                                    <NavLink
                                        to={item.path}
                                        onClick={handleNavItemSelect}
                                        style={{ textDecoration: "none" }}
                                        aria-label={item.label}
                                    >
                                        {({ isActive }) => (
                                            <Box
                                                sx={{
                                                    position: "relative",
                                                    overflow: "hidden",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: expanded ? "flex-start" : "center",
                                                    gap: 1,
                                                    py: 0.95,
                                                    px: expanded ? 1 : 0.75,
                                                    borderRadius: 2,
                                                    border: `1px solid ${isActive ? alpha("#ffffff", 0.28) : "transparent"}`,
                                                    backgroundColor: isActive ? alpha("#ffffff", 0.22) : alpha("#ffffff", 0.03),
                                                    color: "#f8fbff",
                                                    cursor: "pointer",
                                                    transition: "transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
                                                    transform: isActive ? "translateX(2px)" : "translateX(0)",
                                                    boxShadow: isActive ? `0 10px 20px ${alpha("#0a1f44", 0.25)}` : "none",
                                                    '&::before': {
                                                        content: '""',
                                                        position: "absolute",
                                                        left: 0,
                                                        top: 7,
                                                        bottom: 7,
                                                        width: 3,
                                                        borderRadius: 99,
                                                        backgroundColor: isActive ? alpha("#ffffff", 0.9) : "transparent",
                                                        transition: "background-color 140ms ease",
                                                    },
                                                    '&::after': {
                                                        content: '""',
                                                        position: "absolute",
                                                        inset: 0,
                                                        background: `linear-gradient(120deg, ${alpha("#ffffff", 0)} 0%, ${alpha("#ffffff", 0.14)} 45%, ${alpha("#ffffff", 0)} 100%)`,
                                                        transform: "translateX(-102%)",
                                                        opacity: 0,
                                                        transition: "transform 220ms ease, opacity 220ms ease",
                                                        pointerEvents: "none",
                                                    },
                                                    '&:hover': {
                                                        backgroundColor: alpha("#ffffff", 0.16),
                                                        borderColor: alpha("#ffffff", 0.22),
                                                        transform: "translateX(4px)",
                                                        boxShadow: `0 10px 20px ${alpha("#0a1f44", 0.28)}`,
                                                        '& .nav-icon-shell': {
                                                            backgroundColor: alpha("#ffffff", 0.28),
                                                            transform: "scale(1.05)",
                                                        },
                                                        '&::after': {
                                                            opacity: 1,
                                                            transform: "translateX(0)",
                                                        },
                                                    },
                                                }}
                                            >
                                                <Box
                                                    className="nav-icon-shell"
                                                    sx={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 1.5,
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        backgroundColor: isActive ? alpha("#ffffff", 0.3) : alpha("#ffffff", 0.12),
                                                        border: `1px solid ${isActive ? alpha("#ffffff", 0.3) : alpha("#ffffff", 0.16)}`,
                                                        transition: "transform 160ms ease, background-color 160ms ease",
                                                    }}
                                                >
                                                    <Icon sx={{ fontSize: 17 }} />
                                                </Box>
                                                {expanded ? (
                                                    <Typography
                                                        sx={{
                                                            fontSize: 12.5,
                                                            fontWeight: isActive ? 700 : 600,
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    >
                                                        {item.label}
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                        )}
                                    </NavLink>
                                );

                                return expanded ? (
                                    <Box key={item.label}>{linkContent}</Box>
                                ) : (
                                    <Tooltip title={item.label} placement="right" key={item.label}>
                                        {linkContent}
                                    </Tooltip>
                                );
                            })}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </>
    );

    const currentDesktopSidebarWidth = isDesktopSidebarExpanded ? expandedSidebarWidth : sidebarWidth;

    return (
        <Box width="100%" minHeight="100dvh" bgcolor={theme.palette.background.default}>
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
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.divider}`,
                    },
                }}
            >
                Skip to main content
            </Box>

            {!isDesktop ? (
                <Drawer
                    open={isMobileNavOpen}
                    onClose={handleCloseMobileNav}
                    anchor="left"
                    ModalProps={{ keepMounted: true }}
                    PaperProps={{
                        sx: {
                            width: 250,
                            maxWidth: "80vw",
                            borderRight: "none",
                            background: SIDEBAR_BACKGROUND,
                            boxShadow: `0 24px 38px ${alpha("#091a38", 0.45)}`,
                            color: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            position: "relative",
                            '&::before': {
                                content: '""',
                                position: "absolute",
                                inset: 0,
                                background: `radial-gradient(circle at 12% 4%, ${alpha("#ffffff", 0.2)} 0%, ${alpha("#ffffff", 0)} 38%)`,
                                pointerEvents: "none",
                            },
                        },
                    }}
                >
                    {renderNavContent({ expanded: true, onToggle: handleCloseMobileNav })}
                </Drawer>
            ) : null}

            <Box minHeight="100dvh" display="flex">
                {isDesktop ? (
                    <Box
                        sx={{
                            position: "relative",
                            width: currentDesktopSidebarWidth,
                            minWidth: currentDesktopSidebarWidth,
                            transition: theme.transitions.create(["width", "min-width"], {
                                duration: theme.transitions.duration.shorter,
                            }),
                            background: SIDEBAR_BACKGROUND,
                            color: "#ffffff",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            pt: 1.25,
                            pb: 1,
                            boxShadow: `8px 0 24px ${alpha("#0f2957", 0.24)}`,
                            zIndex: 2,
                            top: 0,
                            height: "100dvh",
                            overflow: "hidden",
                            borderRight: `1px solid ${alpha("#ffffff", 0.16)}`,
                            '&::before': {
                                content: '""',
                                position: "absolute",
                                inset: 0,
                                background: `radial-gradient(circle at 16% 6%, ${alpha("#ffffff", 0.2)} 0%, ${alpha("#ffffff", 0)} 42%)`,
                                pointerEvents: "none",
                            },
                            '&::after': {
                                content: '""',
                                position: "absolute",
                                right: -80,
                                bottom: -84,
                                width: 186,
                                height: 186,
                                borderRadius: "50%",
                                background: `radial-gradient(circle, ${alpha("#ffffff", 0.2)} 0%, ${alpha("#ffffff", 0)} 70%)`,
                                pointerEvents: "none",
                            },
                        }}
                    >
                        {renderNavContent({ expanded: isDesktopSidebarExpanded, onToggle: handleToggleDesktopSidebar })}
                    </Box>
                ) : null}

                <Box flex={1} minWidth={0}>
                    <Navbar showMenuButton={!isDesktop} onMenuClick={handleOpenMobileNav} />
                    <Box
                        component="main"
                        id="main-content"
                        px={{ xs: 1.5, md: 2.5 }}
                        py={{ xs: 1.5, md: 2 }}
                    >
                        <Outlet />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default Layout;
