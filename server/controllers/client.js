import Product from "../models/Product.js";
import User from "../models/User.js";
import { getFallbackCustomers, getFallbackProducts, isDatabaseConnected } from "../utils/fallbackData.js";
import { sendApiResponse } from "../utils/response.js";

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const defaultCustomerQueryOptions = {
  limit: 20,
  page: 1,
  offset: null,
  skip: 0,
  sortField: "name",
  sortOrder: 1,
  filters: {
    country: null,
    occupation: null,
    role: null,
    search: null,
  },
};

const defaultProductQueryOptions = {
  limit: 20,
  page: 1,
  offset: null,
  skip: 0,
  sortField: "name",
  sortOrder: 1,
  filters: {
    category: null,
    search: null,
    minPrice: null,
    maxPrice: null,
  },
};

export const getCustomers = async (req, res) => {
	const queryOptions = req.queryOptions ?? defaultCustomerQueryOptions;

	if (!isDatabaseConnected(req)) {
		sendApiResponse(res, 200, getFallbackCustomers(queryOptions), {
			source: "fallback",
			fallbackReason: "database_unavailable",
		});
		return;
	}

	try {
		const { limit, skip, sortField, sortOrder, filters } = queryOptions;
		const mongoFilter = {};

		if (filters.country) {
			mongoFilter.country = new RegExp(`^${escapeRegExp(filters.country)}$`, "i");
		}

		if (filters.occupation) {
			mongoFilter.occupation = new RegExp(`^${escapeRegExp(filters.occupation)}$`, "i");
		}

		if (filters.role) {
			mongoFilter.role = new RegExp(`^${escapeRegExp(filters.role)}$`, "i");
		}

		if (filters.search) {
			const searchExpr = new RegExp(escapeRegExp(filters.search), "i");
			mongoFilter.$or = [{ name: searchExpr }, { email: searchExpr }];
		}

		const customers = await User.find(mongoFilter, { password: 0 })
			.sort({ [sortField]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean();

		sendApiResponse(res, 200, customers, { source: "database" });
	} catch (error) {
		sendApiResponse(res, 200, getFallbackCustomers(queryOptions), {
			source: "fallback",
			fallbackReason: "query_error",
		});
	}
};

export const getProducts = async (req, res) => {
	const queryOptions = req.queryOptions ?? defaultProductQueryOptions;

	if (!isDatabaseConnected(req)) {
		sendApiResponse(res, 200, getFallbackProducts(queryOptions), {
			source: "fallback",
			fallbackReason: "database_unavailable",
		});
		return;
	}

	try {
		const { limit, skip, sortField, sortOrder, filters } = queryOptions;
		const mongoFilter = {};

		if (filters.category) {
			mongoFilter.category = new RegExp(`^${escapeRegExp(filters.category)}$`, "i");
		}

		if (filters.minPrice !== null || filters.maxPrice !== null) {
			mongoFilter.price = {};

			if (filters.minPrice !== null) {
				mongoFilter.price.$gte = filters.minPrice;
			}

			if (filters.maxPrice !== null) {
				mongoFilter.price.$lte = filters.maxPrice;
			}
		}

		if (filters.search) {
			const searchExpr = new RegExp(escapeRegExp(filters.search), "i");
			mongoFilter.$or = [{ name: searchExpr }, { description: searchExpr }];
		}

		const products = await Product.find(mongoFilter)
			.sort({ [sortField]: sortOrder })
			.skip(skip)
			.limit(limit)
			.lean();

		sendApiResponse(res, 200, products, { source: "database" });
	} catch (error) {
		sendApiResponse(res, 200, getFallbackProducts(queryOptions), {
			source: "fallback",
			fallbackReason: "query_error",
		});
	}
};
