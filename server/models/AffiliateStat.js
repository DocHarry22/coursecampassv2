import mongoose from "mongoose";

const affiliateStatSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    affiliateSales: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("AffiliateStat", affiliateStatSchema);