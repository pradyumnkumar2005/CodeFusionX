import Contact from "../models/Contact.js";
import { sendEmail } from "../config/emailConfig.js";

// ─── SUBMIT CONTACT ──────────────────────────────────────
export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required." });
    }

    const contact = await Contact.create({ name, email, subject, message });


    // Notify admin
    try {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `New Contact Message: ${subject || "No subject"}`,
        html: `
          <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9f9f9;'>
            <div style='background: #fff; border-radius: 12px; padding: 32px;'>
              <h2 style='color: #1a1a1a; margin: 0 0 24px;'>New Contact Message</h2>
              <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                  <td style='padding: 10px 0; color: #888; font-size: 13px; width: 80px;'>Name</td>
                  <td style='padding: 10px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;'>${name}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; color: #888; font-size: 13px;'>Email</td>
                  <td style='padding: 10px 0; color: #1a1a1a; font-size: 14px;'>${email}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 0; color: #888; font-size: 13px;'>Subject</td>
                  <td style='padding: 10px 0; color: #1a1a1a; font-size: 14px;'>${subject || "—"}</td>
                </tr>
                <tr>
                  <td style='padding: 10px 16px 10px 0; color: #888; font-size: 13px; vertical-align: top;'>Message</td>
                  <td style='padding: 10px 0; color: #1a1a1a; font-size: 14px; line-height: 1.7;'>${message}</td>
                </tr>
              </table>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("Contact notification email failed:", emailErr.message);
    }


    res.status(201).json({ message: "Message sent successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET ALL CONTACTS (ADMIN) ────────────────────────────
export const getAllContacts = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── MARK AS READ ────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: "Message not found." });
    }

    res.status(200).json({ message: "Marked as read.", contact });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE CONTACT ──────────────────────────────────────
export const deleteContact = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied." });
    }

    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Message not found." });
    }

    await Contact.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Message deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
