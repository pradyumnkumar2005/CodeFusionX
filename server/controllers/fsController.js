import fs from "fs";
import path from "path";
import {
  canReadProject,
  canWriteProject,
  findRoomByProjectIdForUser,
} from "../utils/projectAccess.js";

import { PROJECTS_ROOT, SERVER_ROOT } from "../utils/serverPaths.js";

const projectsRoot = PROJECTS_ROOT;

const getProjectIdFromPath = (userPath) => {
  if (typeof userPath !== "string" || userPath.length === 0) return null;
  if (userPath.includes("\0")) return null;

  const parts = userPath.split(/[\\/]+/).filter(Boolean);
  if (parts[0] !== "projects" || !parts[1]) return null;
  return parts[1];
};

const getRoomProjectRootAbs = async (req, projectId, { requireWrite } = {}) => {
  const { room, role } = await findRoomByProjectIdForUser({ projectId, userId: req.user._id });
  if (!room) return null;

  if (!canReadProject(role)) return { forbidden: true };
  if (requireWrite && !canWriteProject(role)) return { forbidden: true };

  const projectRootAbs = path.resolve(SERVER_ROOT, room.path);

  // Defensive safety check in case DB path is ever corrupted.
  if (projectRootAbs !== projectsRoot && !projectRootAbs.startsWith(projectsRoot + path.sep)) {
    return null;
  }

  return { room, role, projectRootAbs };
};

const resolveInProject = (projectRootAbs, userPath) => {
  const abs = path.resolve(SERVER_ROOT, userPath);

  if (abs === projectRootAbs) return abs;
  if (!abs.startsWith(projectRootAbs + path.sep)) return null;

  return abs;
};

