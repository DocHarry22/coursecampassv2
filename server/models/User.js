import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: { type: String, lowercase: true, trim: true },
    password: String,
    passwordHash: String,
    refreshTokenHash: String,
    city: String,
    state: String,
    country: String,
    occupation: String,
    phoneNumber: String,
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
    role: String,
    accountStatus: { type: String, enum: ["active", "suspended", "disabled"], default: "active" },
    accountStatusReason: { type: String, default: "" },
  },
  {
    versionKey: false,
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ name: 1 });
userSchema.index({ country: 1, occupation: 1, role: 1 });
userSchema.index({ role: 1, _id: 1 });
userSchema.index({ accountStatus: 1, role: 1, _id: 1 });

export default mongoose.model("User", userSchema);