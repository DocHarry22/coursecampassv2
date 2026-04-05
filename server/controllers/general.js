import AffiliateStat from "../models/AffiliateStat.js";
import CalendarEvent from "../models/CalendarEvent.js";
import Course from "../models/Course.js";
import FinancialAid from "../models/FinancialAid.js";
import OverallStat from "../models/OverallStat.js";
import Product from "../models/Product.js";
import School from "../models/School.js";
import Todo from "../models/Todo.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { getFallbackInventory, isDatabaseConnected } from "../utils/fallbackData.js";
import { getObservabilitySnapshot } from "../middleware/observability.js";
import { getRuntimeCollection } from "../utils/runtimeStore.js";
import { sendApiResponse } from "../utils/response.js";
import { normalizeRole } from "../utils/userGovernance.js";

const DASHBOARD_CONTRACT_VERSION = "2026-04-06.dashboard.v1";

const toNumber = (value, fallback = 0) => {
	const cast = Number(value);
	return Number.isFinite(cast) ? cast : fallback;
};

const buildLearnerKpis = ({ todosTotal, todosCompleted, upcomingEvents, activeAidApplications, coursesVisible, schoolsVisible }) => {
	const completionRate = todosTotal > 0 ? Math.round((todosCompleted / todosTotal) * 100) : 0;

	return [
		{
			key: "todoCompletionRate",
			label: "Todo Completion",
			value: completionRate,
			displayAs: "percent",
		},
		{
			key: "upcomingEvents",
			label: "Upcoming Events",
			value: upcomingEvents,
			displayAs: "number",
		},
		{
			key: "activeAidApplications",
			label: "Active Aid Applications",
			value: activeAidApplications,
			displayAs: "number",
		},
		{
			key: "coursesVisible",
			label: "Courses Available",
			value: coursesVisible,
			displayAs: "number",
		},
		{
			key: "schoolsVisible",
			label: "Schools Available",
			value: schoolsVisible,
			displayAs: "number",
		},
	];
};

const buildOperationsKpis = ({ users, products, transactions, revenue, courses, schools }) => [
	{
		key: "totalUsers",
		label: "Total Users",
		value: users,
		displayAs: "number",
	},
	{
		key: "totalProducts",
		label: "Products",
		value: products,
		displayAs: "number",
	},
	{
		key: "totalTransactions",
		label: "Transactions",
		value: transactions,
		displayAs: "number",
	},
	{
		key: "trackedRevenue",
		label: "Tracked Revenue",
		value: revenue,
		displayAs: "currency",
	},
	{
		key: "catalogCourses",
		label: "Catalog Courses",
		value: courses,
		displayAs: "number",
	},
	{
		key: "catalogSchools",
		label: "Catalog Schools",
		value: schools,
		displayAs: "number",
	},
];

const buildGovernanceKpis = ({ superadmins, suspendedUsers, dbStatus, observability }) => [
	{
		key: "superadminCount",
		label: "Superadmins",
		value: superadmins,
		displayAs: "number",
	},
	{
		key: "suspendedUsers",
		label: "Suspended Users",
		value: suspendedUsers,
		displayAs: "number",
	},
	{
		key: "observabilityRequests",
		label: "Observed Requests",
		value: toNumber(observability?.requestsTotal),
		displayAs: "number",
	},
	{
		key: "observabilityErrors",
		label: "Observed Errors",
		value: toNumber(observability?.errorsTotal),
		displayAs: "number",
	},
	{
		key: "databaseStatus",
		label: "Database Status",
		value: dbStatus,
		displayAs: "text",
	},
];

const buildDashboardContractPayload = ({ role, dbStatus, learnerMetrics, operationsMetrics, governanceMetrics }) => ({
	contractVersion: DASHBOARD_CONTRACT_VERSION,
	role,
	generatedAt: new Date().toISOString(),
	sections: {
		learner: {
			kpis: buildLearnerKpis(learnerMetrics),
		},
		operations:
			operationsMetrics === null
				? null
				: {
					kpis: buildOperationsKpis(operationsMetrics),
				},
		governance:
			governanceMetrics === null
				? null
				: {
					kpis: buildGovernanceKpis({
						...governanceMetrics,
						dbStatus,
					}),
				},
	},
});

