import { Router } from "express";
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
} from "../controllers/report.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

// List & get
router.get("/", getReports);
router.get("/:id", getReportById);

// Admin-protected changes
router.use(authRequired);
router.post("/", createReport);
router.patch("/:id", updateReport);
router.delete("/:id", deleteReport);

export default router;
