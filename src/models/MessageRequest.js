// src/models/MessageRequest.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const MessageRequestSchema = new Schema(
  {
    sender:    { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },

    // Texts (optionally keep both; your sample had senderMessage/receiverMessage)
    message:         { type: String, default: "" },
    senderMessage:   { type: String, default: "" },
    receiverMessage: { type: String, default: "" },

    // Current state of the request
    status: {
      type: String,
      enum: ["messaged", "pending", "accepted", "declined", "blocked"],
      default: "messaged",
      index: true,
    },

    // Timestamps
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Helpful indexes
MessageRequestSchema.index({ createdAt: -1, _id: -1 });

export const MessageRequest = mongoose.model("messagerequests", MessageRequestSchema);
