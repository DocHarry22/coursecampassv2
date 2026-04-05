import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    price: Number,
    description: String,
    category: String,
    rating: Number,
    supply: Number,
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("Product", productSchema);