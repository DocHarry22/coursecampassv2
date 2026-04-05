import AffiliateStat from "../models/AffiliateStat.js";
import OverallStat from "../models/OverallStat.js";
import ProductStat from "../models/ProductStat.js";
import { getFallbackSalesOverview, isDatabaseConnected } from "../utils/fallbackData.js";

export const getSalesOverview = async (req, res) => {
	if (!isDatabaseConnected(req)) {
		res.status(200).json(getFallbackSalesOverview());
		return;
	}

	try {
		const [overallStat, productStatsCount, affiliateStatsCount] = await Promise.all([
			OverallStat.findOne().lean(),
			ProductStat.countDocuments(),
			AffiliateStat.countDocuments(),
		]);

		res.status(200).json({
			overallStat,
			productStatsCount,
			affiliateStatsCount,
		});
	} catch (error) {
		res.status(200).json(getFallbackSalesOverview());
	}
};
