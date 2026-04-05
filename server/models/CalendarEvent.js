import mongoose from "mongoose";

const calendarEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    category: { type: String, default: "general" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

calendarEventSchema.index({ userId: 1, startAt: 1, endAt: 1 });
calendarEventSchema.index({ userId: 1, category: 1, startAt: 1 });

export default mongoose.model("CalendarEvent", calendarEventSchema);
