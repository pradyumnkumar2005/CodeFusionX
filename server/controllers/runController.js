import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import net from "net";
import Room from "../models/Room.js";
import { canWriteProject, findRoomByIdForUser } from "../utils/projectAccess.js";
import { SERVER_ROOT } from "../utils/serverPaths.js";

const running = {};
const logs = {}; // legacy (full log chunks)
const logEvents = {}; // { [key]: Array<{ id: number, data: string }> }
const logSeq = {}; // { [key]: number }
const meta = {}; // { [key]: { commandLine: string, cwd: string, workdir: string, pid?: number, startedAt?: number, exitedAt?: number, exitCode?: number|null, signal?: string|null, status: "running"|"exited"|"stopped", previewUrl?: string|null } }

const npmCmd = "npm";

const normalizeWorkdir = (wd) => {
  if (wd === undefined || wd === null) return "";
  if (typeof wd !== "string") return null;

  const s = wd.replace(/\\/g, "/").trim();
  if (!s || s === ".") return "";
  if (s.includes("\0")) return null;
  if (s.startsWith("/")) return null;
  if (/^[a-zA-Z]:/.test(s)) return null;

  const parts = s.split("/").filter(Boolean);
  if (parts.some((p) => p === "." || p === "..")) return null;
  return parts.join("/");
};

// Token allowlist to avoid command injection when executing via cmd.exe on Windows.
const safeArg = (s) =>
  typeof s === "string" && /^[a-zA-Z0-9@._/+=-]+$/.test(s);

