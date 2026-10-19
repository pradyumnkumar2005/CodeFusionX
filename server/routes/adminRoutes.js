import express from "express";
import auth from "../middleware/auth.js";
import {
  getUsers,
  getStats,
  deleteUser,
  toggleBanUser,
  changeUserRole,
  adminDeleteFeedback,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/users", auth, getUsers);
router.get("/stats", auth, getStats);
router.delete("/users/:id", auth, deleteUser);
router.put("/users/:id/ban", auth, toggleBanUser);
router.put("/users/:id/role", auth, changeUserRole);
router.delete("/feedback/:id", auth, adminDeleteFeedback);

export default router;
