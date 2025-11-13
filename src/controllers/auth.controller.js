// src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const sign = (admin) =>
  jwt.sign({ id: admin._id, role: "admin", email: admin.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "email & password required" });

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const ok = await admin.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = sign(admin);
    const isProd = (process.env.NODE_ENV || "development").toLowerCase() === "production";

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: isProd,          // secure only in production
        sameSite: isProd ? "none" : "lax", // if production and cross-site, may need none
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        success: true,
        message: "Logged in",
        token,
        user: { id: admin._id, email: admin.email, name: admin.name, role: "admin" },
      });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    res.json({ success: true, user: admin });
  } catch (err) {
    next(err);
  }
}
