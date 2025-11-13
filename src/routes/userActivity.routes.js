// src/routes/userActivity.routes.js

import { Router } from "express";
import {
  createActivity,
  getActivities,
  getActivityById,
  deleteActivity,
  getMyActivities,
} from "../controllers/userActivity.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

router.get("/", getActivities);
router.get("/:id", getActivityById);
router.get("/me/feed", authRequired, getMyActivities);
router.post("/", authRequired, createActivity);
router.delete("/:id", authRequired, deleteActivity);

export default router;
