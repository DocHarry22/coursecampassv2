import mongoose from "mongoose";

const monthlyDataSchema = new mongoose.Schema(
  {
    _id: { type: String },
    month: String,
    totalSales: Number,
    totalUnits: Number,
  },
  { _id: false }
);

const dailyDataSchema = new mongoose.Schema(
  {
    date: String,
    totalSales: Number,
    totalUnits: Number,
  },
  { _id: false }
);

const overallStatSchema = new mongoose.Schema(
  {
    totalCustomers: Number,
    yearlySalesTotal: Number,
    yearlyTotalSoldUnits: Number,
    year: Number,
    monthlyData: [monthlyDataSchema],
    dailyData: [dailyDataSchema],
    salesByCategory: {
      type: Map,
      of: Number,
    },
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("OverallStat", overallStatSchema);