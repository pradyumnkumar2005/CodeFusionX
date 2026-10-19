import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import roomRouter from "./routes/roomRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import fsRoutes from "./routes/fsRoutes.js";
import runRoutes from "./routes/runRoutes.js";
import termRoutes from "./routes/termRoutes.js";
import { attachFsRealtime } from "./realtime/fsRealtime.js";
dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// ─── SECURITY HEADERS ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// ─── RATE LIMITERS ───────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Interactive terminal needs more frequent calls (input/resize/long-poll logs).
// Terminal is still gated server-side by ENABLE_UNSAFE_TERMINAL.
const terminalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 6000,
  message: { message: "Too many terminal requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── NOSQL INJECTION SANITIZER ───────────────────────────
// Strips keys starting with $ or containing . from body and params
// Avoids touching req.query which is read-only in Express 5
const sanitizeObject = (obj) => {
  if (obj && typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    });
  }
};

const mongoSanitize = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  next();
};

// ─── MIDDLEWARE ──────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow multiple dev origins (Vite can hop ports when one is busy).
      // Supports comma-separated CLIENT_URL values.
      const raw = String(process.env.CLIENT_URL || "http://localhost:5173");
      const allowed = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Non-browser tools (no Origin header)
      if (!origin) return cb(null, true);

      if (allowed.includes(origin)) return cb(null, true);

      // Helpful dev fallback: allow localhost 5173/5174.
      if (origin === "http://localhost:5173" || origin === "http://localhost:5174") {
        return cb(null, true);
      }

      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(mongoSanitize);

// ─── REALTIME (SOCKET.IO) ───────────────────────────────
const socketAllowedOriginsRaw = String(
  process.env.CLIENT_URL || "http://localhost:5173",
);
const socketAllowedOrigins = socketAllowedOriginsRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (socketAllowedOrigins.includes(origin)) return cb(null, true);
      if (origin === "http://localhost:5173" || origin === "http://localhost:5174") {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  },
});

attachFsRealtime(io);

// ─── ROUTES ─────────────────────────────────────────────
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

app.use("/api/auth", generalLimiter, userRoutes);
app.use("/api/admin", generalLimiter, adminRoutes);
app.use("/api/feedback", generalLimiter, feedbackRoutes);
app.use("/api/contact", generalLimiter, contactRoutes);
app.use("/api/room", generalLimiter, roomRouter);
app.use("/api/file", generalLimiter, fileRouter);

app.use("/api/project", generalLimiter, projectRoutes);
app.use("/api/fs", generalLimiter, fsRoutes);
app.use("/api/run", generalLimiter, runRoutes);
app.use("/api/term", terminalLimiter, termRoutes);

// ─── HEALTH CHECK ────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ─── ERROR HANDLER ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong." });
});

// ─── CONNECT DB + START SERVER ───────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    httpServer.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
