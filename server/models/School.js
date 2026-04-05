import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    website: { type: String, default: "" },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ranking: { type: Number, default: null, min: 1 },
    facilities: [{ type: String }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

schoolSchema.index({ name: 1 });
schoolSchema.index({ country: 1, city: 1 });
schoolSchema.index({ ranking: 1 });
schoolSchema.index({ rating: -1 });

export default mongoose.model("School", schoolSchema);