const getDashboardContractFromDatabase = async (req, role) => {
	const dbStatus = req.app.locals.dbStatus ?? "unknown";
	const now = new Date();
	const userId = String(req.auth.userId);

	const [
		todosTotal,
		todosCompleted,
		upcomingEvents,
		activeAidApplications,
		coursesVisible,
		schoolsVisible,
	] = await Promise.all([
		Todo.countDocuments({ userId }),
		Todo.countDocuments({ userId, completed: true }),
		CalendarEvent.countDocuments({ userId, startAt: { $gte: now } }),
		FinancialAid.countDocuments({ userId, status: { $in: ["open", "review", "ready"] } }),
		Course.countDocuments({ isActive: true }),
		School.countDocuments(),
	]);

	const learnerMetrics = {
		todosTotal,
		todosCompleted,
		upcomingEvents,
		activeAidApplications,
		coursesVisible,
		schoolsVisible,
	};

	let operationsMetrics = null;
	if (role === "admin" || role === "superadmin") {
		const [users, products, transactions, courses, schools, revenueResult] = await Promise.all([
			User.countDocuments(),
			Product.countDocuments(),
			Transaction.countDocuments(),
			Course.countDocuments(),
			School.countDocuments(),
			Transaction.aggregate([
				{
					$group: {
						_id: null,
						revenue: { $sum: "$cost" },
					},
				},
			]),
		]);

		operationsMetrics = {
			users,
			products,
			transactions,
			revenue: revenueResult[0]?.revenue ?? 0,
			courses,
			schools,
		};
	}

	let governanceMetrics = null;
	if (role === "superadmin") {
		const [superadmins, suspendedUsers] = await Promise.all([
			User.countDocuments({ role: "superadmin" }),
			User.countDocuments({ accountStatus: "suspended" }),
		]);

		governanceMetrics = {
			superadmins,
			suspendedUsers,
			observability: getObservabilitySnapshot(req.app),
		};
	}

	return buildDashboardContractPayload({
		role,
		dbStatus,
		learnerMetrics,
		operationsMetrics,
		governanceMetrics,
	});
};

const getDashboardContractFromFallback = (req, role) => {
	const dbStatus = req.app.locals.dbStatus ?? "unknown";
	const now = new Date();
	const userId = String(req.auth.userId);
	const inventory = getFallbackInventory();

	const runtimeTodos = getRuntimeCollection(req, "todos").filter((todo) => String(todo.userId) === userId);
	const runtimeCalendar = getRuntimeCollection(req, "calendarEvents").filter((event) => String(event.userId) === userId);
	const runtimeAid = getRuntimeCollection(req, "financialAids").filter((item) => String(item.userId) === userId);
	const runtimeCourses = getRuntimeCollection(req, "courses");
	const runtimeSchools = getRuntimeCollection(req, "schools");
	const runtimeUsers = getRuntimeCollection(req, "users");

	const learnerMetrics = {
		todosTotal: runtimeTodos.length,
		todosCompleted: runtimeTodos.filter((todo) => Boolean(todo.completed)).length,
		upcomingEvents: runtimeCalendar.filter((event) => {
			const startAt = new Date(event.startAt);
			return !Number.isNaN(startAt.getTime()) && startAt >= now;
		}).length,
		activeAidApplications: runtimeAid.filter((item) => ["open", "review", "ready"].includes(String(item.status || "").toLowerCase())).length,
		coursesVisible: runtimeCourses.length > 0 ? runtimeCourses.length : toNumber(inventory.products),
		schoolsVisible: runtimeSchools.length,
	};

	let operationsMetrics = null;
	if (role === "admin" || role === "superadmin") {
		operationsMetrics = {
			users: runtimeUsers.length > 0 ? runtimeUsers.length : toNumber(inventory.users),
			products: toNumber(inventory.products),
			transactions: toNumber(inventory.transactions),
			revenue: 0,
			courses: learnerMetrics.coursesVisible,
			schools: learnerMetrics.schoolsVisible,
		};
	}

	let governanceMetrics = null;
	if (role === "superadmin") {
		governanceMetrics = {
			superadmins: runtimeUsers.filter((user) => String(user.role || "").toLowerCase() === "superadmin").length,
			suspendedUsers: runtimeUsers.filter((user) => String(user.accountStatus || "").toLowerCase() === "suspended").length,
			observability: getObservabilitySnapshot(req.app),
		};
	}

	return buildDashboardContractPayload({
		role,
		dbStatus,
		learnerMetrics,
		operationsMetrics,
		governanceMetrics,
	});
};

export const getHealth = (req, res) => {
	const dbStatus = req.app.locals.dbStatus ?? "unknown";
	const startedAt = req.app.locals.startedAt ?? null;
	const uptimeSeconds = Math.round(process.uptime());

	sendApiResponse(
		res,
		200,
		{
			status: dbStatus === "connected" || dbStatus === "disabled" ? "ok" : "degraded",
			dbStatus,
			startedAt,
			uptimeSeconds,
			environment: process.env.NODE_ENV || "development",
		},
		{ source: "system" }
	);
};

