import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  dataAffiliateStat,
  dataOverallStat,
  dataProduct,
  dataProductStat,
  dataTransaction,
  dataUser,
} from "./data/index.js";
import AffiliateStat from "./models/AffiliateStat.js";
import OverallStat from "./models/OverallStat.js";
import Product from "./models/Product.js";
import ProductStat from "./models/ProductStat.js";
import Transaction from "./models/Transaction.js";
import User from "./models/User.js";

dotenv.config();

const models = [AffiliateStat, OverallStat, Product, ProductStat, Transaction, User];

const seedDatabase = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not configured.");
  }

  await mongoose.connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
  });

  await Promise.all(models.map((model) => model.deleteMany({})));

  await User.insertMany(dataUser);
  await Product.insertMany(dataProduct);
  await Transaction.insertMany(dataTransaction);
  await ProductStat.insertMany(dataProductStat);
  await OverallStat.insertMany(dataOverallStat);
  await AffiliateStat.insertMany(dataAffiliateStat);

  console.log(
    JSON.stringify(
      {
        users: dataUser.length,
        products: dataProduct.length,
        transactions: dataTransaction.length,
        productStats: dataProductStat.length,
        overallStats: dataOverallStat.length,
        affiliateStats: dataAffiliateStat.length,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
};

seedDatabase().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});