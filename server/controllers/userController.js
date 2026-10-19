import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendEmail } from "../config/emailConfig.js";
import { v2 as cloudinary } from "cloudinary";

const sendTokenCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

// ─── REGISTER ────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered." });
    }

    const user = await User.create({ name, email, password });

    sendTokenCookie(res, user._id);


    try {
      await sendEmail({
        to: user.email,
        subject: `Welcome to ${process.env.EMAIL_FROM_NAME || 'MyApp'} 🎉`,
        html: `
          <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9f9f9;'>
            <div style='background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);'>
              <h1 style='color: #1a1a1a; font-size: 28px; margin: 0 0 8px;'>Welcome, ${user.name}! 👋</h1>
              <p style='color: #666; font-size: 16px; margin: 0 0 32px;'>Your account has been created successfully.</p>
              <div style='background: #f0f4ff; border-radius: 8px; padding: 20px; margin-bottom: 32px;'>
                <p style='margin: 0; color: #444; font-size: 14px;'><strong>Email:</strong> ${user.email}</p>
              </div>
              <a href='${process.env.CLIENT_URL || "http://localhost:5173"}/login'
                style='display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;'>
                Go to Login →
              </a>
              <hr style='border: none; border-top: 1px solid #eee; margin: 32px 0;' />
              <p style='color: #999; font-size: 12px; margin: 0;'>If you did not create this account, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("Welcome email failed:", emailErr.message);
    }


    res.status(201).json({
      message: "Registration successful.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── LOGIN ───────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Your account has been banned." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    sendTokenCookie(res, user._id);

    res.status(200).json({
      message: "Login successful.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── LOGOUT ──────────────────────────────────────────────
export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.status(200).json({ message: "Logged out successfully." });
};

// ─── GET ME ──────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── UPDATE PROFILE ──────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (emailExists) {
      return res.status(400).json({ message: "Email already in use." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ message: "Profile updated successfully.", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── CHANGE PASSWORD ─────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── FORGOT PASSWORD ─────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ message: "If this email is registered, a new password has been sent." });
    }


    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let newPassword = "";
    for (let i = 0; i < 10; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    user.password = newPassword;
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: `Your new password for ${process.env.EMAIL_FROM_NAME || 'MyApp'}`,
        html: `
          <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f9f9f9;'>
            <div style='background: #ffffff; border-radius: 12px; padding: 40px;'>
              <h1 style='color: #1a1a1a; font-size: 24px; margin: 0 0 12px;'>Password Reset</h1>
              <p style='color: #666; font-size: 15px; margin: 0 0 28px;'>Hi ${user.name}, your password has been reset.</p>
              <div style='background: #f0f4ff; border-radius: 8px; padding: 20px; margin-bottom: 28px; text-align: center;'>
                <p style='margin: 0 0 8px; font-size: 13px; color: #888;'>Your new temporary password</p>
                <p style='margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 3px; color: #1a1a1a; font-family: monospace;'>${newPassword}</p>
              </div>
              <p style='color: #666; font-size: 14px; margin: 0 0 24px;'>
                Please login with this password and change it immediately from your profile settings.
              </p>
              <a href='${process.env.CLIENT_URL || "http://localhost:5173"}/login'
                style='display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;'>
                Go to Login →
              </a>
              <hr style='border: none; border-top: 1px solid #eee; margin: 32px 0;' />
              <p style='color: #999; font-size: 12px; margin: 0;'>
                If you did not request a password reset, please contact support immediately.
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("Reset email failed:", emailErr.message);
    }

    res.status(200).json({ message: "If this email is registered, a new password has been sent." });

  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ message: "Failed to process request. Try again." });
  }
};


// ─── UPLOAD PROFILE PIC ──────────────────────────────────
export const uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // Delete old profile pic from cloudinary if exists
    if (req.user.profilePicPublicId) {
      await cloudinary.uploader.destroy(req.user.profilePicPublicId);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        profilePic: req.file.path,
        profilePicPublicId: req.file.filename,
      },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "Profile picture updated.",
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

