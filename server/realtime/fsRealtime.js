import path from "path";
import chokidar from "chokidar";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import {
  canReadProject,
  findRoomByProjectIdForUser,
} from "../utils/projectAccess.js";
import { PROJECTS_ROOT, SERVER_ROOT } from "../utils/serverPaths.js";

const normalizeRelPath = (p) => String(p || "").replace(/\\/g, "/");

const parseCookies = (cookieHeader) => {
  const cookies = {};
  const raw = String(cookieHeader || "");
  if (!raw) return cookies;

  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    try {
      cookies[k] = decodeURIComponent(v);
    } catch {
      cookies[k] = v;
    }
  });

  return cookies;
};

const authSocketUser = async (socket) => {
  const cookies = parseCookies(socket.handshake?.headers?.cookie);
  const token = cookies.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return null;
    if (user.isBanned) return null;
    return user;
  } catch {
    return null;
  }
};

const getProjectIdFromRelPath = (userPath) => {
  const s = normalizeRelPath(userPath);
  const parts = s.split("/").filter(Boolean);
  if (parts[0] !== "projects" || !parts[1]) return null;
  return parts[1];
};

const createProjectWatcherManager = (io) => {
  const projectsRoot = PROJECTS_ROOT;

  const projects = new Map();
  // projectId -> { watcher, refCount }

  const ensureWatcher = (projectId) => {
    const existing = projects.get(projectId);
    if (existing) {
      existing.refCount += 1;
      return existing;
    }

    const projectAbs = path.resolve(projectsRoot, projectId);
    // Safety: ensure under projects root
    if (projectAbs !== projectsRoot && !projectAbs.startsWith(projectsRoot + path.sep)) {
      return null;
    }

    const watcher = chokidar.watch(projectAbs, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 50,
      },
    });

    const emit = (kind, absPath) => {
      const rel = normalizeRelPath(path.relative(SERVER_ROOT, absPath));
      io.to(`project:${projectId}`).emit("fs:changed", {
        projectId,
        kind,
        path: rel,
      });
    };

    watcher
      .on("add", (p) => emit("add", p))
      .on("change", (p) => emit("change", p))
      .on("unlink", (p) => emit("unlink", p))
      .on("addDir", (p) => emit("addDir", p))
      .on("unlinkDir", (p) => emit("unlinkDir", p));

    const entry = { watcher, refCount: 1 };
    projects.set(projectId, entry);
    return entry;
  };

  const releaseWatcher = async (projectId) => {
    const entry = projects.get(projectId);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount > 0) return;

    projects.delete(projectId);
    try {
      await entry.watcher.close();
    } catch {
      // ignore
    }
  };

  return { ensureWatcher, releaseWatcher };
};

export const attachFsRealtime = (io) => {
  const watchers = createProjectWatcherManager(io);

  io.on("connection", async (socket) => {
    const user = await authSocketUser(socket);
    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.data.userId = String(user._id);
    socket.data.projectIds = new Set();

    socket.on("fs:join", async ({ projectId, projectPath } = {}) => {
      const id =
        (typeof projectId === "string" && projectId) ||
        getProjectIdFromRelPath(projectPath);
      if (!id) return;

      try {
        const { room, role } = await findRoomByProjectIdForUser({
          projectId: id,
          userId: user._id,
        });

        if (!room || !canReadProject(role)) return;

        socket.join(`project:${id}`);
        socket.data.projectIds.add(id);
        watchers.ensureWatcher(id);

        socket.emit("fs:joined", { projectId: id });
      } catch {
        // ignore
      }
    });

    socket.on("fs:leave", async ({ projectId } = {}) => {
      const id = typeof projectId === "string" ? projectId : "";
      if (!id) return;
      if (!socket.data.projectIds?.has?.(id)) return;

      socket.data.projectIds.delete(id);
      socket.leave(`project:${id}`);
      await watchers.releaseWatcher(id);
    });

    socket.on("disconnect", async () => {
      const ids = Array.from(socket.data.projectIds || []);
      socket.data.projectIds = new Set();

      for (const id of ids) {
        await watchers.releaseWatcher(id);
      }
    });
  });
};
