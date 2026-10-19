import Feedback from "../models/Feedback.js";

// ─── SUBMIT FEEDBACK ─────────────────────────────────────
export const submit = async (req, res) => {
  try {
    const { message, rating } = req.body;

    if (!message || !rating) {
      return res.status(400).json({ message: "Message and rating are required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      message,
      rating,
    });

    res.status(201).json({ message: "Feedback submitted.", feedback });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET MY FEEDBACKS ────────────────────────────────────
export const getMyFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ALL FEEDBACKS (ADMIN) ───────────────────────────
export const getAllFeedbacks = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const feedbacks = await Feedback.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE OWN FEEDBACK ─────────────────────────────────
export const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    if (feedback.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to delete this feedback." });
    }

    await Feedback.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Feedback deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
