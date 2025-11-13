// src/controllers/userActivity.controller.js
import mongoose from "mongoose";
import { UserActivity } from "../models/UserActivity.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Filter builder */
function buildFilter(q) {
  const filter = {};

  if (q.userId && mongoose.isValidObjectId(q.userId)) {
    filter.user = new mongoose.Types.ObjectId(q.userId);
  }
  if (q.activityType) filter.activityType = String(q.activityType);

  if (q.searchId && mongoose.isValidObjectId(q.searchId)) {
    filter.searchId = new mongoose.Types.ObjectId(q.searchId);
  }

  if (q.q) {
    const rx = new RegExp(String(q.q).trim(), "i");
    filter.searchQuery = rx;
  }

  const from = q.from ? new Date(q.from) : null;
  const to   = q.to ? new Date(q.to)   : null;
  if (from || to) {
    filter.timestamp = {};
    if (from && !isNaN(+from)) filter.timestamp.$gte = from;
    if (to && !isNaN(+to))     filter.timestamp.$lte = to;
  }

  return filter;
}

/** Robust sort parser: supports "-timestamp", "timestamp", "field:1", "field:-1" */
function buildSort(sortQ) {
  if (!sortQ) return { timestamp: -1, _id: -1 };
  const sort = {};
  String(sortQ)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(part => {
      let dir = 1;
      let field = part;

      const colonIdx = part.indexOf(":");
      if (colonIdx !== -1) {
        field = part.slice(0, colonIdx);
        const val = part.slice(colonIdx + 1);
        dir = val === "-1" ? -1 : 1;
      }

      if (field.startsWith("-")) {
        field = field.slice(1);
        dir = -1;
      }

      if (field) sort[field] = dir;
    });

  return Object.keys(sort).length ? sort : { timestamp: -1, _id: -1 };
}

/** CREATE */
export const createActivity = asyncHandler(async (req, res) => {
  const {
    user, // optional; fallback to req.user.id
    activityType,
    relatedUserProfileImage,
    searchQuery,
    searchId,
    timestamp,
  } = req.body || {};

  const userId =
    (user && mongoose.isValidObjectId(user) && user) ||
    (req.user?.id && mongoose.isValidObjectId(req.user.id) && req.user.id);

  if (!userId) {
    return res.status(400).json({ success: false, message: "user is required" });
  }
  if (!activityType) {
    return res.status(400).json({ success: false, message: "activityType is required" });
  }

  const payload = {
    user: new mongoose.Types.ObjectId(userId),
    activityType: String(activityType),
    relatedUserProfileImage: relatedUserProfileImage || "",
    searchQuery: searchQuery || "",
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  };

  if (searchId && mongoose.isValidObjectId(searchId)) {
    payload.searchId = new mongoose.Types.ObjectId(searchId);
  }

  const doc = await UserActivity.create(payload);
  res.status(201).json({ success: true, data: doc });
});

/** LIST (populate user fields) */
export const getActivities = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page  || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
  const skip  = (page - 1) * limit;

  const filter = buildFilter(req.query);
  const sort   = buildSort(req.query.sort);

  const [items, total] = await Promise.all([
    UserActivity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "name email userName profileImage status",
        options: { lean: true },
      })
      .lean(),
    UserActivity.countDocuments(filter),
  ]);

  res.json({
    success: true,
    page,
    pageSize: items.length,
    total,
    data: items,
  });
});

/** GET one (populate user fields) */
export const getActivityById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  const item = await UserActivity.findById(id)
    .populate({
      path: "user",
      select: "name email userName profileImage status",
      options: { lean: true },
    })
    .lean();

  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

/** DELETE */
export const deleteActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  const result = await UserActivity.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, deleted: true });
});

/** My feed (populate user fields) */
export const getMyActivities = asyncHandler(async (req, res) => {
  const me = req.user?.id;
  if (!me || !mongoose.isValidObjectId(me)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const page  = Math.max(parseInt(req.query.page  || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
  const skip  = (page - 1) * limit;

  const filter = buildFilter({ ...req.query, userId: me });
  const sort   = buildSort(req.query.sort);

  const [items, total] = await Promise.all([
    UserActivity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "name email userName profileImage status",
        options: { lean: true },
      })
      .lean(),
    UserActivity.countDocuments(filter),
  ]);

  res.json({
    success: true,
    page,
    pageSize: items.length,
    total,
    data: items,
  });
});
