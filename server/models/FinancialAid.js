import mongoose from "mongoose";

const financialAidSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    amountMin: { type: Number, default: 0, min: 0 },
    amountMax: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["open", "review", "ready", "submitted", "closed"], default: "open" },
    deadline: { type: Date, default: null },
    notes: { type: String, default: "" },
    eligibility: [{ type: String }],
    applicationLink: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

financialAidSchema.index({ userId: 1, status: 1, deadline: 1 });
financialAidSchema.index({ provider: 1, status: 1 });
financialAidSchema.index({ amountMin: 1, amountMax: 1 });

export default mongoose.model("FinancialAid", financialAidSchema);
