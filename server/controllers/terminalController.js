import path from "path";
import fs from "fs";
import { canWriteProject, findRoomByIdForUser } from "../utils/projectAccess.js";
import { SERVER_ROOT } from "../utils/serverPaths.js";

// In-memory terminal sessions (dev-only feature).
// Keyed by `${roomId}:${workdir}`.
const sessions = {}; // { [key]: { pty, events, seq, watchers:Set<fn>, meta } }

const processKey = (roomId, workdir) => `${roomId}:${workdir || ""}`;

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

const isEnabled = () => {
  // Must be explicitly enabled to avoid exposing arbitrary code execution by default.
  if (String(process.env.ENABLE_UNSAFE_TERMINAL || "").toLowerCase() !== "true") return false;
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") return false;
  return true;
};

const appendEvent = (key, chunk) => {
  const s = typeof chunk === "string" ? chunk : String(chunk ?? "");
  if (!s) return;

  const sess = sessions[key];
  if (!sess) return;

  const id = (sess.seq += 1);
  sess.events.push({ id, data: s });
  if (sess.events.length > 20000) {
    sess.events.splice(0, sess.events.length - 20000);
  }

  // wake any long-poll waiters
  const watchers = Array.from(sess.watchers);
  sess.watchers.clear();
  for (const fn of watchers) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
};

const withSystem32InPath = (envObj) => {
  if (process.platform !== "win32") return envObj;

  const env = { ...(envObj || {}) };
  const systemRoot = env.SystemRoot || env.WINDIR || "C:\\Windows";
  const system32 = path.join(systemRoot, "System32");

  // Windows env vars are case-insensitive, but Node may expose both.
  const key = typeof env.Path === "string" ? "Path" : "PATH";
  const current = String(env[key] || "");
  const lowerParts = current
    .split(";")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  if (!lowerParts.includes(system32.toLowerCase())) {
    env[key] = `${system32};${current}`;
  }

  return env;
};

const ensurePty = async () => {
  // node-pty is optional; use dynamic import so server can still start.
  try {
    const mod = await import("node-pty");
    return mod.default || mod;
  } catch {
    throw new Error(
      "node-pty is not installed. In server folder run: npm install node-pty (requires build tools on Windows)."
    );
  }
};

const pickShell = (shell) => {
  const s = typeof shell === "string" ? shell.toLowerCase() : "";

  // Windows: don't rely on PATH to resolve shell executables.
  // node-pty's Windows resolver uses the `Path` env var; if it doesn't include
  // `C:\\Windows\\System32`, spawning `cmd.exe`/`powershell.exe` can fail with
  // a confusing "File not found:".
  if (process.platform === "win32") {
    const systemRoot = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
    const cmdAbs = process.env.ComSpec || path.join(systemRoot, "System32", "cmd.exe");
    const powershellAbs = path.join(
      systemRoot,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe"
    );

    if (s === "cmd") return { file: cmdAbs, args: [] };
    // default powershell
    return { file: powershellAbs, args: ["-NoLogo"] };
  }

  // Non-Windows fallback
  if (s === "sh") return { file: "sh", args: [] };
  return { file: process.env.SHELL || "bash", args: [] };
};

