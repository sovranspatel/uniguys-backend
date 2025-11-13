import mongoose from "mongoose";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Build filter from query:
 * - text search via ?q=... (name/email/userName/mobile)
 * - direct filters: gender, status, isVerified, isNewUser, city, course, university, nationality
 * - exact match: email, userName
 */
function buildFilter(query) {
  const filter = {};

  // Text search (case-insensitive)
  if (query.q) {
    const rx = new RegExp(String(query.q).trim(), "i");
    filter.$or = [{ name: rx }, { email: rx }, { userName: rx }, { mobile: rx }];
  }

  // Direct filters
  if (query.gender) filter.gender = query.gender;
  if (query.status) filter.status = query.status; // active | blocked
  if (typeof query.isVerified !== "undefined") {
    filter.isVerified = String(query.isVerified) === "true";
  }
  if (typeof query.isNewUser !== "undefined") {
    filter.isNewUser = String(query.isNewUser) === "true";
  }
  if (query.city) filter.city = query.city;
  if (query.course) filter.course = query.course;
  if (query.university) filter.university = query.university;
  if (query.nationality) filter.nationality = query.nationality;

  // Exact match convenience
  if (query.email) filter.email = String(query.email).toLowerCase();
  if (query.userName) filter.userName = query.userName;

  return filter;
}

/**
 * Build sort from ?sort=-createdAt,name
 */
function buildSort(sortQ) {
  const sort = {};
  if (!sortQ) return { createdAt: -1 };
  String(sortQ)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(part => {
      if (part.startsWith("-")) sort[part.slice(1)] = -1;
      else sort[part] = 1;
    });
  return Object.keys(sort).length ? sort : { createdAt: -1 };
}

/**
 * Safely pick allowed fields from body
 */
function pickAllowed(body, allowed) {
  const out = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      out[k] = body[k];
    }
  }
  return out;
}

// -------------------- CREATE --------------------
export const createUser = asyncHandler(async (req, res) => {
  // Required minimal
  const { email, password, userName, name } = req.body;
  if (!email || !password || !userName || !name) {
    return res
      .status(400)
      .json({ success: false, message: "email, password, userName, name are required" });
  }

  // Uniqueness checks
  const exists = await User.findOne({
    $or: [{ email: String(email).toLowerCase() }, { userName }],
  }).lean();
  if (exists) {
    return res
      .status(409)
      .json({ success: false, message: "Email or userName already in use" });
  }

  const allowed = [
    "email",
    "password",
    "userName",
    "name",
    "mobile",
    "profileImage",
    "socialImages",
    "status",
    "gender",
    "dob",
    "bio",
    "nationality",
    "language",
    "city",
    "course",
    "levelOfEducation",
    "university",
    "universityEmailId",
    "hobby",
    "state",
    "otp",
    "otpExpiry",
    "isVerified",
    "coins",
    "location",
    "preference",
    "isNewUser",
    "blockedUsers",
    "lastSeen",
    "settings",
    "devices",
  ];

  const payload = pickAllowed(req.body, allowed);
  // Normalize email
  payload.email = String(email).toLowerCase();

  // Create (password hashing happens in model pre-save)
  const user = await User.create(payload);
  res.status(201).json({ success: true, data: user });
});

// -------------------- READ LIST --------------------
export const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 200);
  const skip = (page - 1) * limit;

  const filter = buildFilter(req.query);
  const sort = buildSort(req.query.sort);

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-password -__v")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    page,
    pageSize: items.length,
    total,
    data: items,
  });
});

// -------------------- READ ONE --------------------
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  const user = await User.findById(id).select("-password -__v");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  res.json({ success: true, data: user });
});

// -------------------- UPDATE --------------------
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  // Only allow updates to these fields:
  const allowed = [
    "email",
    "mobile",
    "password", // will be re-hashed by pre-save if changed
    "userName",
    "profileImage",
    "socialImages",
    "name",
    "gender",
    "dob",
    "bio",
    "nationality",
    "language",
    "city",
    "course",
    "levelOfEducation",
    "university",
    "universityEmailId",
    "hobby",
    "state",
    "otp",
    "otpExpiry",
    "isVerified",
    "coins",
    "location",
    "preference",
    "isNewUser",
    "blockedUsers",
    "lastSeen",
    "status",
    "settings",
    "devices",
  ];

  const updates = pickAllowed(req.body, allowed);

  // If email or userName changing, ensure uniqueness
  if (updates.email || updates.userName) {
    const conflict = await User.findOne({
      _id: { $ne: id },
      $or: [
        ...(updates.email ? [{ email: String(updates.email).toLowerCase() }] : []),
        ...(updates.userName ? [{ userName: updates.userName }] : []),
      ],
    }).lean();
    if (conflict) {
      return res
        .status(409)
        .json({ success: false, message: "Email or userName already in use" });
    }
  }

  // Load doc with password (so pre-save can rehash if modified)
  const doc = await User.findById(id).select("+password");
  if (!doc) return res.status(404).json({ success: false, message: "User not found" });

  // Normalize email if provided
  if (typeof updates.email === "string") {
    updates.email = updates.email.toLowerCase();
  }

  Object.assign(doc, updates);
  await doc.save(); // triggers pre('save') for password hashing

  const clean = doc.toObject();
  delete clean.password;
  delete clean.__v;
  res.json({ success: true, data: clean });
});

// -------------------- DELETE --------------------
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  const result = await User.findByIdAndDelete(id).lean();
  if (!result) return res.status(404).json({ success: false, message: "User not found" });

  res.json({ success: true, deleted: true });
});

// -------------------- BLOCK / UNBLOCK HELPERS --------------------
export const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params; // who will block
  const { targetId } = req.body; // whom to block
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ success: false, message: "Invalid id(s)" });
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $addToSet: { blockedUsers: targetId } },
    { new: true }
  ).select("-password -__v");

  if (!result) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: result });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { targetId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ success: false, message: "Invalid id(s)" });
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $pull: { blockedUsers: targetId } },
    { new: true }
  ).select("-password -__v");

  if (!result) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: result });
});
