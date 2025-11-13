import mongoose from "mongoose";

const { Schema } = mongoose;

const ReportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },      // who reported
    reportedUser: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },  // who is being reported

    reason: {
      type: String,
      enum: ["spam", "harassment", "inappropriate", "fake", "other"],
      default: "other",
      index: true,
    },
    description: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    isCompleted: { type: Boolean, default: false },

    severity: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },

    evidence: { type: [String], default: [] },

    reviewedBy: { type: String, default: "" }, 
    adminNotes: { type: String, default: "" },
    action: { type: String, enum: ["none", "warning", "blocked", "banned"], default: "none" },
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model("reports", ReportSchema);
