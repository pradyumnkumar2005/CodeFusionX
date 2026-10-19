import express from "express";
import auth from "../middleware/auth.js";
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  updateProfile,
  changePassword,
  uploadProfilePic,
} from "../controllers/userController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", auth, getMe);
router.put("/profile", auth, updateProfile);
router.put("/change-password", auth, changePassword);
router.put("/profile-pic", auth, upload.single("profilePic"), uploadProfilePic);
router.post("/forgot-password", forgotPassword);
export default router;
