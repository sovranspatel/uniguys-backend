// src/controllers/messageRequest.controller.js
import mongoose from "mongoose";
import { MessageRequest } from "../models/MessageRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const isId = (id) => mongoose.isValidObjectId(id);

/* ------- Filters & Sort ------- */
function buildFilter(q) {
  const f = {};
  if (q.sender && isId(q.sender))     f.sender = new mongoose.Types.ObjectId(q.sender);
  if (q.recipient && isId(q.recipient)) f.recipient = new mongoose.Types.ObjectId(q.recipient);
  if (q.status) f.status = String(q.status);
  if (q.q) {
    const rx = new RegExp(String(q.q).trim(), "i");
    // search in message fields
    f.$or = [{ message: rx }, { senderMessage: rx }, { receiverMessage: rx }];
  }
  const from = q.from ? new Date(q.from) : null;
  const to   = q.to ? new Date(q.to) : null;
  if (from || to) {
    f.createdAt = {};
    if (from && !isNaN(+from)) f.createdAt.$gte = from;
    if (to && !isNaN(+to))     f.createdAt.$lte = to;
  }
  return f;
}

function buildSort(sortQ) {
  if (!sortQ) return { createdAt: -1, _id: -1 };
  const sort = {};
  String(sortQ)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(part => {
      let field = part;
      let dir = 1;
      const colon = part.indexOf(":");
      if (colon !== -1) {
        field = part.slice(0, colon);
        dir = part.slice(colon + 1) === "-1" ? -1 : 1;
      }
      if (field.startsWith("-")) { field = field.slice(1); dir = -1; }
      if (field) sort[field] = dir;
    });
  return Object.keys(sort).length ? sort : { createdAt: -1, _id: -1 };
}

/* ------- CREATE ------- */
export const createMessageRequest = asyncHandler(async (req, res) => {
  const { sender, recipient, message, senderMessage, receiverMessage, status } = req.body || {};

  if (!isId(sender) || !isId(recipient)) {
    return res.status(400).json({ success: false, message: "Valid sender and recipient are required" });
  }

  const doc = await MessageRequest.create({
    sender, recipient,
    message: message || "",
    senderMessage: senderMessage || message || "",
    receiverMessage: receiverMessage || message || "",
    status: status || "messaged",
  });

  const populated = await MessageRequest.findById(doc._id)
    .populate({ path: "sender", select: "name email userName profileImage status" })
    .populate({ path: "recipient", select: "name email userName profileImage status" });

  res.status(201).json({ success: true, data: populated });
});

/* ------- LIST (pagination + populate) ------- */
export const getMessageRequests = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page  || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
  const skip  = (page - 1) * limit;
  const filter = buildFilter(req.query);
  const sort   = buildSort(req.query.sort);

  const [items, total] = await Promise.all([
    MessageRequest.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({ path: "sender", select: "name email userName profileImage status" })
      .populate({ path: "recipient", select: "name email userName profileImage status" })
      .lean(),
    MessageRequest.countDocuments(filter),
  ]);

  res.json({ success: true, page, pageSize: items.length, total, data: items });
});

/* ------- GET ONE ------- */
export const getMessageRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const item = await MessageRequest.findById(id)
    .populate({ path: "sender", select: "name email userName profileImage status" })
    .populate({ path: "recipient", select: "name email userName profileImage status" });

  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

/* ------- UPDATE status / fields ------- */
export const updateMessageRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const allowed = ["message", "senderMessage", "receiverMessage", "status", "acceptedAt"];
  const updates = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

  // if setting accepted, stamp acceptedAt (unless provided)
  if (updates.status === "accepted" && !updates.acceptedAt) {
    updates.acceptedAt = new Date();
  }

  const item = await MessageRequest.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .populate({ path: "sender", select: "name email userName profileImage status" })
    .populate({ path: "recipient", select: "name email userName profileImage status" });

  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

/* ------- QUICK ACTIONS ------- */
export const acceptMessageRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const item = await MessageRequest.findByIdAndUpdate(
    id,
    { $set: { status: "accepted", acceptedAt: new Date() } },
    { new: true }
  )
    .populate({ path: "sender", select: "name email userName profileImage status" })
    .populate({ path: "recipient", select: "name email userName profileImage status" });

  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

export const declineMessageRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const item = await MessageRequest.findByIdAndUpdate(
    id,
    { $set: { status: "declined" } },
    { new: true }
  )
    .populate({ path: "sender", select: "name email userName profileImage status" })
    .populate({ path: "recipient", select: "name email userName profileImage status" });

  if (!item) return res.status(404).json({ success: false, message: "Not found" });
  res.json({ success: true, data: item });
});

/* ------- DELETE ------- */
export const deleteMessageRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isId(id)) return res.status(400).json({ success: false, message: "Invalid id" });

  const result = await MessageRequest.findByIdAndDelete(id);
  if (!result) return res.status(404).json({ success: false, message: "Not found" });

  res.json({ success: true, deleted: true });
});
