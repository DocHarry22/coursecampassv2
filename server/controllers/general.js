import AffiliateStat from "../models/AffiliateStat.js";
import OverallStat from "../models/OverallStat.js";
import Product from "../models/Product.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { getFallbackInventory, isDatabaseConnected } from "../utils/fallbackData.js";

export const getHealth = (req, res) => {
	const dbStatus = req.app.locals.dbStatus ?? "unknown";
	const startedAt = req.app.locals.startedAt ?? null;
	const uptimeSeconds = Math.round(process.uptime());

	res.status(200).json({
		status: dbStatus === "connected" || dbStatus === "disabled" ? "ok" : "degraded",
		dbStatus,
		startedAt,
		uptimeSeconds,
		environment: process.env.NODE_ENV || "development",
	});
};

export const getSummary = (req, res) => {
	const dbStatus = req.app.locals.dbStatus ?? "unknown";

	if (!isDatabaseConnected(req)) {
		const inventory = getFallbackInventory();

		res.status(200).json({
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
		});
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
			res.status(200).json({
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
			});
		})
		.catch((error) => {
			const inventory = getFallbackInventory();

			res.status(200).json({
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
			});
		});
};