export const getSummary = (req, res) => {
	const dbStatus = req.app.locals.dbStatus ?? "unknown";

	if (!isDatabaseConnected(req)) {
		const inventory = getFallbackInventory();

		sendApiResponse(
			res,
			200,
			{
				appName: "CourseCompass",
				headline: "Academic operations dashboard",
				dbStatus,
				inventory,
				modules: [
					{ name: "Client", path: "/client", configured: true },
					{ name: "General", path: "/general", configured: true },
					{ name: "Management", path: "/management", configured: true },
					{ name: "Sales", path: "/sales", configured: true },
				],
				recommendations: [
					"MongoDB is currently unavailable, so the API is serving the bundled fallback dataset.",
					"Atlas access can be restored by whitelisting the current IP address in MongoDB Atlas.",
					"Add production build execution outside OneDrive-synced directories for reliability.",
				],
			},
			{
				source: "fallback",
				fallbackReason: "database_unavailable",
			}
		);
		return;
	}

	Promise.all([
		User.countDocuments(),
		Product.countDocuments(),
		Transaction.countDocuments(),
		AffiliateStat.countDocuments(),
		OverallStat.countDocuments(),
	])
		.then(([users, products, transactions, affiliateStats, overallStats]) => {
			sendApiResponse(
				res,
				200,
				{
					appName: "CourseCompass",
					headline: "Academic operations dashboard",
					dbStatus,
					inventory: {
						users,
						products,
						transactions,
						affiliateStats,
						overallStats,
					},
					modules: [
						{
							name: "Client",
							path: "/client",
							configured: true,
						},
						{
							name: "General",
							path: "/general",
							configured: true,
						},
						{
							name: "Management",
							path: "/management",
							configured: true,
						},
						{
							name: "Sales",
							path: "/sales",
							configured: true,
						},
					],
					recommendations: [
						dbStatus !== "connected"
							? "Restore MongoDB connectivity for data-backed routes."
							: "Database connectivity is healthy.",
						users === 0 ? "Run npm run seed in the server folder to load the sample dataset." : "Sample dataset is loaded and ready for UI wiring.",
						"Add production build execution outside OneDrive-synced directories for reliability.",
					],
				},
				{ source: "database" }
			);
		})
		.catch((error) => {
			const inventory = getFallbackInventory();

			sendApiResponse(
				res,
				200,
				{
					appName: "CourseCompass",
					headline: "Academic operations dashboard",
					dbStatus: "disconnected",
					inventory,
					modules: [
						{ name: "Client", path: "/client", configured: true },
						{ name: "General", path: "/general", configured: true },
						{ name: "Management", path: "/management", configured: true },
						{ name: "Sales", path: "/sales", configured: true },
					],
					recommendations: [
						"MongoDB query failed, so the API fell back to the bundled dataset.",
						"Atlas access can be restored by whitelisting the current IP address in MongoDB Atlas.",
						"Add production build execution outside OneDrive-synced directories for reliability.",
					],
					message: error.message,
				},
				{
					source: "fallback",
					fallbackReason: "query_error",
				}
			);
		});
};

export const getReadiness = (req, res) => {
	const dbStatus = req.app.locals.dbStatus ?? "unknown";
	const isShuttingDown = Boolean(req.app.locals.isShuttingDown);
	const ready = !isShuttingDown && (dbStatus === "connected" || dbStatus === "disabled");

	sendApiResponse(
		res,
		ready ? 200 : 503,
		{
			status: ready ? "ready" : "not_ready",
			dbStatus,
			isShuttingDown,
			timestamp: new Date().toISOString(),
		},
		{ source: "system" }
	);
};

export const getMetrics = (req, res) => {
	const snapshot = getObservabilitySnapshot(req.app);

	sendApiResponse(
		res,
		200,
		{
			service: "coursecampass-api",
			environment: process.env.NODE_ENV || "development",
			dbStatus: req.app.locals.dbStatus ?? "unknown",
			observability: snapshot,
		},
		{ source: "system" }
	);
};

export const getDashboardContract = async (req, res) => {
	const role = normalizeRole(req.auth?.role);

	if (!isDatabaseConnected(req)) {
		sendApiResponse(res, 200, getDashboardContractFromFallback(req, role), {
			source: "fallback",
			fallbackReason: "database_unavailable",
		});
		return;
	}

	try {
		const payload = await getDashboardContractFromDatabase(req, role);
		sendApiResponse(res, 200, payload, { source: "database" });
	} catch (error) {
		sendApiResponse(res, 200, getDashboardContractFromFallback(req, role), {
			source: "fallback",
			fallbackReason: "query_error",
		});
	}
};
