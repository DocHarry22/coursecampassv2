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

productSchema.index({ name: 1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ supply: 1 });

export default mongoose.model("Product", productSchema);