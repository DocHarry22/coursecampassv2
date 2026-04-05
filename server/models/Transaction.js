import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cost: Number,
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  {
    versionKey: false,
  }
);

transactionSchema.index({ userId: 1, _id: -1 });
transactionSchema.index({ userId: 1, cost: 1 });
transactionSchema.index({ cost: 1 });

export default mongoose.model("Transaction", transactionSchema);