export const openTerminal = async (req, res) => {
  try {
    if (!isEnabled()) {
      return res.status(403).json({
        message:
          "Terminal is disabled. Set ENABLE_UNSAFE_TERMINAL=true (and NODE_ENV!=production) to enable.",
      });
    }

    const { roomId, workdir, shell, cols, rows } = req.body || {};

    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const cwd = getCwd(room, workdirNorm);
    if (!cwd) return res.status(400).json({ message: "Invalid workdir" });

    const key = processKey(roomId, workdirNorm);

    if (!sessions[key]) {
      const pty = await ensurePty();
      const chosen = pickShell(shell);
      const c = Number.isFinite(cols) ? Math.max(20, Math.min(300, cols)) : 120;
      const r = Number.isFinite(rows) ? Math.max(5, Math.min(200, rows)) : 30;

      const term = pty.spawn(chosen.file, chosen.args, {
        name: "xterm-256color",
        cwd,
        env: withSystem32InPath({ ...process.env, TERM: "xterm-256color" }),
        cols: c,
        rows: r,
      });

      sessions[key] = {
        pty: term,
        events: [],
        seq: 0,
        watchers: new Set(),
        meta: {
          cwd,
          workdir: workdirNorm,
          shell: chosen.file,
          startedAt: Date.now(),
          status: "running",
        },
      };

      term.onData((data) => appendEvent(key, data));
      term.onExit(({ exitCode, signal }) => {
        appendEvent(key, `\n[terminal exited] code=${exitCode} signal=${signal ?? ""}\n`);
        if (sessions[key]) {
          sessions[key].meta.status = "exited";
          sessions[key].meta.exitCode = exitCode;
          sessions[key].meta.signal = signal ?? null;
          sessions[key].meta.exitedAt = Date.now();
        }
      });

      // Show a small header like VS Code
      appendEvent(key, `[cwd] ${cwd}\n`);
      appendEvent(key, `[shell] ${chosen.file}\n\n`);
    }

    const sess = sessions[key];
    return res.json({
      message: "Opened",
      nextSince: sess.events.length ? sess.events[sess.events.length - 1].id : 0,
      events: sess.events,
      meta: sess.meta,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    return res.status(500).json({ message: msg });
  }
};

export const terminalInput = async (req, res) => {
  try {
    if (!isEnabled()) {
      return res.status(403).json({ message: "Terminal disabled" });
    }

    const { roomId, workdir, data } = req.body || {};

    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const key = processKey(roomId, workdirNorm);
    const sess = sessions[key];
    if (!sess || !sess.pty) return res.status(409).json({ message: "Terminal not open" });

    const s = typeof data === "string" ? data : String(data ?? "");
    if (!s) return res.json({ ok: true });

    // Avoid abuse: cap single write.
    if (s.length > 32768) return res.status(400).json({ message: "Input too large" });

    sess.pty.write(s);
    return res.json({ ok: true });
  } catch (err) {
    const msg = err?.message || String(err);
    return res.status(500).json({ message: msg });
  }
};

export const resizeTerminal = async (req, res) => {
  try {
    if (!isEnabled()) {
      return res.status(403).json({ message: "Terminal disabled" });
    }

    const { roomId, workdir, cols, rows } = req.body || {};

    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const key = processKey(roomId, workdirNorm);
    const sess = sessions[key];
    if (!sess || !sess.pty) return res.status(409).json({ message: "Terminal not open" });

    const c = Number.isFinite(cols) ? Math.max(20, Math.min(300, cols)) : null;
    const r = Number.isFinite(rows) ? Math.max(5, Math.min(200, rows)) : null;
    if (!c || !r) return res.status(400).json({ message: "Invalid size" });

    try {
      sess.pty.resize(c, r);
    } catch {
      // ignore
    }

    return res.json({ ok: true });
  } catch (err) {
    const msg = err?.message || String(err);
    return res.status(500).json({ message: msg });
  }
};

export const closeTerminal = async (req, res) => {
  try {
    if (!isEnabled()) {
      return res.status(403).json({ message: "Terminal disabled" });
    }

    const { roomId, workdir } = req.body || {};

    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const key = processKey(roomId, workdirNorm);
    const sess = sessions[key];
    if (sess?.pty) {
      try {
        sess.pty.kill();
      } catch {
        // ignore
      }
    }

    delete sessions[key];
    return res.json({ message: "Closed" });
  } catch (err) {
    const msg = err?.message || String(err);
    return res.status(500).json({ message: msg });
  }
};

export const getTerminalLogs = async (req, res) => {
  try {
    if (!isEnabled()) {
      return res.status(403).json({ message: "Terminal disabled" });
    }

    const { roomId, workdir } = req.query;
    const room = await getRoomForUserWrite(roomId, req.user._id);
    if (!room) return res.status(404).json({ message: "Not found" });
    if (room.forbidden) return res.status(403).json({ message: "Forbidden" });

    const workdirNorm = normalizeWorkdir(workdir);
    if (workdirNorm === null) return res.status(400).json({ message: "Invalid workdir" });

    const key = processKey(roomId, workdirNorm);
    const sess = sessions[key];
    if (!sess) return res.status(409).json({ message: "Terminal not open" });

    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === "string" ? Number.parseInt(sinceRaw, 10) : NaN;
    const canUseSince = Number.isFinite(since) && since >= 0;

    const waitRaw = req.query.waitMs;
    const waitMs = typeof waitRaw === "string" ? Number.parseInt(waitRaw, 10) : 0;
    const wait = Number.isFinite(waitMs) ? Math.max(0, Math.min(20000, waitMs)) : 0;

    const read = () => {
      const all = sess.events || [];
      const firstId = all.length ? all[0].id : 0;
      const lastId = all.length ? all[all.length - 1].id : 0;
      const dropped = canUseSince && all.length > 0 && since < firstId;
      const events = canUseSince ? all.filter((e) => e.id > since) : all;
      const nextSince = events.length ? events[events.length - 1].id : lastId;
      return { events, nextSince, dropped, meta: sess.meta };
    };

    const snapshot = read();
    if (snapshot.events.length > 0 || wait === 0) {
      return res.json(snapshot);
    }

    let done = false;
    const wake = () => {
      if (done) return;
      done = true;
      return res.json(read());
    };

    sess.watchers.add(wake);

    const t = setTimeout(() => {
      sess.watchers.delete(wake);
      wake();
    }, wait);

    req.on("close", () => {
      clearTimeout(t);
      sess.watchers.delete(wake);
      done = true;
    });
  } catch (err) {
    const msg = err?.message || String(err);
    return res.status(500).json({ message: msg });
  }
};
