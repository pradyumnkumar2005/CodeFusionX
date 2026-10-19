import File from "../models/File.js";
import { canReadProject, canWriteProject, findRoomByIdForUser } from "../utils/projectAccess.js";


// CREATE FILE
export const createFile = async (req, res) => {
  try {
    const { roomId, filename } = req.body;

    const { room, role } = await findRoomByIdForUser(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (!canWriteProject(role)) return res.status(403).json({ message: "Forbidden" });

    if (typeof filename !== "string" || !filename.trim()) {
      return res.status(400).json({ message: "Invalid filename" });
    }
    if (filename.includes("/") || filename.includes("\\") || filename.includes("\0")) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const file = await File.create({
      room: roomId,
      filename: filename.trim(),
    });

    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET FILES OF ROOM
export const getFiles = async (req, res) => {
  try {
    const { room, role } = await findRoomByIdForUser(req.params.roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (!canReadProject(role)) return res.status(403).json({ message: "Forbidden" });

    const files = await File.find({ room: req.params.roomId }).sort({ createdAt: 1 });
    res.status(200).json(files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// GET SINGLE FILE
export const getFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const { room, role } = await findRoomByIdForUser(file.room, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (!canReadProject(role)) return res.status(403).json({ message: "Forbidden" });

    res.status(200).json(file);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// UPDATE FILE CONTENT
export const updateFile = async (req, res) => {
  try {
    const { content } = req.body;

    const existing = await File.findById(req.params.fileId);
    if (!existing) return res.status(404).json({ message: "File not found" });

    const { room, role } = await findRoomByIdForUser(existing.room, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (!canWriteProject(role)) return res.status(403).json({ message: "Forbidden" });

    const file = await File.findByIdAndUpdate(req.params.fileId, { content }, { new: true });

    res.status(200).json(file);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// DELETE FILE
export const deleteFile = async (req, res) => {
  try {
    const existing = await File.findById(req.params.fileId);
    if (!existing) return res.status(404).json({ message: "File not found" });

    const { room, role } = await findRoomByIdForUser(existing.room, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (!canWriteProject(role)) return res.status(403).json({ message: "Forbidden" });

    await File.findByIdAndDelete(req.params.fileId);
    res.status(200).json({ message: "File deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};