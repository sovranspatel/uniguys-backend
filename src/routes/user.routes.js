import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
} from "../controllers/user.controller.js";
import { authRequired } from "../middlewares/auth.js";

const router = Router();

/**
 * ✅ Public (abhi ke liye): Get all users
 * NOTE: Jab production me jao to isko bhi auth se protect kar dena.
 */
router.get("/", getUsers);

// 🔒 Protect everything else
router.use(authRequired);

router.post("/", createUser);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

// Block helpers
router.post("/:id/block", blockUser);
router.post("/:id/unblock", unblockUser);

export default router;
