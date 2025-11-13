// src/models/Notification.js

import mongoose from "mongoose";

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    // WHAT
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ["announcement", "warning", "update", "promotional"],
      default: "announcement",
      index: true,
    },

    // WHO
    recipientIds: [{ type: Schema.Types.ObjectId, ref: "users", index: true }],
    readBy: [{ type: Schema.Types.ObjectId, ref: "users", index: true }],

    // META
    sentAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: String, default: "admin" }, // ya admin userId rakho agar auth se aa raha hai

    // OPTIONAL analytics
    stats: {
      totalTargets: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },

    // OPTIONAL audience snapshot (future filter debug)
    audience: {
      segment: { type: String, default: "" }, // e.g. "all|active|blocked|specific"
      filters: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ sentAt: -1, _id: -1 });

export const Notification = mongoose.model("notifications", NotificationSchema);