export const readFile = async (req, res) => {
  try {
    const { filePath } = req.query;
    const projectId = getProjectIdFromPath(filePath);
    if (!projectId) return res.status(403).json({ message: "Invalid path" });

    const projectInfo = await getRoomProjectRootAbs(req, projectId, { requireWrite: false });
    if (!projectInfo) return res.status(404).json({ message: "Project not found" });
    if (projectInfo.forbidden) return res.status(403).json({ message: "Forbidden" });

    const absPath = resolveInProject(projectInfo.projectRootAbs, filePath);
    if (!absPath) return res.status(403).json({ message: "Invalid path" });

    const stat = fs.statSync(absPath);
    if (!stat.isFile()) return res.status(400).json({ message: "Not a file" });

    const content = fs.readFileSync(absPath, "utf-8");
    return res.json({ content });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const writeFile = async (req, res) => {
  try {
    const { filePath, content } = req.body;
    const projectId = getProjectIdFromPath(filePath);
    if (!projectId) return res.status(403).json({ message: "Invalid path" });

    const projectInfo = await getRoomProjectRootAbs(req, projectId, { requireWrite: true });
    if (!projectInfo) return res.status(404).json({ message: "Project not found" });
    if (projectInfo.forbidden) return res.status(403).json({ message: "Forbidden" });

    const absPath = resolveInProject(projectInfo.projectRootAbs, filePath);
    if (!absPath) return res.status(403).json({ message: "Invalid path" });

    if (typeof content !== "string") {
      return res.status(400).json({ message: "Invalid content" });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ message: "File not found" });
    }

    const stat = fs.statSync(absPath);
    if (!stat.isFile()) return res.status(400).json({ message: "Not a file" });

    fs.writeFileSync(absPath, content, "utf-8");
    return res.json({ message: "Saved" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const listFiles = async (req, res) => {
  try {
    const { dir } = req.query;
    const projectId = getProjectIdFromPath(dir);
    if (!projectId) return res.status(403).json({ message: "Invalid path" });

    const projectInfo = await getRoomProjectRootAbs(req, projectId, { requireWrite: false });
    if (!projectInfo) return res.status(404).json({ message: "Project not found" });
    if (projectInfo.forbidden) return res.status(403).json({ message: "Forbidden" });

    const absDir = resolveInProject(projectInfo.projectRootAbs, dir);
    if (!absDir) return res.status(403).json({ message: "Invalid path" });

    const stat = fs.statSync(absDir);
    if (!stat.isDirectory()) return res.status(400).json({ message: "Not a directory" });

    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    const result = entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
    }));

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const createDir = async (req, res) => {
  try {
    const { dirPath } = req.body;
    const projectId = getProjectIdFromPath(dirPath);
    if (!projectId) return res.status(403).json({ message: "Invalid path" });

    const projectInfo = await getRoomProjectRootAbs(req, projectId, { requireWrite: true });
    if (!projectInfo) return res.status(404).json({ message: "Project not found" });
    if (projectInfo.forbidden) return res.status(403).json({ message: "Forbidden" });

    const absDir = resolveInProject(projectInfo.projectRootAbs, dirPath);
    if (!absDir) return res.status(403).json({ message: "Invalid path" });

    fs.mkdirSync(absDir, { recursive: true });
    return res.json({ message: "Folder created" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const createFile = async (req, res) => {
  try {
    const { filePath, content } = req.body;
    const projectId = getProjectIdFromPath(filePath);
    if (!projectId) return res.status(403).json({ message: "Invalid path" });

    const projectInfo = await getRoomProjectRootAbs(req, projectId, { requireWrite: true });
    if (!projectInfo) return res.status(404).json({ message: "Project not found" });
    if (projectInfo.forbidden) return res.status(403).json({ message: "Forbidden" });

    const absPath = resolveInProject(projectInfo.projectRootAbs, filePath);
    if (!absPath) return res.status(403).json({ message: "Invalid path" });

    const parent = path.dirname(absPath);
    if (!fs.existsSync(parent)) {
      return res.status(400).json({ message: "Parent folder does not exist" });
    }

    const data = typeof content === "string" ? content : "";

    const fd = fs.openSync(absPath, "wx");
    try {
      fs.writeFileSync(fd, data, "utf-8");
    } finally {
      fs.closeSync(fd);
    }

    return res.status(201).json({ message: "File created" });
  } catch (err) {
    if (err && err.code === "EEXIST") {
      return res.status(409).json({ message: "File already exists" });
    }
    return res.status(500).json({ message: err.message });
  }
};

export const deletePath = async (req, res) => {
  try {
    const { targetPath } = req.body;
    const projectId = getProjectIdFromPath(targetPath);
    if (!projectId) return res.status(403).json({ message: "Invalid path" });

    const projectInfo = await getRoomProjectRootAbs(req, projectId, { requireWrite: true });
    if (!projectInfo) return res.status(404).json({ message: "Project not found" });
    if (projectInfo.forbidden) return res.status(403).json({ message: "Forbidden" });

    const absTarget = resolveInProject(projectInfo.projectRootAbs, targetPath);
    if (!absTarget) return res.status(403).json({ message: "Invalid path" });
    if (absTarget === projectInfo.projectRootAbs) {
      return res.status(400).json({ message: "Cannot delete project root" });
    }

    if (!fs.existsSync(absTarget)) {
      return res.status(404).json({ message: "Not found" });
    }

    const st = fs.statSync(absTarget);
    if (st.isDirectory()) {
      fs.rmSync(absTarget, { recursive: true, force: false });
    } else {
      fs.unlinkSync(absTarget);
    }

    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const renamePath = async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    const projectId = getProjectIdFromPath(oldPath);
    if (!projectId) return res.status(403).json({ message: "Invalid path" });

    // Ensure rename stays within the same project.
    const projectId2 = getProjectIdFromPath(newPath);
    if (!projectId2 || projectId2 !== projectId) {
      return res.status(403).json({ message: "Invalid path" });
    }

    const projectInfo = await getRoomProjectRootAbs(req, projectId, { requireWrite: true });
    if (!projectInfo) return res.status(404).json({ message: "Project not found" });
    if (projectInfo.forbidden) return res.status(403).json({ message: "Forbidden" });

    const absOld = resolveInProject(projectInfo.projectRootAbs, oldPath);
    const absNew = resolveInProject(projectInfo.projectRootAbs, newPath);
    if (!absOld || !absNew) return res.status(403).json({ message: "Invalid path" });
    if (absOld === projectInfo.projectRootAbs) {
      return res.status(400).json({ message: "Cannot rename project root" });
    }

    if (!fs.existsSync(absOld)) {
      return res.status(404).json({ message: "Not found" });
    }
    if (fs.existsSync(absNew)) {
      return res.status(409).json({ message: "Target already exists" });
    }

    const parent = path.dirname(absNew);
    if (!fs.existsSync(parent)) {
      return res.status(400).json({ message: "Parent folder does not exist" });
    }

    fs.renameSync(absOld, absNew);
    return res.json({ message: "Renamed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
