import Product from "../models/Product.js";
import User from "../models/User.js";
import { getFallbackCustomers, getFallbackProducts, isDatabaseConnected } from "../utils/fallbackData.js";

export const getCustomers = async (req, res) => {
	if (!isDatabaseConnected(req)) {
		res.status(200).json(getFallbackCustomers());
		return;
	}

	try {
		const customers = await User.find({}, { password: 0 }).sort({ name: 1 }).limit(20).lean();
		res.status(200).json(customers);
	} catch (error) {
		res.status(200).json(getFallbackCustomers());
	}
};

export const getProducts = async (req, res) => {
	if (!isDatabaseConnected(req)) {
		res.status(200).json(getFallbackProducts());
		return;
	}

	try {
		const products = await Product.find().sort({ name: 1 }).limit(20).lean();
		res.status(200).json(products);
	} catch (error) {
		res.status(200).json(getFallbackProducts());
	}
};
