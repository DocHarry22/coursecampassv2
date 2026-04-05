import Product from "../models/Product.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import {
	getFallbackDashboardMetrics,
	getFallbackTransactions,
	isDatabaseConnected,
} from "../utils/fallbackData.js";
import { sendApiResponse } from "../utils/response.js";

const defaultTransactionsQueryOptions = {
	limit: 12,
	page: 1,
	offset: null,
	skip: 0,
	sortField: "_id",
	sortOrder: -1,
	filters: {
		userId: null,
		minCost: null,
		maxCost: null,
	},
};

export const getDashboardMetrics = async (req, res) => {
	if (!isDatabaseConnected(req)) {
		sendApiResponse(res, 200, getFallbackDashboardMetrics(), {
			source: "fallback",
			fallbackReason: "database_unavailable",
		});
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

		sendApiResponse(
			res,
			200,
			{
			users,
			products,
			transactions,
			revenue: revenueResult[0]?.revenue ?? 0,
			},
			{ source: "database" }
		);
	} catch (error) {
		sendApiResponse(
			res,
			200,
			{
				...getFallbackDashboardMetrics(),
				message: error.message,
			},
			{
				source: "fallback",
				fallbackReason: "query_error",
			}
		);
	}
};

export const getTransactions = async (req, res) => {
	const queryOptions = req.queryOptions ?? defaultTransactionsQueryOptions;

	if (!isDatabaseConnected(req)) {
		sendApiResponse(res, 200, getFallbackTransactions(queryOptions), {
			source: "fallback",
			fallbackReason: "database_unavailable",
		});
		return;
	}

	try {
		const { limit, skip, sortField, sortOrder, filters } = queryOptions;
		const mongoFilter = {};

		if (filters.userId) {
			mongoFilter.userId = filters.userId;
		}

		if (filters.minCost !== null || filters.maxCost !== null) {
			mongoFilter.cost = {};

			if (filters.minCost !== null) {
				mongoFilter.cost.$gte = filters.minCost;
			}

			if (filters.maxCost !== null) {
				mongoFilter.cost.$lte = filters.maxCost;
			}
		}

		const transactions = await Transaction.find(mongoFilter)
			.sort({ [sortField]: sortOrder })
			.skip(skip)
			.limit(limit)
			.populate("userId", "name email country")
			.lean();

		sendApiResponse(res, 200, transactions, { source: "database" });
	} catch (error) {
		sendApiResponse(res, 200, getFallbackTransactions(queryOptions), {
			source: "fallback",
			fallbackReason: "query_error",
		});
	}
};
