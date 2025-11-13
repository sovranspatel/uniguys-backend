// src/routes/notification.routes.js

import { Router } from "express";
import {
  createNotification,
  getNotifications,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

// LIST: public (abhi ke liye UI ke liye asaan)
// 👉 Prod me isey bhi admin-protected kar dena
router.get("/", getNotifications);

// CREATE/DELETE: admin protected
router.use(authRequired);
router.post("/", createNotification);
router.delete("/:id", deleteNotification);

export default router;
