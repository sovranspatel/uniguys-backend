// src/routes/messageRequest.routes.js
import { Router } from "express";
import {
  createMessageRequest,
  getMessageRequests,
  getMessageRequestById,
  updateMessageRequest,
  deleteMessageRequest,
  acceptMessageRequest,
  declineMessageRequest,
} from "../controllers/messageRequest.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

// List & Get
router.get("/", getMessageRequests);
router.get("/:id", getMessageRequestById);

// Admin/protected actions
router.use(authRequired);
router.post("/", createMessageRequest);
router.patch("/:id", updateMessageRequest);
router.delete("/:id", deleteMessageRequest);

// Quick actions
router.post("/:id/accept", acceptMessageRequest);
router.post("/:id/decline", declineMessageRequest);

export default router;
