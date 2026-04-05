import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, default: null },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

todoSchema.index({ userId: 1, completed: 1, priority: 1, dueDate: 1 });
todoSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Todo", todoSchema);
