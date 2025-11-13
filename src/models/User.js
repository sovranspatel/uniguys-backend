// src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

/* ---------- Subdocs ---------- */

// GeoJSON Point
const locationSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    // [longitude, latitude]
    coordinates: { type: [Number], default: [0, 0] },
  },
  { _id: false }
);

// Preferences (nullable)
const preferenceSchema = new Schema(
  {
    course: { type: String, default: null },
    levelOfEducation: { type: String, default: null },
    university: { type: String, default: null },
    language: { type: String, default: null },
    distance: { type: Number, default: 10 }, // your sample uses 10
    nationality: { type: String, default: null },
    gender: { type: String, default: null },
    ageGroup: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 40 }, // your sample uses 40
    },
  },
  { _id: false }
);

// Notification settings
const settingsSchema = new Schema(
  {
    pushNotifications: { type: Boolean, default: true },
    realtimeNotifications: { type: Boolean, default: true },
  },
  { _id: false }
);

// Device (for FCM)
const deviceSchema = new Schema(
  {
    platform: { type: String, enum: ["android", "ios", "web"], default: "android" },
    fcmToken: { type: String, required: true, index: true },
    deviceId: { type: String, default: "" },
    appVersion: { type: String, default: "" },
    lastActive: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ---------- User ---------- */

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
      trim: true,
    },
    mobile: { type: String, default: "" },

    // hashed; only select when explicitly asked
    password: { type: String, required: true, select: false },

    userName: { type: String, required: true, unique: true, trim: true, index: true },

    profileImage: { type: String, default: "" },
    socialImages: { type: [String], default: [] },

    // admin control
    status: { type: String, enum: ["active", "blocked"], default: "active", index: true },

    name: { type: String, required: true, trim: true, index: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Male" },
    dob: { type: Date },

    bio: { type: String, default: "" },
    nationality: { type: String, default: "" },

    // your sample top-level language is array
    language: { type: [String], default: [] },

    city: { type: String, default: "" },
    course: { type: String, default: "" },
    levelOfEducation: { type: String, default: "" },
    university: { type: String, default: "" },
    universityEmailId: { type: String, default: "" },
    hobby: { type: [String], default: [] },
    state: { type: String, default: "" },

    otp: { type: String, default: undefined },
    otpExpiry: { type: Date, default: null },

    isVerified: { type: Boolean, default: false },
    coins: { type: Number, default: 0 },

    location: { type: locationSchema, index: "2dsphere" },
    preference: { type: preferenceSchema },

    isNewUser: { type: Boolean, default: true },

    // user ids this user blocked
    blockedUsers: { type: [Schema.Types.ObjectId], ref: "users", default: [] },

    lastSeen: { type: Date, default: null },

    settings: { type: settingsSchema, default: () => ({}) },

    devices: { type: [deviceSchema], default: [] },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* ---------- Hooks ---------- */

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ---------- Methods ---------- */

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// sanitize responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

/* ---------- Indexes helpful for admin search ---------- */
userSchema.index({ name: "text", email: "text", userName: "text" });

export const User = mongoose.model("users", userSchema);
