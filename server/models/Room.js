import mongoose from "mongoose";

const collaboratorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["editor", "viewer"],
      default: "editor",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const inviteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["editor", "viewer"],
      default: "editor",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "revoked"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true }
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "New Project",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ ADD THIS
    path: {
      type: String,
      required: true,
    },

    collaborators: {
      type: [collaboratorSchema],
      default: [],
    },

    invites: {
      type: [inviteSchema],
      default: [],
    },

    isRunning: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);
export default Room;