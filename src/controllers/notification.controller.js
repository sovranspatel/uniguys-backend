// src/controllers/notification.controller.js
import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";

/**
 * Make sure Firebase Admin is initialized.
 * Create this file:
 * // src/config/firebaseAdmin.js
 * import admin from "firebase-admin";
 * let app;
 * if (!admin.apps.length) {
 *   let pk = process.env.FIREBASE_PRIVATE_KEY || "";
 *   if (pk.includes("\\n")) pk = pk.replace(/\\n/g, "\n");
 *   admin.initializeApp({
 *     credential: admin.credential.cert({
 *       projectId: process.env.FIREBASE_PROJECT_ID,
 *       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
 *       privateKey: pk,
 *     }),
 *   });
 * }
 * export const fcm = admin.messaging();
 */
import { fcm } from "../config/firebaseAdmin.js";

/* ---------- Utils ---------- */

const isValidId = (id) => mongoose.isValidObjectId(id);
const toObjectIds = (ids = []) =>
  ids.filter(isValidId).map((id) => new mongoose.Types.ObjectId(id));

const chunk = (arr, size = 500) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/* ---------- CREATE (with optional FCM push) ---------- */
/**
 * Supports:
 *  - recipientIds: explicit users (array of ids)
 *  - OR audience.segment: "all" | "active" | "blocked"
 *  - audience.filters: future extension (city/course/etc.)
 */
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type = "announcement", recipientIds = [], audience } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, message: "title and message are required" });
  }

  // 1) Prepare DB document first
  let ids = toObjectIds(recipientIds);

  const doc = await Notification.create({
    title: title.trim(),
    message: message.trim(),
    type,
    recipientIds: ids,
    sentAt: new Date(),
    createdBy: req.user?.id || req.user?.email || "admin",
    stats: { totalTargets: ids.length, success: 0, failed: 0 },
    audience: {
      segment: audience?.segment || (ids.length ? "custom" : "all"),
      filters: audience?.filters || {},
    },
  });

  // 2) Resolve audience → users
  let users = [];
  const segment = audience?.segment || (ids.length ? "custom" : "all");

  if (segment === "custom" && ids.length) {
    users = await User.find({ _id: { $in: ids } }).select("devices settings").lean();
  } else if (segment === "all") {
    users = await User.find({}).select("devices settings").lean();
  } else if (segment === "active") {
    users = await User.find({ status: "active" }).select("devices settings").lean();
  } else if (segment === "blocked") {
    users = await User.find({ status: "blocked" }).select("devices settings").lean();
  } else {
    // fallback: explicit ids if any else empty
    users = ids.length
      ? await User.find({ _id: { $in: ids } }).select("devices settings").lean()
      : [];
  }

  // 3) Collect FCM tokens (respect settings.pushNotifications)
  const tokens = [];
  for (const u of users) {
    const pushAllowed = u?.settings?.pushNotifications !== false;
    if (!pushAllowed) continue;
    (u.devices || []).forEach((d) => {
      if (d?.fcmToken) tokens.push(String(d.fcmToken));
    });
  }
  const uniqueTokens = [...new Set(tokens)];

  // 4) Send push via FCM (if tokens available)
  let success = 0;
  let failed = 0;
  const invalidTokens = new Set();

  if (uniqueTokens.length) {
    const messagePayload = {
      notification: { title, body: message },
      data: {
        type,
        notificationId: String(doc._id),
      },
      android: {
        priority: "high",
        notification: { channelId: "default" },
      },
      apns: {
        payload: {
          aps: { sound: "default" },
        },
      },
    };

    const batches = chunk(uniqueTokens, 500);
    for (const batch of batches) {
      const resp = await fcm.sendEachForMulticast({
        tokens: batch,
        ...messagePayload,
      });

      success += resp.successCount;
      failed += resp.failureCount;

      // mark invalid tokens to purge
      resp.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code || "";
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            invalidTokens.add(batch[idx]);
          }
        }
      });
    }
  }

  // 5) Update stats
  await Notification.findByIdAndUpdate(doc._id, {
    $set: { "stats.success": success, "stats.failed": failed, "stats.totalTargets": users.length },
  });

  // 6) Cleanup invalid tokens from users
  if (invalidTokens.size) {
    await User.updateMany(
      { "devices.fcmToken": { $in: Array.from(invalidTokens) } },
      { $pull: { devices: { fcmToken: { $in: Array.from(invalidTokens) } } } }
    );
  }

  res.status(201).json({
    success: true,
    data: {
      ...doc.toObject(),
      stats: { totalTargets: users.length, success, failed },
      attemptedTokens: uniqueTokens.length,
      invalidTokens: invalidTokens.size,
    },
  });
});

/* ---------- LIST (pagination) ---------- */
export const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Notification.find({}).sort({ sentAt: -1, _id: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({}),
  ]);

  res.json({
    success: true,
    page,
    pageSize: items.length,
    total,
    data: items,
  });
});

/* ---------- DELETE ---------- */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "Invalid id" });

  const result = await Notification.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ success: false, message: "Not found" });

  res.json({ success: true, deleted: true });
});
