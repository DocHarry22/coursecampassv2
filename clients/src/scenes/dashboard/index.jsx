import React from "react";
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import { getApiBaseUrl } from "../../config/api";

const statCards = [
    { label: "Courses", value: 23, icon: SchoolOutlinedIcon, accent: "#f97316" },
    { label: "Schools", value: 15, icon: AccountBalanceOutlinedIcon, accent: "#65a30d" },
    { label: "APS SCORE", value: 35, icon: WorkspacePremiumOutlinedIcon, accent: "#1d4ed8" },
    { label: "Financial Aids", value: 8, icon: SavingsOutlinedIcon, accent: "#1e3a8a" },
    { label: "Jobs", value: 23, icon: WorkOutlineOutlinedIcon, accent: "#7e22ce" },
];

const topCourses = [
    { name: "Computer Science", progress: 88 },
    { name: "Accounting", progress: 72 },
    { name: "Engineering", progress: 69 },
    { name: "Medicine", progress: 61 },
    { name: "Education", progress: 56 },
];

const calendarGroups = [
    { day: "Mon", items: ["Exam prep", "Apply", "Research"] },
    { day: "Tue", items: ["Aid forms", "Sport", "Bursaries"] },
    { day: "Wed", items: ["Visit", "Register", "Results"] },
];

const financialAidList = [
    { name: "NSFAS", amount: "R45k", status: "Open" },
    { name: "Merit Award", amount: "R20k", status: "Review" },
    { name: "Campus Grant", amount: "R12k", status: "Ready" },
    { name: "Tech Bursary", amount: "R18k", status: "Open" },
];

const todoItems = [
    "Upload Grade 11 results",
    "Compare APS requirements",
    "Submit funding application",
    "Book school visit",
];

