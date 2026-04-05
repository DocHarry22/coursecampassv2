import Product from "../models/Product.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import {
	getFallbackDashboardMetrics,
	getFallbackTransactions,
	isDatabaseConnected,
} from "../utils/fallbackData.js";

export const getDashboardMetrics = async (req, res) => {
	if (!isDatabaseConnected(req)) {
		res.status(200).json(getFallbackDashboardMetrics());
		return;
	}

	try {
		const [users, products, transactions, revenueResult] = await Promise.all([
			User.countDocuments(),
			Product.countDocuments(),
			Transaction.countDocuments(),
			Transaction.aggregate([
				{
					$group: {
						_id: null,
						revenue: { $sum: "$cost" },
					},
				},
			]),
		]);

		res.status(200).json({
			users,
			products,
			transactions,
			revenue: revenueResult[0]?.revenue ?? 0,
		});
	} catch (error) {
		res.status(200).json({
			...getFallbackDashboardMetrics(),
			message: error.message,
		});
	}
};

export const getTransactions = async (req, res) => {
	if (!isDatabaseConnected(req)) {
		res.status(200).json(getFallbackTransactions());
		return;
	}

	try {
		const transactions = await Transaction.find()
			.sort({ _id: -1 })
			.limit(12)
			.populate("userId", "name email country")
			.lean();

		res.status(200).json(transactions);
	} catch (error) {
		res.status(200).json(getFallbackTransactions());
	}
};
