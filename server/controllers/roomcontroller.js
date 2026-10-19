import fs from "fs";
import path from "path";
import Room from "../models/Room.js";
import { getUserProjectRole } from "../utils/projectAccess.js";
import { resolveFromServerRoot } from "../utils/serverPaths.js";

export const createRoom = async (req, res) => {
  try {
    const roomName =
      typeof req.body.name === "string" && req.body.name.trim()
        ? req.body.name.trim()
        : "New Project";

    const projectId = Date.now().toString();
    const projectRootRel = path.join("projects", projectId);
    const projectRootAbs = resolveFromServerRoot(projectRootRel);

    fs.mkdirSync(projectRootAbs, { recursive: true });

    const room = await Room.create({
      name: roomName,
      owner: req.user._id,
      path: projectRootRel,
      isRunning: false,
    });

    return res.status(201).json(room);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ owner: req.user._id }, { "collaborators.user": req.user._id }],
    }).sort({ createdAt: -1 });

    const withRole = rooms.map((r) => ({
      ...r.toObject(),
      accessRole: getUserProjectRole(r, req.user._id),
    }));

    return res.status(200).json(withRole);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};