const Dashboard = () => {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [health, setHealth] = React.useState(null);
    const [summary, setSummary] = React.useState(null);
    const [metrics, setMetrics] = React.useState(null);
    const [recentTransactions, setRecentTransactions] = React.useState([]);

    const loadDashboard = async () => {
        setLoading(true);
        setError("");

        try {
            const apiBaseUrl = getApiBaseUrl();

            const [healthResponse, summaryResponse, metricsResponse, transactionsResponse] = await Promise.all([
                fetch(`${apiBaseUrl}/general/health`),
                fetch(`${apiBaseUrl}/general/summary`),
                fetch(`${apiBaseUrl}/management/dashboard`),
                fetch(`${apiBaseUrl}/management/transactions`),
            ]);

            if (!healthResponse.ok || !summaryResponse.ok || !metricsResponse.ok || !transactionsResponse.ok) {
                throw new Error("Unable to load dashboard data.");
            }

            const [healthPayload, summaryPayload, metricsPayload, transactionsPayload] = await Promise.all([
                healthResponse.json(),
                summaryResponse.json(),
                metricsResponse.json(),
                transactionsResponse.json(),
            ]);

            setHealth(healthPayload);
            setSummary(summaryPayload);
            setMetrics(metricsPayload);
            setRecentTransactions(transactionsPayload);
        } catch (requestError) {
            setError(requestError.message || "Unable to reach the API.");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadDashboard();
    }, []);

    return (
        <Stack spacing={1.5}>
            <Box>
                <Typography variant="body2" color="#64748b" mb={0.5}>
                    Dashboard
                </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {loading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress color="secondary" />
                </Box>
            ) : null}

            {!loading && health && summary ? (
                <>
                    <Box
                        display="grid"
                        gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" }}
                        gap={1.5}
                    >
                        {statCards.map((card) => {
                            const Icon = card.icon;

                            return (
                                <Card
                                    key={card.label}
                                    sx={{
                                        backgroundImage: "none",
                                        borderRadius: 2.5,
                                        boxShadow: "none",
                                        border: "1px solid #dbe6f3",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    <Box sx={{ position: "absolute", inset: 0, borderTop: `4px solid ${card.accent}` }} />
                                    <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2, px: 2.25 }}>
                                        <Box
                                            sx={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: 2,
                                                display: "grid",
                                                placeItems: "center",
                                                backgroundColor: `${card.accent}15`,
                                                color: card.accent,
                                            }}
                                        >
                                            <Icon fontSize="small" />
                                        </Box>
                                        <Box textAlign="right">
                                            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                                                {card.label}
                                            </Typography>
                                            <Typography variant="h4" fontWeight={800} color="#1e293b">
                                                {card.value}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>

                    <Box
                        display="grid"
                        gridTemplateColumns={{ xs: "1fr", lg: "1.25fr 1fr 1.2fr 0.8fr" }}
                        gridTemplateRows={{ xs: "auto", lg: "1fr 1fr" }}
                        gap={1.5}
                    >
                        <Card
                            sx={{
                                backgroundImage: "none",
                                borderRadius: 2.5,
                                boxShadow: "none",
                                border: "1px solid #dbe6f3",
                                gridRow: { lg: "span 2" },
                                minHeight: 300,
                            }}
                        >
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={2}>
                                    Top Courses
                                </Typography>
                                <Stack spacing={2}>
                                    {topCourses.map((course) => (
                                        <Box key={course.name}>
                                            <Box display="flex" justifyContent="space-between" mb={0.75}>
                                                <Typography variant="body2" fontWeight={600} color="#1e293b">
                                                    {course.name}
                                                </Typography>
                                                <Typography variant="caption" color="#64748b">
                                                    {course.progress}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={course.progress}
                                                sx={{
                                                    height: 9,
                                                    borderRadius: 999,
                                                    backgroundColor: "#edf2f7",
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 999,
                                                        background: "linear-gradient(90deg, #f59e0b 0%, #fb7185 100%)",
                                                    },
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card
                            sx={{
                                backgroundImage: "none",
                                borderRadius: 2.5,
                                boxShadow: "none",
                                border: "1px solid #dbe6f3",
                                minHeight: 150,
                            }}
                        >
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.5}>
                                    Calendar Events
                                </Typography>
                                <Box display="grid" gridTemplateColumns="repeat(3, minmax(0, 1fr))" gap={1.5}>
                                    {calendarGroups.map((group) => (
                                        <Box key={group.day}>
                                            <Chip
                                                label={group.day}
                                                size="small"
                                                sx={{
                                                    mb: 1,
                                                    height: 22,
                                                    backgroundColor: group.day === "Wed" ? "#0284c7" : "#e2e8f0",
                                                    color: group.day === "Wed" ? "#fff" : "#475569",
                                                    fontWeight: 700,
                                                }}
                                            />
                                            <Stack spacing={0.45}>
                                                {group.items.map((item) => (
                                                    <Typography key={item} variant="caption" color="#334155">
                                                        {item}
                                                    </Typography>
                                                ))}
                                            </Stack>
                                        </Box>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>

                        <Card
                            sx={{
                                backgroundImage: "none",
                                borderRadius: 2.5,
                                boxShadow: "none",
                                border: "1px solid #dbe6f3",
                                gridRow: { lg: "span 2" },
                                minHeight: 300,
                            }}
                        >
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.5}>
                                    Top Financial Aid
                                </Typography>
                                <Stack spacing={1.25}>
                                    {financialAidList.map((item) => (
                                        <Box
                                            key={item.name}
                                            sx={{
                                                border: "1px solid #e2e8f0",
                                                borderRadius: 2,
                                                p: 1.25,
                                                backgroundColor: "#fbfdff",
                                            }}
                                        >
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                <Typography variant="body2" fontWeight={700} color="#1e293b">
                                                    {item.name}
                                                </Typography>
                                                <Chip
                                                    label={item.status}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        backgroundColor: item.status === "Ready" ? "#dcfce7" : "#e0f2fe",
                                                        color: item.status === "Ready" ? "#166534" : "#075985",
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="#64748b">
                                                Average award {item.amount}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card
                            sx={{
                                backgroundImage: "none",
                                borderRadius: 2.5,
                                boxShadow: "none",
                                border: "1px solid #dbe6f3",
                                gridRow: { lg: "span 2" },
                                minHeight: 300,
                            }}
                        >
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.5}>
                                    To-Do List
                                </Typography>
                                <Stack spacing={1.1}>
                                    {todoItems.map((item) => (
                                        <Box key={item} sx={{ p: 1.1, borderRadius: 2, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                            <Typography variant="body2" color="#334155">
                                                {item}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Card
                            sx={{
                                backgroundImage: "none",
                                borderRadius: 2.5,
                                boxShadow: "none",
                                border: "1px solid #dbe6f3",
                                minHeight: 150,
                            }}
                        >
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.5}>
                                    Map
                                </Typography>
                                <Box
                                    sx={{
                                        height: 130,
                                        borderRadius: 2,
                                        background:
                                            "radial-gradient(circle at 20% 35%, #94a3b8 0 18px, transparent 19px), radial-gradient(circle at 34% 42%, #cbd5e1 0 16px, transparent 17px), radial-gradient(circle at 46% 40%, #bfdbfe 0 22px, transparent 23px), radial-gradient(circle at 58% 45%, #93c5fd 0 20px, transparent 21px), radial-gradient(circle at 72% 38%, #1d4ed8 0 18px, transparent 19px), radial-gradient(circle at 78% 54%, #64748b 0 22px, transparent 23px), linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%)",
                                        border: "1px solid #dbe6f3",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    <Typography variant="caption" sx={{ position: "absolute", bottom: 8, right: 10, color: "#64748b" }}>
                                        National interest heatmap
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1.6fr 1fr" }} gap={1.5}>
                        <Card sx={{ backgroundImage: "none", borderRadius: 2.5, boxShadow: "none", border: "1px solid #dbe6f3" }}>
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.5}>
                                    Recent activity
                                </Typography>
                                <List disablePadding>
                                    {recentTransactions.slice(0, 6).map((transaction) => (
                                        <ListItem key={transaction._id} disableGutters divider>
                                            <ListItemText
                                                primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}
                                                secondaryTypographyProps={{ fontSize: 12, color: "#64748b" }}
                                                primary={transaction.userId?.name || "Unknown user"}
                                                secondary={`${transaction.userId?.email || "No email"} | $${Number(transaction.cost).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>

                        <Card sx={{ backgroundImage: "none", borderRadius: 2.5, boxShadow: "none", border: "1px solid #dbe6f3" }}>
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={1.5}>
                                    System status
                                </Typography>
                                <Stack spacing={1.25}>
                                    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                        <Typography variant="caption" color="#64748b">Database</Typography>
                                        <Typography variant="h6" fontWeight={800} color="#1e293b">{health.dbStatus}</Typography>
                                    </Box>
                                    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                        <Typography variant="caption" color="#64748b">Live inventory</Typography>
                                        <Typography variant="body2" color="#1e293b">{summary.inventory.users} users, {summary.inventory.products} products</Typography>
                                    </Box>
                                    {metrics ? (
                                        <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                            <Typography variant="caption" color="#64748b">Revenue tracked</Typography>
                                            <Typography variant="h6" fontWeight={800} color="#1e293b">${Number(metrics.revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography>
                                        </Box>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>
                </>
            ) : null}
        </Stack>
    );
};

export default Dashboard;