// src/models/UserActivity.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const UserActivitySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    activityType: { type: String, required: true, index: true }, // e.g. 'search_created'
    relatedUserProfileImage: { type: String, default: "" },
    searchQuery: { type: String, default: "" },
    searchId: { type: Schema.Types.ObjectId, ref: "searches", default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Helpful compound sort
UserActivitySchema.index({ timestamp: -1, _id: -1 });

export const UserActivity = mongoose.model("useractivities", UserActivitySchema);
