import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import Room from "../models/Room.js";
import User from "../models/User.js";
import {
  canReadProject,
  canWriteProject,
  findRoomByIdForUser,
  getUserProjectRole,
} from "../utils/projectAccess.js";
import { PROJECTS_ROOT, resolveFromServerRoot } from "../utils/serverPaths.js";

// `npx` is a .cmd shim on Windows; run it via cmd.exe to avoid spawn EINVAL.
const npxCmd = "npx";

const safeArg = (s) => typeof s === "string" && /^[a-zA-Z0-9._-]+$/.test(s);

const run = (cmd, args, options) =>
  new Promise((resolve, reject) => {
    if (!safeArg(cmd) || !Array.isArray(args) || args.some((a) => !safeArg(a))) {
      reject(new Error("Invalid command arguments"));
      return;
    }

    const spawnOpts = {
      ...options,
      shell: false,
      windowsHide: true,
    };

    const child =
      process.platform === "win32"
        ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `${cmd} ${args.join(" ")}`], spawnOpts)
        : spawn(cmd, args, spawnOpts);

    let stderr = "";

    child.stdout.on("data", (d) => {
      process.stdout.write(d);
    });

    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(d);
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) return resolve();
      return reject(new Error(stderr || `Command failed with code ${code}`));
    });
  });

const writeJson = (filePath, obj) => {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf-8");
};

const scaffoldNodeServer = (serverDir) => {
  fs.mkdirSync(serverDir, { recursive: true });

  writeJson(path.join(serverDir, "package.json"), {
    name: "server",
    version: "1.0.0",
    private: true,
    type: "module",
    scripts: {
      start: "node index.js",
    },
    dependencies: {
      cors: "^2.8.5",
      dotenv: "^16.6.1",
      express: "^4.21.2",
      mongoose: "^8.19.0"
    },
  });

  fs.writeFileSync(
    path.join(serverDir, "index.js"),
    "import express from \"express\";\n" +
      "import cors from \"cors\";\n" +
      "import dotenv from \"dotenv\";\n\n" +
      "dotenv.config();\n\n" +
      "const app = express();\n" +
      "app.use(express.json());\n" +
      "app.use(cors({ origin: process.env.CLIENT_URL || \"http://localhost:5173\", credentials: true }));\n\n" +
      "app.get(\"/api/health\", (req, res) => {\n" +
      "  res.json({ status: \"ok\" });\n" +
      "});\n\n" +
      "const PORT = process.env.PORT || 5000;\n" +
      "app.listen(PORT, () => console.log(`Server running on ${PORT}`));\n",
    "utf-8"
  );

  fs.writeFileSync(
    path.join(serverDir, ".env"),
    "PORT=5000\nCLIENT_URL=http://localhost:5173\nMONGO_URI=\n",
    "utf-8"
  );
};

export const createProject = async (req, res) => {
  try {
    const { name, template } = req.body;
    const selectedTemplate = typeof template === "string" && template.trim() ? template.trim() : "blank";

    const allowedTemplates = new Set(["blank", "react", "node", "mern"]);
    if (!allowedTemplates.has(selectedTemplate)) {
      return res.status(400).json({
        message: "Invalid template",
        received: selectedTemplate,
        allowed: Array.from(allowedTemplates),
      });
    }

    const projectId = Date.now().toString();
    const projectRootRel = path.join("projects", projectId);
    const projectsDir = PROJECTS_ROOT;
    const projectRootAbs = resolveFromServerRoot(projectRootRel);

    const roomName = typeof name === "string" && name.trim() ? name.trim() : "New Project";

    if (selectedTemplate === "blank") {
      fs.mkdirSync(projectRootAbs, { recursive: true });
      fs.writeFileSync(
        path.join(projectRootAbs, "README.md"),
        `# ${roomName}\n\nBlank project folder.\n`,
        "utf-8"
      );
    }

    if (selectedTemplate === "react") {
      // CRA creates the folder itself inside /projects
      await run(npxCmd, ["create-react-app", projectId], { cwd: projectsDir, env: process.env });
    }

    if (selectedTemplate === "node") {
      fs.mkdirSync(projectRootAbs, { recursive: true });
      scaffoldNodeServer(projectRootAbs);
    }

    if (selectedTemplate === "mern") {
      fs.mkdirSync(projectRootAbs, { recursive: true });

      // Client
      await run(npxCmd, ["create-react-app", "client"], { cwd: projectRootAbs, env: process.env });

      // Server
      scaffoldNodeServer(path.join(projectRootAbs, "server"));

      fs.writeFileSync(
        path.join(projectRootAbs, "README.md"),
        "# MERN Project\n\n" +
          "- client/: React app\n" +
          "- server/: Node/Express API\n\n" +
          "Run in the editor UI:\n" +
          "- workdir=client: npm start\n" +
          "- workdir=server: npm install, then npm start\n",
        "utf-8"
      );
    }

    const room = await Room.create({
      name: roomName,
      owner: req.user._id,
      path: projectRootRel,
      isRunning: false,
    });

    return res.status(201).json(room);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Project creation failed" });
  }
};

