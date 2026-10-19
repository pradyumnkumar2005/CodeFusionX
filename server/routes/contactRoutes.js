import express from "express";
import auth from "../middleware/auth.js";
import {
  submitContact,
  getAllContacts,
  markAsRead,
  deleteContact,
} from "../controllers/contactController.js";

const router = express.Router();

router.post("/", submitContact);                        // public
router.get("/", auth, getAllContacts);                  // admin
router.put("/:id/read", auth, markAsRead);              // admin
router.delete("/:id", auth, deleteContact);             // admin

export default router;
