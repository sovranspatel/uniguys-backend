import mongoose from "mongoose";
import { Report } from "../models/Report.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/* ------------ helpers ------------ */
function buildFilter(q) {
  const f = {};
  if (q.status) f.status = String(q.status);
  if (q.reason) f.reason = String(q.reason);
  if (q.severity) f.severity = String(q.severity);

  if (q.reporter && mongoose.isValidObjectId(q.reporter)) {
    f.reporter = new mongoose.Types.ObjectId(q.reporter);
  }
  if (q.reportedUser && mongoose.isValidObjectId(q.reportedUser)) {
    f.reportedUser = new mongoose.Types.ObjectId(q.reportedUser);
  }

  if (q.q) {
    const rx = new RegExp(String(q.q).trim(), "i");
    // search in description
    f.$or = [{ description: rx }];
  }

  // date range
  const from = q.from ? new Date(q.from) : null;
  const to = q.to ? new Date(q.to) : null;
  if (from || to) {
    f.createdAt = {};
    if (from && !isNaN(+from)) f.createdAt.$gte = from;
    if (to && !isNaN(+to)) f.createdAt.$lte = to;
  }

  return f;
}

function buildSort(sortQ) {
  if (!sortQ) return { createdAt: -1, _id: -1 };
  const sort = {};
  String(sortQ)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (part.startsWith("-")) sort[part.slice(1)] = -1;
      else sort[part] = 1;
    });
  return Object.keys(sort).length ? sort : { createdAt: -1, _id: -1 };
}

/* ------------ CREATE ------------ */
export const createReport = asyncHandler(async (req, res) => {
  const {
    reporter,     
    reportedUser,
    reason = "other",
    description = "",
    evidence = [],
    severity = "medium",
  } = req.body || {};

  const reporterId =
    (reporter && mongoose.isValidObjectId(reporter) && reporter) ||
    (req.user?.id && mongoose.isValidObjectId(req.user.id) && req.user.id);

  if (!reporterId) return res.status(400).json({ success: false, message: "reporter is required" });
  if (!reportedUser || !mongoose.isValidObjectId(reportedUser)) {
    return res.status(400).json({ success: false, message: "valid reportedUser is required" });
  }

  const exists = await User.find({ _id: { $in: [reporterId, reportedUser] } }).limit(2).lean();
  if (exists.length < 2) return res.status(400).json({ success: false, message: "Invalid users" });

  const doc = await Report.create({
    reporter: new mongoose.Types.ObjectId(reporterId),
    reportedUser: new mongoose.Types.ObjectId(reportedUser),
    reason,
    description,
    evidence,
    severity,
    status: "pending",
  });

  const populated = await Report.findById(doc._id)
    .populate("reporter", "name email userName profileImage status")
    .populate("reportedUser", "name email userName profileImage status");

  res.status(201).json({ success: true, data: populated });
});

/* ------------ LIST ------------ */
export const getReports = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
  const skip = (page - 1) * limit;

  const filter = buildFilter(req.query);
  const sort = buildSort(req.query.sort);

  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("reporter", "name email userName profileImage status")
      .populate("reportedUser", "name email userName profileImage status"),
    Report.countDocuments(filter),
  ]);

  res.json({ success: true, page, pageSize: items.length, total, data: items });
});

/* ------------ GET ONE ------------ */
export const getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }
  const item = await Report.findById(id)
    .populate("reporter", "name email userName profileImage status")
    .populate("reportedUser", "name email userName profileImage status");
  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

/* ------------ UPDATE (resolve/dismiss/etc.) ------------ */
export const updateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  const allowed = [
    "status",       // "pending" | "reviewing" | "resolved" | "dismissed"
    "adminNotes",
    "action",       // "none" | "warning" | "blocked" | "banned"
    "severity",     // "low" | "medium" | "high"
    "isCompleted",
    "reviewedBy",
  ];

  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

  // convenience flags
  if (updates.status === "resolved" || updates.status === "dismissed") {
    updates.isCompleted = true;
  }
  updates.updatedAt = new Date();

  const item = await Report.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate("reporter", "name email userName profileImage status")
    .populate("reportedUser", "name email userName profileImage status");

  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

/* ------------ DELETE ------------ */
export const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ success: false, message: "Invalid id" });

  const result = await Report.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ success: false, message: "Not found" });

  res.json({ success: true, deleted: true });
});