const isScopedPackage = (t) =>
  /^@[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(t);

const isAllowedNpmToken = (t) => {
  if (typeof t !== "string" || !t) return false;
  if (t.includes("\0")) return false;
  if (!safeArg(t)) return false;

  // Block traversal-like tokens.
  if (t.includes("..")) return false;

  // Disallow tokens that can redirect writes outside the project.
  const banned = new Set([
    "-C",
    "--prefix",
    "--global",
    "-g",
    "--location",
    "--userconfig",
    "--cache",
    "--init-module",
    "--script-shell",
  ]);
  if (banned.has(t)) return false;

  // Do not allow flag assignments like --prefix=..., --cache=..., --userconfig=...
  if (t.startsWith("-") && t.includes("=")) return false;

  // Only allow '/' for scoped package names.
  if (t.includes("/")) return isScopedPackage(t);

  return true;
};

const processKey = (roomId, workdir) => `${roomId}:${workdir || ""}`;

const appendLog = (key, line) => {
  const data = typeof line === "string" ? line : String(line ?? "");

  if (!logs[key]) logs[key] = [];
  logs[key].push(data);
  if (logs[key].length > 5000) logs[key].splice(0, logs[key].length - 5000);

  if (!logEvents[key]) logEvents[key] = [];
  if (!logSeq[key]) logSeq[key] = 0;
  const id = (logSeq[key] += 1);
  logEvents[key].push({ id, data });
  if (logEvents[key].length > 20000) {
    logEvents[key].splice(0, logEvents[key].length - 20000);
  }
};

const getRoomForUserWrite = async (roomId, userId) => {
  if (!roomId) return null;
  const { room, role } = await findRoomByIdForUser(roomId, userId);
  if (!room) return null;
  if (!canWriteProject(role)) return { forbidden: true };
  return room;
};

const getCwd = (room, workdir) => {
  const wd = normalizeWorkdir(workdir);
  if (wd === null) return null;

  const rootAbs = path.resolve(SERVER_ROOT, room.path);
  const cwdAbs = path.resolve(rootAbs, wd);

  if (cwdAbs !== rootAbs && !cwdAbs.startsWith(rootAbs + path.sep)) return null;

  if (!fs.existsSync(cwdAbs)) return null;
  const st = fs.statSync(cwdAbs);
  if (!st.isDirectory()) return null;

  return cwdAbs;
};

const getFreePort = (startPort, attempts = 30) =>
  new Promise((resolve, reject) => {
    let port = startPort;

    const tryNext = () => {
      if (port >= startPort + attempts) {
        reject(new Error("No free port available"));
        return;
      }

      const s = net.createServer();
      s.unref();
      s.once("error", () => {
        port += 1;
        tryNext();
      });
      s.listen(port, "127.0.0.1", () => {
        const chosen = port;
        s.close(() => resolve(chosen));
      });
    };

    tryNext();
  });

const readJsonSafe = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isCraStart = (cwd) => {
  const pkg = readJsonSafe(path.join(cwd, "package.json"));
  if (!pkg) return false;

  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  if (deps["react-scripts"] || devDeps["react-scripts"]) return true;

  const startScript = pkg.scripts?.start;
  return typeof startScript === "string" && startScript.includes("react-scripts");
};

const spawnNpm = (args, cwd, env) => {
  const opts = {
    cwd,
    shell: false,
    windowsHide: true,
    env: env || process.env,
  };

  if (process.platform === "win32") {
    // Avoid spawn EINVAL on Node 24 when spawning npm.cmd directly.
    // Do NOT wrap every arg in quotes, as it can be passed through to npm as literal quotes.
    // Tokens are strictly validated by `isAllowedNpmToken`, so joining with spaces is safe here.
    const cmdline = [npmCmd, ...args].join(" ");

    const comspec =
      process.env.ComSpec ||
      (process.env.WINDIR
        ? path.join(process.env.WINDIR, "System32", "cmd.exe")
        : "cmd.exe");

    return spawn(comspec, ["/d", "/c", cmdline], opts);
  }

  return spawn(npmCmd, args, opts);
};

export const execNpm = async (req, res) => {
  try {
    const { roomId, npmArgs, workdir } = req.body;

    if (!Array.isArray(npmArgs) || npmArgs.length === 0) {
      return res.status(400).json({ message: "npmArgs is required" });
    }

    const args = npmArgs.map((a) => (typeof a === "string" ? a : ""));
    if (args.some((a) => !a || !isAllowedNpmToken(a))) {
      return res.status(400).json({ message: "Invalid npmArgs" });
    }

    // Allow only a small, practical subset.
    const verb = args[0];
    const allowedVerbs = new Set([
      "install",
      "i",
      "ci",
      "uninstall",
      "remove",
      "rm",
      "un",
      "update",
      "start",
      "test",
      "run",
    ]);
    if (!allowedVerbs.has(verb)) {
      return res.status(400).json({ message: "Command not allowed" });
    }

    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const cwd = getCwd(room, workdirNorm);
    if (!cwd) return res.status(400).json({ message: "Invalid workdir" });

    // npm commands require a package.json in the chosen working directory.
    // This commonly fails for MERN projects if workdir isn't set to `client` or `server`.
    if (!fs.existsSync(path.join(cwd, "package.json"))) {
      return res.status(400).json({
        message:
          "No package.json found in the selected workdir. Choose the folder that contains package.json (e.g. workdir=client or workdir=server).",
      });
    }

    // Helpful hint: most npm scripts require deps to be installed first.
    // Without node_modules, Windows often errors like: `'react-scripts' is not recognized...`.
    if (
      verb !== "install" &&
      verb !== "i" &&
      verb !== "ci" &&
      !fs.existsSync(path.join(cwd, "node_modules"))
    ) {
      return res.status(400).json({
        message:
          "Dependencies are not installed in this workdir. Run `npm install` first (same workdir), then retry your command.",
      });
    }

    const key = processKey(roomId, workdirNorm);
    if (running[key]) {
      return res.status(409).json({ message: "Already running" });
    }

    logs[key] = [];
    logEvents[key] = [];
    logSeq[key] = 0;

    const commandLine = `${npmCmd} ${args.join(" ")}`;
    appendLog(key, `[cwd] ${cwd}\n`);
    appendLog(key, `$ ${commandLine}\n`);

    meta[key] = {
      commandLine,
      cwd,
      workdir: workdirNorm,
      status: "running",
      previewUrl: null,
      pid: undefined,
      startedAt: Date.now(),
      exitedAt: undefined,
      exitCode: null,
      signal: null,
    };

    const childEnv = { ...process.env };

    // For CRA, avoid interactive port prompts and provide a preview URL.
    if (args[0] === "start" && isCraStart(cwd)) {
      const port = await getFreePort(3000);
      childEnv.PORT = String(port);
      childEnv.BROWSER = "none";
      meta[key].previewUrl = `http://localhost:${port}`;
      appendLog(key, `\n[preview] ${meta[key].previewUrl}\n`);
    }

    const child = spawnNpm(args, cwd, childEnv);

    running[key] = child;
    meta[key].pid = child.pid;
    meta[key].startedAt = Date.now();

    child.stdout.on("data", (data) => {
      appendLog(key, data.toString());
    });

    child.stderr.on("data", (data) => {
      appendLog(key, data.toString());
    });

    child.on("error", (err) => {
      appendLog(key, `\n[spawn error] ${err?.message || String(err)}\n`);
      delete running[key];

      if (meta[key]) {
        meta[key].status = "exited";
        meta[key].exitCode = 1;
        meta[key].signal = null;
        meta[key].exitedAt = Date.now();
      }

      const anyRunning = Object.keys(running).some((k) => k.startsWith(`${roomId}:`));
      Room.findByIdAndUpdate(roomId, { isRunning: anyRunning }).catch(() => {});
    });

    child.on("close", (code, signal) => {
      appendLog(key, `\n[process exited] code=${code} signal=${signal || ""}\n`);
      delete running[key];

      if (meta[key]) {
        meta[key].status = "exited";
        meta[key].exitCode = typeof code === "number" ? code : null;
        meta[key].signal = signal || null;
        meta[key].exitedAt = Date.now();
      }

      const anyRunning = Object.keys(running).some((k) => k.startsWith(`${roomId}:`));
      Room.findByIdAndUpdate(roomId, { isRunning: anyRunning }).catch(() => {});
    });

    room.isRunning = true;
    await room.save();

    return res.json({
      message: "Started",
      previewUrl: meta[key]?.previewUrl || null,
      meta: meta[key] || null,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const runProject = async (req, res) => {
  // Backwards-compatible endpoint: starts npm start in project root
  req.body = { ...req.body, npmArgs: ["start"], workdir: "" };
  return execNpm(req, res);
};

export const stopProject = async (req, res) => {
  try {
    const { roomId, workdir, signal } = req.body;
    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const allowedSignals = new Set(["SIGTERM", "SIGINT"]);
    const sig = allowedSignals.has(signal) ? signal : "SIGTERM";

    const killOne = (k) => {
      if (!running[k]) return;
      try {
        running[k].kill(sig);
      } catch {
        try {
          running[k].kill();
        } catch {}
      }
      delete running[k];

      appendLog(k, `\n[signal] ${sig}\n`);
      appendLog(k, "[stopped] process killed\n");

      if (meta[k]) {
        meta[k].status = "stopped";
        meta[k].exitCode = null;
        meta[k].signal = sig;
        meta[k].exitedAt = Date.now();
      }
    };

    // If workdir not provided, stop all processes for this room.
    if (workdir === undefined || workdir === null) {
      const keys = Object.keys(running).filter((k) => k.startsWith(`${roomId}:`));
      for (const k of keys) killOne(k);

      room.isRunning = false;
      await room.save();
      return res.json({ message: "Stopped" });
    }

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const key = processKey(roomId, workdirNorm);
    killOne(key);

    const anyRunning = Object.keys(running).some((k) => k.startsWith(`${roomId}:`));
    room.isRunning = anyRunning;
    await room.save();

    return res.json({ message: "Stopped" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getLogs = async (req, res) => {
  try {
    const { roomId, workdir } = req.query;
    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const key = processKey(roomId, workdirNorm);

    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === "string" ? Number.parseInt(sinceRaw, 10) : NaN;

    const all = logEvents[key] || [];
    const firstId = all.length ? all[0].id : 0;
    const lastId = all.length ? all[all.length - 1].id : 0;

    const canUseSince = Number.isFinite(since) && since >= 0;
    const dropped = canUseSince && all.length > 0 && since < firstId;

    const events = canUseSince ? all.filter((e) => e.id > since) : all;
    const nextSince = events.length ? events[events.length - 1].id : lastId;

    return res.json({
      logs: logs[key] || [],
      events,
      nextSince,
      dropped,
      running: Boolean(running[key]),
      previewUrl: meta[key]?.previewUrl || null,
      meta: meta[key] || null,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
