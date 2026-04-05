import mongoose from "mongoose";

const productMonthlyDataSchema = new mongoose.Schema(
  {
    month: String,
    totalSales: Number,
    totalUnits: Number,
  },
  { _id: false }
);

const productDailyDataSchema = new mongoose.Schema(
  {
    date: String,
    totalSales: Number,
    totalUnits: Number,
  },
  { _id: false }
);

const productStatSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    yearlySalesTotal: Number,
    yearlyTotalSoldUnits: Number,
    monthlyData: [productMonthlyDataSchema],
    dailyData: [productDailyDataSchema],
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("ProductStat", productStatSchema);