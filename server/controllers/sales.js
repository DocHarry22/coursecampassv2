import AffiliateStat from "../models/AffiliateStat.js";
import OverallStat from "../models/OverallStat.js";
import ProductStat from "../models/ProductStat.js";
import { getFallbackSalesOverview, isDatabaseConnected } from "../utils/fallbackData.js";
import { sendApiResponse } from "../utils/response.js";

export const getSalesOverview = async (req, res) => {
	if (!isDatabaseConnected(req)) {
		sendApiResponse(res, 200, getFallbackSalesOverview(), {
			source: "fallback",
			fallbackReason: "database_unavailable",
		});
		return;
	}

	try {
		const [overallStat, productStatsCount, affiliateStatsCount] = await Promise.all([
			OverallStat.findOne().lean(),
			ProductStat.countDocuments(),
			AffiliateStat.countDocuments(),
		]);

		sendApiResponse(
			res,
			200,
			{
				overallStat,
				productStatsCount,
				affiliateStatsCount,
			},
			{ source: "database" }
		);
	} catch (error) {
		sendApiResponse(res, 200, getFallbackSalesOverview(), {
			source: "fallback",
			fallbackReason: "query_error",
		});
	}
};
