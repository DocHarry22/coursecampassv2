import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    password: String,
    city: String,
    state: String,
    country: String,
    occupation: String,
    phoneNumber: String,
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
    role: String,
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("User", userSchema);