import React from "react";
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Outlet } from "react-router-dom";
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

const navItems = [
  { label: "Dashboard", icon: DashboardOutlinedIcon, active: true },
  { label: "Search", icon: SearchOutlinedIcon },
  { label: "Tools", icon: BuildOutlinedIcon },
  { label: "Courses", icon: SchoolOutlinedIcon },
  { label: "Schools", icon: AccountBalanceOutlinedIcon },
  { label: "Financial Aid", icon: SavingsOutlinedIcon },
  { label: "Calendar", icon: CalendarMonthOutlinedIcon },
  { label: "To-do", icon: ChecklistOutlinedIcon },
  { label: "Account", icon: PersonOutlineOutlinedIcon },
];


const Layout = () => {
    return (
        <Box width="100%" minHeight="100vh" bgcolor="#dce9f7">
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
                            <IconButton size="small" sx={{ color: "#fff" }}>
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

                    <Stack spacing={0.4} width="100%" px={0.75}>
                        {navItems.map((item) => {
                            const Icon = item.icon;

                            return (
                                <Tooltip title={item.label} placement="right" key={item.label}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            py: 1.1,
                                            px: 1.1,
                                            borderRadius: 2,
                                            backgroundColor: item.active ? "rgba(255,255,255,0.14)" : "transparent",
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
                                                fontWeight: item.active ? 700 : 500,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {item.label}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Stack>
                </Box>

                <Box flex={1} minWidth={0}>
                    <Navbar />
                    <Box px={{ xs: 1.25, md: 2 }} py={{ xs: 1.25, md: 1.75 }}>
                        <Outlet />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default Layout;