const normalizeEmail = (email) => {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
};

const isValidRole = (role) => role === "editor" || role === "viewer";

export const getCollaborators = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { room, role } = await findRoomByIdForUser(projectId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (!canReadProject(role)) return res.status(403).json({ message: "Forbidden" });

    const owner = await User.findById(room.owner).select("name email");

    const collabUsers = await User.find({
      _id: { $in: (room.collaborators || []).map((c) => c.user) },
    }).select("name email");
    const byId = new Map(collabUsers.map((u) => [String(u._id), u]));

    const collaborators = (room.collaborators || []).map((c) => {
      const u = byId.get(String(c.user));
      return {
        userId: String(c.user),
        name: u?.name || "",
        email: u?.email || "",
        role: c.role,
        addedAt: c.addedAt,
      };
    });

    const isOwner = String(room.owner) === String(req.user._id);
    const pendingInviteDocs = isOwner
      ? (room.invites || []).filter((i) => i.status === "pending")
      : [];

    const inviteUsers = isOwner
      ? await User.find({ _id: { $in: pendingInviteDocs.map((i) => i.user) } }).select("name email")
      : [];
    const inviteById = new Map(inviteUsers.map((u) => [String(u._id), u]));

    const pendingInvites = isOwner
      ? pendingInviteDocs.map((i) => {
          const u = inviteById.get(String(i.user));
          return {
            inviteId: String(i._id),
            userId: String(i.user),
            name: u?.name || "",
            email: u?.email || "",
            role: i.role,
            status: i.status,
            invitedBy: String(i.invitedBy),
            createdAt: i.createdAt,
          };
        })
      : [];

    return res.json({
      projectId: String(room._id),
      name: room.name,
      path: room.path,
      accessRole: getUserProjectRole(room, req.user._id),
      owner: owner
        ? { userId: String(owner._id), name: owner.name, email: owner.email }
        : { userId: String(room.owner), name: "", email: "" },
      collaborators,
      pendingInvites,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const inviteCollaborator = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, userId, role } = req.body || {};

    const room = await Room.findById(projectId);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (String(room.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can invite collaborators" });
    }

    const nextRole = isValidRole(role) ? role : "editor";

    let targetUser = null;
    if (userId) {
      targetUser = await User.findById(userId);
    } else {
      const e = normalizeEmail(email);
      if (!e) return res.status(400).json({ message: "email is required" });
      targetUser = await User.findOne({ email: e });
    }

    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (String(targetUser._id) === String(room.owner)) {
      return res.status(400).json({ message: "Owner is already part of the project" });
    }

    const already = (room.collaborators || []).some((c) => String(c.user) === String(targetUser._id));
    if (already) return res.status(409).json({ message: "User is already a collaborator" });

    const pending = (room.invites || []).some(
      (i) => String(i.user) === String(targetUser._id) && i.status === "pending"
    );
    if (pending) return res.status(409).json({ message: "Invite already pending" });

    room.invites.push({
      user: targetUser._id,
      role: nextRole,
      invitedBy: req.user._id,
      status: "pending",
    });

    await room.save();

    const last = room.invites[room.invites.length - 1];
    return res.status(201).json({
      inviteId: String(last._id),
      projectId: String(room._id),
      userId: String(targetUser._id),
      email: targetUser.email,
      name: targetUser.name,
      role: last.role,
      status: last.status,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const listMyInvites = async (req, res) => {
  try {
    const rooms = await Room.find({
      invites: { $elemMatch: { user: req.user._id, status: "pending" } },
    }).select("name path owner invites");

    const result = [];
    for (const r of rooms) {
      const inv = (r.invites || []).find(
        (i) => String(i.user) === String(req.user._id) && i.status === "pending"
      );
      if (!inv) continue;

      result.push({
        inviteId: String(inv._id),
        projectId: String(r._id),
        projectName: r.name,
        projectPath: r.path,
        role: inv.role,
        invitedBy: String(inv.invitedBy),
        createdAt: inv.createdAt,
      });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const { projectId, inviteId } = req.params;
    const room = await Room.findById(projectId);
    if (!room) return res.status(404).json({ message: "Not found" });

    const inv = (room.invites || []).id(inviteId);
    if (!inv) return res.status(404).json({ message: "Invite not found" });
    if (String(inv.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (inv.status !== "pending") {
      return res.status(409).json({ message: `Invite is ${inv.status}` });
    }

    const already = (room.collaborators || []).some((c) => String(c.user) === String(req.user._id));
    if (!already) {
      room.collaborators.push({ user: req.user._id, role: inv.role });
    }

    inv.status = "accepted";
    await room.save();

    return res.json({ message: "Accepted", projectId: String(room._id) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const declineInvite = async (req, res) => {
  try {
    const { projectId, inviteId } = req.params;
    const room = await Room.findById(projectId);
    if (!room) return res.status(404).json({ message: "Not found" });

    const inv = (room.invites || []).id(inviteId);
    if (!inv) return res.status(404).json({ message: "Invite not found" });
    if (String(inv.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (inv.status !== "pending") {
      return res.status(409).json({ message: `Invite is ${inv.status}` });
    }

    inv.status = "declined";
    await room.save();
    return res.json({ message: "Declined" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const revokeInvite = async (req, res) => {
  try {
    const { projectId, inviteId } = req.params;
    const room = await Room.findById(projectId);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (String(room.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can revoke invites" });
    }

    const inv = (room.invites || []).id(inviteId);
    if (!inv) return res.status(404).json({ message: "Invite not found" });
    if (inv.status !== "pending") {
      return res.status(409).json({ message: `Invite is ${inv.status}` });
    }

    inv.status = "revoked";
    await room.save();
    return res.json({ message: "Revoked" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateCollaboratorRole = async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body || {};

    if (!isValidRole(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const room = await Room.findById(projectId);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (String(room.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can manage collaborators" });
    }

    const collab = (room.collaborators || []).find((c) => String(c.user) === String(userId));
    if (!collab) return res.status(404).json({ message: "Collaborator not found" });

    collab.role = role;
    await room.save();
    return res.json({ message: "Updated" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const removeCollaborator = async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const room = await Room.findById(projectId);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (String(room.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the owner can manage collaborators" });
    }

    room.collaborators = (room.collaborators || []).filter(
      (c) => String(c.user) !== String(userId)
    );

    // Also revoke any pending invite for the same user.
    for (const inv of room.invites || []) {
      if (String(inv.user) === String(userId) && inv.status === "pending") {
        inv.status = "revoked";
      }
    }

    await room.save();
    return res.json({ message: "Removed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const slugifyFolderName = (name) => {
  const raw = typeof name === "string" ? name.trim() : "";
  let s = raw.toLowerCase();

  // keep letters/numbers/dot/_/- and spaces
  s = s.replace(/[^a-z0-9 ._-]+/g, "");
  // spaces/dots -> dash, collapse dashes
  s = s.replace(/[ .]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

  if (!s) s = "new-project";

  // Windows reserved names
  const reserved = new Set([
    "con","prn","aux","nul",
    "com1","com2","com3","com4","com5","com6","com7","com8","com9",
    "lpt1","lpt2","lpt3","lpt4","lpt5","lpt6","lpt7","lpt8","lpt9",
  ]);
  if (reserved.has(s)) s = `_${s}`;

  return s;
};

const pickUniqueProjectFolder = (projectDisplayName) => {
  const base = slugifyFolderName(projectDisplayName);
  let candidate = base;
  let n = 2;

  while (fs.existsSync(path.join(PROJECTS_ROOT, candidate))) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
};
