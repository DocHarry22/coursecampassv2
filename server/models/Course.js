import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    level: { type: String, default: "Beginner" },
    mode: { type: String, enum: ["online", "onsite", "hybrid"], default: "online" },
    durationWeeks: { type: Number, default: 8, min: 1 },
    tuitionFee: { type: Number, default: 0, min: 0 },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

courseSchema.index({ category: 1, level: 1, mode: 1, isActive: 1 });
courseSchema.index({ schoolId: 1, isActive: 1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 1 });

export default mongoose.model("Course", courseSchema);
