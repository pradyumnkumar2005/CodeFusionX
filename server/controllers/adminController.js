import User from "../models/User.js";
import Feedback from "../models/Feedback.js";
import Contact from "../models/Contact.js";
// ─── GET ALL USERS ───────────────────────────────────────
export const getUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET STATS ───────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const [users, feedbacks, contacts, unreadContacts] = await Promise.all([
      User.countDocuments(),
      Feedback.countDocuments(),
      Contact.countDocuments(),
      Contact.countDocuments({ isRead: false }),
    ]);

    res.status(200).json({ users, feedbacks, contacts, unreadContacts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ─── DELETE USER ─────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Delete all feedbacks by this user too
    await Feedback.deleteMany({ userId: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "User and their feedbacks deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── BAN / UNBAN USER ────────────────────────────────────
export const toggleBanUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot ban your own account." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.status(200).json({
      message: user.isBanned ? "User banned successfully." : "User unbanned successfully.",
      isBanned: user.isBanned,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── CHANGE USER ROLE ────────────────────────────────────
export const changeUserRole = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const { role } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be user or admin." });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "Role updated successfully.", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── ADMIN DELETE ANY FEEDBACK ───────────────────────────
export const adminDeleteFeedback = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    await Feedback.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Feedback deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
