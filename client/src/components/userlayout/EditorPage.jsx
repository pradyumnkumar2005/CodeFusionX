import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";
import { io as createSocket } from "socket.io-client";
import API from "../../axiosConfig";
import FileTree from "../editor/FileTree";
import CodeEditor from "../editor/Editor";
import {
  createDir,
  createFile,
  deletePath,
  readFile,
  renamePath,
  writeFile,
} from "../../api/fsApi";
import {
  closeTerminal as apiCloseTerminal,
  getTerminalLogs as apiGetTerminalLogs,
  openTerminal as apiOpenTerminal,
  resizeTerminal as apiResizeTerminal,
  sendTerminalInput as apiSendTerminalInput,
} from "../../api/termApi";
import {
  getCollaborators as apiGetCollaborators,
  inviteCollaborator as apiInviteCollaborator,
  listMyInvites as apiListMyInvites,
  removeCollaborator as apiRemoveCollaborator,
  revokeInvite as apiRevokeInvite,
  acceptInvite as apiAcceptInvite,
  declineInvite as apiDeclineInvite,
  updateCollaboratorRole as apiUpdateCollaboratorRole,
} from "../../api/projectApi";

const normalizePath = (p) => (p || "").replace(/\\/g, "/");
const baseName = (p) => normalizePath(p).split("/").filter(Boolean).pop() || p;
const getProjectIdFromPath = (p) => {
  const parts = normalizePath(p).split("/").filter(Boolean);
  if (parts[0] !== "projects" || !parts[1]) return "";
  return parts[1];
};
const extractFirstLocalUrl = (chunks) => {
  const text = Array.isArray(chunks) ? chunks.join("") : String(chunks || "");
  const m = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/\S*)?/i);
  return m ? m[0] : null;
};

const formatTerminalError = (msg) => `\n[error] ${msg}\n`;

export default function EditorPage() {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [projectPath, setProjectPath] = useState("");

  const [myInvites, setMyInvites] = useState([]);
  const [myInvitesLoading, setMyInvitesLoading] = useState(false);
  const [myInvitesError, setMyInvitesError] = useState("");

  const [accessRole, setAccessRole] = useState("owner");
  const canWrite = accessRole === "owner" || accessRole === "editor";

  const [collabInfo, setCollabInfo] = useState({
    owner: null,
    collaborators: [],
    pendingInvites: [],
  });
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState("");

  const [currentDir, setCurrentDir] = useState("");
  const [openFiles, setOpenFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);

  const [treeRefreshKey, setTreeRefreshKey] = useState(0);

  const [showTerminal, setShowTerminal] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const AUTOSAVE_DELAY_MS = 900;
  const autosaveTimerRef = useRef(null);

  const [workdir, setWorkdir] = useState("");
  const [command, setCommand] = useState("start");
  const [commandLine, setCommandLine] = useState("");

  const [terminalMode, setTerminalMode] = useState("shell");
  const [shellKind, setShellKind] = useState("powershell");

  const TERMINAL_TABS_STORAGE_KEY = "codefusion.terminalTabs.v1";
  const loadTerminalTabsFromStorage = () => {
    try {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage?.getItem?.(TERMINAL_TABS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const tabs = Array.isArray(parsed?.tabs) ? parsed.tabs : null;
      if (!tabs || tabs.length === 0) return null;

      const cleaned = tabs
        .map((t) => ({
          id: typeof t?.id === "string" ? t.id : "",
          title: typeof t?.title === "string" ? t.title : "Terminal",
          terminalMode: t?.terminalMode === "shell" ? "shell" : "npm",
          workdir: typeof t?.workdir === "string" ? t.workdir : "",
          shellKind: t?.shellKind === "cmd" ? "cmd" : "powershell",
        }))
        .filter((t) => t.id);

      if (cleaned.length === 0) return null;

      const activeId =
        typeof parsed?.activeId === "string" &&
        cleaned.some((t) => t.id === parsed.activeId)
          ? parsed.activeId
          : cleaned[0].id;

      return { tabs: cleaned, activeId };
    } catch {
      return null;
    }
  };
  const saveTerminalTabsToStorage = (tabs, activeId) => {
    try {
      window.localStorage?.setItem?.(
        TERMINAL_TABS_STORAGE_KEY,
        JSON.stringify({ tabs, activeId }),
      );
    } catch {
      // ignore
    }
  };

  const [terminalTabs, setTerminalTabs] = useState(() => {
    const saved = loadTerminalTabsFromStorage();
    return (
      saved?.tabs || [
        {
          id: "term-1",
          title: "Terminal 1",
          terminalMode: "shell",
          workdir: "",
          shellKind: "powershell",
        },
      ]
    );
  });
  const [activeTerminalTabId, setActiveTerminalTabId] = useState(() => {
    return loadTerminalTabsFromStorage()?.activeId || "term-1";
  });
  const nextTerminalTabNumRef = useRef(2);
  const terminalTabsRuntimeRef = useRef({});
  const didInitTerminalTabsRef = useRef(false);

  const activeTerminalTab = useMemo(
    () =>
      terminalTabs.find((t) => t.id === activeTerminalTabId) ||
      terminalTabs[0] ||
      null,
    [terminalTabs, activeTerminalTabId],
  );

  // Initialize terminal controls from the active tab once.
  useEffect(() => {
    saveTerminalTabsToStorage(terminalTabs, activeTerminalTabId);
    const tab =
      terminalTabs.find((t) => t.id === activeTerminalTabId) ||
      terminalTabs[0] ||
      null;
    if (!tab) return;
    didInitTerminalTabsRef.current = true;
    setTerminalMode(tab.terminalMode || "shell");
    setWorkdir(tab.workdir || "");
    setShellKind(tab.shellKind || "powershell");
  }, [terminalTabs, activeTerminalTabId]);

  const DEFAULT_TERMINAL_STATE = useMemo(
    () => ({ running: false, logs: [], previewUrl: null, meta: null }),
    [],
  );

  const [terminalInput, setTerminalInput] = useState("");
  const [terminal, setTerminal] = useState({
    running: false,
    logs: [],
    previewUrl: null,
    meta: null,
  });

  const [detectedUrl, setDetectedUrl] = useState(null);
  const [xtermReady, setXtermReady] = useState(false);

  const xtermHostRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const sinceRef = useRef(0);

  const terminalInputRef = useRef(null);
  const pollErrorShownRef = useRef(false);
  const pollDelayRef = useRef(1200);
  const consecutive429Ref = useRef(0);

  const legacyLogsModeRef = useRef(false);
  const legacyLogsIdxRef = useRef(0);

  const terminalResetKeyRef = useRef("");

  const socketRef = useRef(null);
  const socketProjectIdRef = useRef("");
  const projectPathRef = useRef("");
  const openFilesRef = useRef([]);
  const activePathRef = useRef(null);

  const saveActiveTerminalTabRuntime = () => {
    const tabId = activeTerminalTabId;
    if (!tabId) return;
    terminalTabsRuntimeRef.current[tabId] = {
      since: sinceRef.current || 0,
      pollErrorShown: Boolean(pollErrorShownRef.current),
      pollDelay: pollDelayRef.current || 1200,
      consecutive429: consecutive429Ref.current || 0,
      legacyLogsMode: Boolean(legacyLogsModeRef.current),
      legacyLogsIdx: legacyLogsIdxRef.current || 0,
      terminalResetKey: terminalResetKeyRef.current || "",
      detectedUrl,
      terminal,
    };
  };

  const restoreTerminalTabRuntime = (tabId) => {
    const rt = terminalTabsRuntimeRef.current[tabId];

    sinceRef.current = rt?.since || 0;
    pollErrorShownRef.current = Boolean(rt?.pollErrorShown);
    pollDelayRef.current =
      typeof rt?.pollDelay === "number" ? rt.pollDelay : 1200;
    consecutive429Ref.current =
      typeof rt?.consecutive429 === "number" ? rt.consecutive429 : 0;
    legacyLogsModeRef.current = Boolean(rt?.legacyLogsMode);
    legacyLogsIdxRef.current =
      typeof rt?.legacyLogsIdx === "number" ? rt.legacyLogsIdx : 0;
    terminalResetKeyRef.current = rt?.terminalResetKey || "";

    setDetectedUrl(rt?.detectedUrl || null);
    setTerminal(rt?.terminal || DEFAULT_TERMINAL_STATE);
  };

  const switchTerminalTab = (tabId) => {
    if (!tabId || tabId === activeTerminalTabId) return;
    saveActiveTerminalTabRuntime();

    const tab = terminalTabs.find((t) => t.id === tabId) || null;
    setActiveTerminalTabId(tabId);
    setTerminalMode(tab?.terminalMode || "shell");
    setWorkdir(tab?.workdir || "");
    setShellKind(tab?.shellKind || "powershell");
    restoreTerminalTabRuntime(tabId);
  };

  const addTerminalTab = () => {
    const n = nextTerminalTabNumRef.current++;
    const id = `term-${Date.now()}-${n}`;
    saveActiveTerminalTabRuntime();
    const tab = {
      id,
      title: `Terminal ${n}`,
      terminalMode: "shell",
      workdir: "",
      shellKind: "powershell",
    };

    setTerminalTabs((prev) => {
      const next = [...prev, tab];
      saveTerminalTabsToStorage(next, id); // ← write immediately
      return next;
    });
    setActiveTerminalTabId(id);
    setTerminalMode(tab.terminalMode);
    setWorkdir(tab.workdir);
    setShellKind(tab.shellKind);
    restoreTerminalTabRuntime(id);
  };

  // Keep active tab config in sync with current terminal controls.
  useEffect(() => {
    if (!didInitTerminalTabsRef.current) return;
    setTerminalTabs((tabs) =>
      tabs.map((t) =>
        t.id === activeTerminalTabId
          ? { ...t, terminalMode, workdir, shellKind }
          : t,
      ),
    );
  }, [activeTerminalTabId, terminalMode, workdir, shellKind]);

  // Persist terminal tabs across refresh.
  useEffect(() => {
    if (!didInitTerminalTabsRef.current) return;
    try {
      if (typeof window === "undefined") return;
      window.localStorage?.setItem?.(
        TERMINAL_TABS_STORAGE_KEY,
        JSON.stringify({ tabs: terminalTabs, activeId: activeTerminalTabId }),
      );
    } catch {
      // ignore
    }
  }, [terminalTabs, activeTerminalTabId]);

  const shellInputBufRef = useRef("");
  const shellInputTimerRef = useRef(null);
  const shellOnDataDisposeRef = useRef(null);
  const shellIsOpenRef = useRef(false);
  const shellOpenErrShownRef = useRef(false);

  const npmLineBufRef = useRef("");
  const npmOnDataDisposeRef = useRef(null);
  const npmEscSeqRef = useRef(false);

  const roomIdRef = useRef("");
  const workdirRef = useRef("");
  const terminalModeRef = useRef("shell");
  const shellKindRef = useRef("powershell");

  const dirtyFiles = useMemo(() => {
    const s = new Set();
    for (const f of openFiles) {
      if (f.saved !== f.content) s.add(f.path);
    }
    return s;
  }, [openFiles]);

  const activeFile = useMemo(
    () => openFiles.find((f) => f.path === activePath) || null,
    [openFiles, activePath],
  );

  const saveFileByPath = useCallback(
    async (filePath, { silent = false } = {}) => {
      const fp = normalizePath(filePath);
      if (!fp) return;
      if (!canWrite) {
        if (!silent) setSaveError("Read-only access.");
        return;
      }

      const file = (openFilesRef.current || []).find(
        (f) => normalizePath(f.path) === fp,
      );
      if (!file) return;
      if (file.saved === file.content) return;

      if (saving) {
        // avoid overlapping writes; try again shortly
        if (autosaveTimerRef.current) return;
        autosaveTimerRef.current = window.setTimeout(() => {
          autosaveTimerRef.current = null;
          saveFileByPath(fp, { silent: true });
        }, 250);
        return;
      }

      const contentToSave = file.content;

      setSaving(true);
      if (!silent) setSaveError("");

      try {
        await writeFile(fp, contentToSave);
        setOpenFiles((prev) =>
          prev.map((f) => {
            if (normalizePath(f.path) !== fp) return f;
            // If user kept typing while we saved, don't clobber dirty state.
            if (f.content !== contentToSave) return f;
            return { ...f, saved: contentToSave };
          }),
        );
      } catch {
        if (!silent) setSaveError("Unable to save file.");
      } finally {
        setSaving(false);
      }
    },
    [canWrite, saving],
  );

  // Autosave the active file after typing pauses.
  useEffect(() => {
    if (autosaveTimerRef.current) {
      try {
        window.clearTimeout(autosaveTimerRef.current);
      } catch {
        // ignore
      }
      autosaveTimerRef.current = null;
    }

    if (!canWrite) return;
    if (!activeFile?.path) return;
    if (activeFile.saved === activeFile.content) return;

    const fp = activeFile.path;
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      saveFileByPath(fp, { silent: true });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (!autosaveTimerRef.current) return;
      try {
        window.clearTimeout(autosaveTimerRef.current);
      } catch {
        // ignore
      }
      autosaveTimerRef.current = null;
    };
  }, [activeFile?.path, activeFile?.content, activeFile?.saved, canWrite, saveFileByPath]);

  const derivedPreviewUrl = useMemo(
    () =>
      terminal.previewUrl || detectedUrl || extractFirstLocalUrl(terminal.logs),
    [terminal.previewUrl, detectedUrl, terminal.logs],
  );

  const cwdLabel = useMemo(() => {
    const base = projectPath || "";
    const wd = (workdir || "").replace(/\\/g, "/").replace(/^\//, "");
    return wd ? `${base}/${wd}` : base;
  }, [projectPath, workdir]);

  const statusTone = useMemo(() => {
    if (terminal.running) return "running";
    const exitCode = terminal.meta?.exitCode;
    if (typeof exitCode === "number" && exitCode !== 0) return "error";
    return "stopped";
  }, [terminal.running, terminal.meta]);

  useEffect(() => {
    roomIdRef.current = roomId;
    workdirRef.current = workdir;
    terminalModeRef.current = terminalMode;
    shellKindRef.current = shellKind;
  }, [roomId, workdir, terminalMode, shellKind]);

  useEffect(() => {
    projectPathRef.current = projectPath;
  }, [projectPath]);

  useEffect(() => {
    openFilesRef.current = openFiles;
  }, [openFiles]);

  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);

  // Realtime FS updates (create/change/delete) via Socket.IO.
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const socketUrl = String(apiBase).replace(/\/api\/?$/i, "");

    const socket = createSocket(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    let refreshTimer = null;
    const scheduleTreeRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        setTreeRefreshKey((k) => k + 1);
      }, 120);
    };

    const reloadFileIfClean = async (filePath) => {
      const fp = normalizePath(filePath);
      const file = (openFilesRef.current || []).find(
        (f) => normalizePath(f.path) === fp,
      );
      if (!file) return;
      if (file.saved !== file.content) return;

      try {
        const res = await readFile(fp);
        const content = res.data?.content ?? "";
        setOpenFiles((prev) =>
          prev.map((f) =>
            normalizePath(f.path) === fp
              ? { ...f, content, saved: content, loading: false }
              : f,
          ),
        );
      } catch {
        // ignore
      }
    };

    const removeOpenFilesUnder = (targetPath) => {
      const target = normalizePath(targetPath);
      const prefix = `${target}/`;

      setOpenFiles((prev) => {
        const next = prev.filter((f) => {
          const p = normalizePath(f.path);
          return p !== target && !p.startsWith(prefix);
        });

        const ap = normalizePath(activePathRef.current || "");
        const removedActive = ap && (ap === target || ap.startsWith(prefix));
        if (removedActive) {
          setActivePath(next[0]?.path || null);
        }

        return next;
      });
    };

    const onFsChanged = (payload) => {
      const currentProjectId = socketProjectIdRef.current;
      if (!payload || payload.projectId !== currentProjectId) return;

      scheduleTreeRefresh();

      const changed = normalizePath(payload.path);
      const kind = payload.kind;
      const projectRoot = normalizePath(projectPathRef.current);
      if (!changed || !projectRoot) return;
      if (changed !== projectRoot && !changed.startsWith(projectRoot + "/")) {
        return;
      }

      if (kind === "unlink" || kind === "unlinkDir") {
        removeOpenFilesUnder(changed);
        return;
      }

      if (kind === "change") {
        const ap = normalizePath(activePathRef.current || "");
        if (ap && ap === changed) {
          reloadFileIfClean(ap);
        }
      }
    };

    socket.on("fs:changed", onFsChanged);

    return () => {
      try {
        socket.off("fs:changed", onFsChanged);
      } catch {
        // ignore
      }

      if (refreshTimer) {
        try {
          window.clearTimeout(refreshTimer);
        } catch {
          // ignore
        }
        refreshTimer = null;
      }

      try {
        socket.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
    };
  }, []);

  // Join/leave the current project's realtime stream.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const nextId = getProjectIdFromPath(projectPath);
    const prevId = socketProjectIdRef.current;

    if (prevId && prevId !== nextId) {
      try {
        socket.emit("fs:leave", { projectId: prevId });
      } catch {
        // ignore
      }
    }

    socketProjectIdRef.current = nextId;

    if (nextId) {
      try {
        socket.emit("fs:join", { projectId: nextId, projectPath });
      } catch {
        // ignore
      }
    }
  }, [projectPath]);

  const refreshRooms = useCallback(
    async ({ keepSelection = true, selectRoomId = null } = {}) => {
      try {
        const r = await API.get("/room");
        const list = Array.isArray(r.data) ? r.data : [];
        setRooms(list);

        if (list.length === 0) {
          setRoomId("");
          setAccessRole("owner");
          setProjectPath("");
          setCurrentDir("");
          return;
        }

        const preferredId =
          typeof selectRoomId === "string" && selectRoomId
            ? selectRoomId
            : keepSelection
              ? roomIdRef.current
              : "";

        const next = preferredId
          ? list.find((x) => x._id === preferredId) || list[0]
          : list[0];

        setRoomId(next._id);
        setAccessRole(next.accessRole || "owner");
        const p = normalizePath(next.path);
        setProjectPath(p);
        setCurrentDir(p);
      } catch {
        setRooms([]);
      }
    },
    [],
  );

  const refreshMyInvites = useCallback(async () => {
    setMyInvitesLoading(true);
    setMyInvitesError("");
    try {
      const res = await apiListMyInvites();
      setMyInvites(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMyInvites([]);
      setMyInvitesError("Unable to load invites.");
    } finally {
      setMyInvitesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRooms({ keepSelection: false });
  }, [refreshRooms]);

  useEffect(() => {
    refreshMyInvites();
  }, [refreshMyInvites]);

  useEffect(() => {
    const onFocus = () => {
      refreshRooms({ keepSelection: true });
      refreshMyInvites();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshRooms, refreshMyInvites]);

  useEffect(() => {
    const handler = (e) => {
      if (dirtyFiles.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyFiles.size]);

  useEffect(() => {
    if (!roomId) return;
    const room = rooms.find((x) => x._id === roomId);
    if (!room) return;

    setAccessRole(room.accessRole || "owner");

    const p = normalizePath(room.path);
    setProjectPath(p);
    setCurrentDir(p);
    setOpenFiles([]);
    setActivePath(null);
    setSaveError("");
    setTreeRefreshKey((k) => k + 1);

    let active = true;
    setCollabLoading(true);
    setCollabError("");
    apiGetCollaborators(roomId)
      .then((res) => {
        if (!active) return;
        const data = res.data || {};
        setCollabInfo({
          owner: data.owner || null,
          collaborators: Array.isArray(data.collaborators)
            ? data.collaborators
            : [],
          pendingInvites: Array.isArray(data.pendingInvites)
            ? data.pendingInvites
            : [],
        });
      })
      .catch(() => {
        if (!active) return;
        setCollabInfo({ owner: null, collaborators: [], pendingInvites: [] });
        setCollabError("Unable to load collaborators.");
      })
      .finally(() => {
        if (!active) return;
        setCollabLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roomId, rooms]);

  const openFile = async (filePath) => {
    if (!filePath) return;

    setSaveError("");
    setActivePath(filePath);
    setCurrentDir(normalizePath(filePath).split("/").slice(0, -1).join("/"));

    const existing = openFiles.find((f) => f.path === filePath);
    if (existing) return;

    setOpenFiles((prev) => [
      ...prev,
      {
        path: filePath,
        name: baseName(filePath),
        content: "",
        saved: "",
        loading: true,
      },
    ]);

    try {
      const res = await readFile(filePath);
      const content = res.data?.content ?? "";
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === filePath
            ? { ...f, content, saved: content, loading: false }
            : f,
        ),
      );
    } catch {
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === filePath
            ? { ...f, content: "", saved: "", loading: false }
            : f,
        ),
      );
      setSaveError("Unable to load file.");
    }
  };

  const closeTab = (filePath) => {
    const file = openFiles.find((f) => f.path === filePath);
    const isDirty = file && file.saved !== file.content;
    if (isDirty) {
      const ok = window.confirm("You have unsaved changes. Close anyway?");
      if (!ok) return;
    }

    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== filePath);
      if (activePath === filePath) {
        setActivePath(next[0]?.path || null);
      }
      return next;
    });
  };

  const updateActiveContent = (nextValue) => {
    if (!activePath) return;
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.path === activePath ? { ...f, content: nextValue } : f,
      ),
    );
  };

  const saveActive = async () => {
    if (!activeFile || saving) return;
    if (!canWrite) {
      setSaveError("Read-only access.");
      return;
    }
    if (activeFile.saved === activeFile.content) return;

    setSaving(true);
    setSaveError("");
    try {
      await writeFile(activeFile.path, activeFile.content);
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === activeFile.path ? { ...f, saved: f.content } : f,
        ),
      );
    } catch {
      setSaveError("Unable to save file.");
    } finally {
      setSaving(false);
    }
  };

  const promptName = (label) => {
    const name = window.prompt(label);
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (trimmed.includes("\0")) return null;
    if (trimmed.includes("/") || trimmed.includes("\\")) return null;
    if (trimmed === "." || trimmed === "..") return null;
    return trimmed;
  };

  const newFolder = async () => {
    if (!projectPath) return;
    const name = promptName("Folder name");
    if (!name) return;

    const dirPath = `${currentDir || projectPath}/${name}`;
    try {
      await createDir(dirPath);
      setTreeRefreshKey((k) => k + 1);
      setCurrentDir(dirPath);
    } catch {
      setSaveError("Unable to create folder.");
    }
  };

  const newFile = async () => {
    if (!projectPath) return;
    const name = promptName("File name (with extension, e.g. index.js)");
    if (!name) return;

    const filePath = `${currentDir || projectPath}/${name}`;
    try {
      await createFile(filePath, "");
      setTreeRefreshKey((k) => k + 1);
      await openFile(filePath);
    } catch {
      setSaveError("Unable to create file.");
    }
  };

  const renameEntry = async (fullPath, type) => {
    if (!fullPath) return;

    const newName = promptName("New name");
    if (!newName) return;

    const parts = normalizePath(fullPath).split("/").filter(Boolean);
    const oldName = parts.pop();
    if (!oldName) return;

    const newPath = `${parts.join("/")}/${newName}`;

    try {
      await renamePath(fullPath, newPath);

      setOpenFiles((prev) =>
        prev.map((f) => {
          if (type === "dir") {
            const prefix = `${normalizePath(fullPath)}/`;
            if (normalizePath(f.path) === normalizePath(fullPath)) {
              return { ...f, path: newPath, name: baseName(newPath) };
            }
            if (normalizePath(f.path).startsWith(prefix)) {
              const suffix = normalizePath(f.path).slice(prefix.length);
              const nextPath = `${normalizePath(newPath)}/${suffix}`;
              return { ...f, path: nextPath, name: baseName(nextPath) };
            }
            return f;
          }

          if (normalizePath(f.path) === normalizePath(fullPath)) {
            return { ...f, path: newPath, name: baseName(newPath) };
          }
          return f;
        }),
      );

      setActivePath((p) => {
        if (!p) return p;
        if (type === "dir") {
          const prefix = `${normalizePath(fullPath)}/`;
          if (normalizePath(p) === normalizePath(fullPath)) return newPath;
          if (normalizePath(p).startsWith(prefix)) {
            const suffix = normalizePath(p).slice(prefix.length);
            return `${normalizePath(newPath)}/${suffix}`;
          }
          return p;
        }

        return normalizePath(p) === normalizePath(fullPath) ? newPath : p;
      });

      if (type === "dir") {
        setCurrentDir((d) => {
          const nd = normalizePath(d);
          const old = normalizePath(fullPath);
          const prefix = `${old}/`;
          if (nd === old) return newPath;
          if (nd.startsWith(prefix)) {
            const suffix = nd.slice(prefix.length);
            return `${normalizePath(newPath)}/${suffix}`;
          }
          return d;
        });
      }

      setTreeRefreshKey((k) => k + 1);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Unable to rename.");
    }
  };

  const deleteEntry = async (fullPath, type) => {
    if (!fullPath) return;

    const isOpenDirty = openFiles.some(
      (f) =>
        normalizePath(f.path) === normalizePath(fullPath) &&
        f.saved !== f.content,
    );

    const ok = window.confirm(
      isOpenDirty
        ? "This item has unsaved changes. Delete anyway?"
        : `Delete ${type === "dir" ? "folder" : "file"}?`,
    );
    if (!ok) return;

    try {
      await deletePath(fullPath);

      setOpenFiles((prev) => {
        const next =
          type === "dir"
            ? (() => {
                const prefix = `${normalizePath(fullPath)}/`;
                return prev.filter(
                  (f) =>
                    normalizePath(f.path) !== normalizePath(fullPath) &&
                    !normalizePath(f.path).startsWith(prefix),
                );
              })()
            : prev.filter(
                (f) => normalizePath(f.path) !== normalizePath(fullPath),
              );

        if (activePath && !next.some((f) => f.path === activePath)) {
          setActivePath(next[0]?.path || null);
        }

        return next;
      });

      setTreeRefreshKey((k) => k + 1);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Unable to delete.");
    }
  };

  const xtermWrite = (text) => {
    const term = xtermRef.current;
    if (!term) return;
    const s = typeof text === "string" ? text : String(text ?? "");
    if (!s) return;
    term.write(s, () => term.scrollToBottom());
  };

  const xtermClear = () => {
    const term = xtermRef.current;
    if (!term) return;
    term.clear();
  };

  const pushTerminalLine = (line) => {
    const s = String(line || "");
    xtermWrite(s);
    setTerminal((t) => ({ ...t, logs: [...(t.logs || []), s].slice(-200) }));
  };

  const flushShellInput = async () => {
    if (terminalModeRef.current !== "shell") return;
    if (!roomIdRef.current) return;

    if (shellInputTimerRef.current) {
      window.clearTimeout(shellInputTimerRef.current);
      shellInputTimerRef.current = null;
    }

    const data = shellInputBufRef.current;
    if (!data) return;

    // Wait until PTY is open; otherwise input will 409 and nothing will echo.
    if (!shellIsOpenRef.current) {
      if (!shellOpenErrShownRef.current) {
        shellOpenErrShownRef.current = true;
        xtermWrite("\n[info] opening shell...\n");
      }
      // retry soon
      shellInputTimerRef.current = window.setTimeout(flushShellInput, 80);
      return;
    }

    // Clear buffer only after successful send.
    shellInputBufRef.current = "";

    try {
      await apiSendTerminalInput({
        roomId: roomIdRef.current,
        workdir: workdirRef.current,
        data,
      });
    } catch (err) {
      // Restore buffer so user input isn't lost.
      shellInputBufRef.current = data + shellInputBufRef.current;

      const status = err?.response?.status;
      const msg = err?.response?.data?.message || "Unable to send input.";
      if (status === 409) {
        shellIsOpenRef.current = false;
      }

      xtermWrite(formatTerminalError(msg));
    }
  };

  const queueShellInput = (data) => {
    if (terminalModeRef.current !== "shell") return;

    const s = typeof data === "string" ? data : String(data ?? "");
    if (!s) return;

    shellInputBufRef.current += s;

    if (shellInputBufRef.current.length >= 2048) {
      flushShellInput();
      return;
    }

    if (shellInputTimerRef.current) return;
    shellInputTimerRef.current = window.setTimeout(flushShellInput, 30);
  };

  const validateWorkdir = (wd) => {
    const s = String(wd || "")
      .replace(/\\/g, "/")
      .trim();
    if (!s || s === ".") return null;
    if (s.includes("\0")) return "Invalid workdir.";
    if (s.startsWith("/")) return "Workdir must be relative.";
    if (/^[a-zA-Z]:/.test(s)) return "Workdir must be relative.";
    if (s.split("/").some((p) => p === ".."))
      return "Workdir cannot contain '..'";
    if (s.startsWith("projects/")) {
      return "Workdir must be relative to the project root (use 'client', not 'projects/.../client').";
    }
    return null;
  };

  useEffect(() => {
    const host = xtermHostRef.current;
    if (!host) return;
    if (xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      disableStdin: false,
      scrollback: 5000,
      fontFamily: "Consolas, 'Courier New', monospace",
      fontSize: 12,
      theme: { background: "#000000" },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    try {
      fit.fit();
    } catch {
      // ignore
    }

    let rafId = 0;
    const scheduleFit = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        try {
          fit.fit();
        } catch {
          // ignore
        }

        if (terminalModeRef.current === "shell" && roomIdRef.current) {
          apiResizeTerminal({
            roomId: roomIdRef.current,
            workdir: workdirRef.current,
            cols: term.cols,
            rows: term.rows,
          }).catch(() => {});
        }
      });
    };

    let ro;
    try {
      ro = new ResizeObserver(() => scheduleFit());
      ro.observe(host);
    } catch {
      // ignore
    }

    xtermRef.current = term;
    fitAddonRef.current = fit;
    setXtermReady(true);

    try {
      term.attachCustomKeyEventHandler((e) => {
        const isCtrlC =
          (e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C");
        if (isCtrlC) {
          try {
            if (
              typeof term.hasSelection === "function" &&
              term.hasSelection()
            ) {
              const selection =
                typeof term.getSelection === "function"
                  ? term.getSelection()
                  : "";
              if (selection) {
                navigator.clipboard?.writeText?.(selection).catch(() => {});
                try {
                  term.clearSelection?.();
                } catch {
                  // ignore
                }
                return false;
              }
            }
          } catch {
            // ignore
          }
        }

        return true;
      });
    } catch {
      // ignore
    }

    const onResize = () => {
      scheduleFit();
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      try {
        ro?.disconnect?.();
      } catch {
        // ignore
      }
      if (rafId) {
        try {
          window.cancelAnimationFrame(rafId);
        } catch {
          // ignore
        }
      }
      try {
        term.dispose();
      } catch {
        // ignore
      }
      xtermRef.current = null;
      fitAddonRef.current = null;
      setXtermReady(false);
    };
  }, []);

  useEffect(() => {
    if (!showTerminal) return;
    if (!xtermReady) return;
    const fit = fitAddonRef.current;
    if (!fit) return;

    let rafId = 0;
    rafId = window.requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        // ignore
      }
    });

    return () => {
      if (rafId) {
        try {
          window.cancelAnimationFrame(rafId);
        } catch {
          // ignore
        }
      }
    };
  }, [showTerminal, xtermReady]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    try {
      // Allow typing directly in the terminal area.
      // We route NPM-mode input through a client-side line buffer.
      term.setOption("disableStdin", false);
    } catch {
      // ignore
    }
  }, [terminalMode]);

  useEffect(() => {
    const resetKey =
      terminalMode === "shell"
        ? `${roomId}|${terminalMode}|${workdir || ""}`
        : `${roomId}|${terminalMode}`;

    const shouldReset = resetKey !== terminalResetKeyRef.current;
    if (shouldReset) {
      terminalResetKeyRef.current = resetKey;

      // When the context changes (refresh/tab/workdir/mode), don't replay old logs.
      // Use a sentinel so the poll loop can "attach" to the latest log position.
      sinceRef.current = terminalMode === "npm" ? -1 : 0;
      setDetectedUrl(null);
      pollErrorShownRef.current = false;
      pollDelayRef.current = 1200;
      consecutive429Ref.current = 0;
      legacyLogsModeRef.current = false;
      legacyLogsIdxRef.current = 0;
      xtermClear();
    }

    if (terminalMode !== "shell") {
      const label = cwdLabel || projectPath || "cwd";
      if (label) xtermWrite(`\n[cwd] ${label}\n`);
    }

    try {
      if (terminalMode === "shell") {
        xtermRef.current?.focus();
      } else {
        terminalInputRef.current?.focus();
      }
    } catch {
      // ignore
    }
  }, [roomId, workdir, cwdLabel, projectPath, terminalMode]);

  // NPM mode: allow typing directly inside xterm (Enter runs command).
  useEffect(() => {
    try {
      npmOnDataDisposeRef.current?.dispose?.();
    } catch {
      // ignore
    }
    npmOnDataDisposeRef.current = null;
    npmLineBufRef.current = "";
    npmEscSeqRef.current = false;

    if (terminalMode !== "npm") return;
    if (!xtermReady) return;

    const term = xtermRef.current;
    if (!term) return;

    npmOnDataDisposeRef.current = term.onData((data) => {
      if (terminalModeRef.current !== "npm") return;

      const s = typeof data === "string" ? data : String(data ?? "");
      if (!s) return;

      for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (npmEscSeqRef.current) {
          // Consume ANSI escape sequences (arrows, etc.).
          if (ch >= "@" && ch <= "~") {
            npmEscSeqRef.current = false;
          }
          continue;
        }

        // Enter
        if (ch === "\r") {
          const line = npmLineBufRef.current;
          npmLineBufRef.current = "";
          term.write("\r\n");
          runTerminalLine(line);
          continue;
        }

        // Backspace
        if (ch === "\u007f") {
          if (npmLineBufRef.current.length > 0) {
            npmLineBufRef.current = npmLineBufRef.current.slice(0, -1);
            term.write("\b \b");
          }
          continue;
        }

        // Ctrl+C (copy selection if present, otherwise interrupt)
        if (ch === "\u0003") {
          try {
            if (
              typeof term.hasSelection === "function" &&
              term.hasSelection()
            ) {
              const selection =
                typeof term.getSelection === "function"
                  ? term.getSelection()
                  : "";
              if (selection) {
                navigator.clipboard?.writeText?.(selection).catch(() => {});
                try {
                  term.clearSelection?.();
                } catch {
                  // ignore
                }
                continue;
              }
            }
          } catch {
            // ignore
          }

          npmLineBufRef.current = "";
          term.write("^C\r\n");
          interruptNpm();
          continue;
        }

        // Ctrl+L
        if (ch === "\u000c") {
          npmLineBufRef.current = "";
          xtermClear();
          return;
        }

        // Start consuming an ANSI escape sequence
        if (ch === "\u001b") {
          npmEscSeqRef.current = true;
          continue;
        }

        npmLineBufRef.current += ch;
        term.write(ch);
      }
    });

    return () => {
      try {
        npmOnDataDisposeRef.current?.dispose?.();
      } catch {
        // ignore
      }
      npmOnDataDisposeRef.current = null;
      npmLineBufRef.current = "";
      npmEscSeqRef.current = false;
    };
  }, [terminalMode, xtermReady, roomId]);

  useEffect(() => {
    if (terminalMode !== "shell") return;
    if (!roomId) return;
    if (!xtermReady) return;

    const term = xtermRef.current;
    const fit = fitAddonRef.current;
    if (!term || !fit) return;

    let cancelled = false;
    const ac = new AbortController();

    try {
      shellOnDataDisposeRef.current?.dispose?.();
    } catch {
      // ignore
    }
    shellOnDataDisposeRef.current = term.onData((data) => {
      queueShellInput(data);
    });

    const run = async () => {
      try {
        try {
          fit.fit();
        } catch {
          // ignore
        }

        const dims = (typeof fit.proposeDimensions === "function" &&
          fit.proposeDimensions()) || { cols: term.cols, rows: term.rows };

        sinceRef.current = 0;
        xtermClear();

        shellIsOpenRef.current = false;
        shellOpenErrShownRef.current = false;
        xtermWrite("\n[info] opening shell...\n");

        const openRes = await apiOpenTerminal({
          roomId,
          workdir,
          shell: shellKindRef.current || "powershell",
          cols: dims?.cols,
          rows: dims?.rows,
        });

        shellIsOpenRef.current = true;
        shellOpenErrShownRef.current = false;
        // Flush any keystrokes typed while the PTY was opening.
        flushShellInput();

        const openEvents = Array.isArray(openRes.data?.events)
          ? openRes.data.events
          : [];
        const openOut = openEvents.map((e) => e.data).join("");
        if (openOut) {
          xtermWrite(openOut);
          const url = extractFirstLocalUrl(openOut);
          if (url) setDetectedUrl(url);
        }

        const nextSince = openRes.data?.nextSince;
        if (typeof nextSince === "number" && Number.isFinite(nextSince)) {
          sinceRef.current = nextSince;
        }

        setTerminal((t) => ({
          ...t,
          running: true,
          meta: openRes.data?.meta || null,
        }));

        while (!cancelled) {
          const r = await apiGetTerminalLogs({
            roomId,
            workdir,
            since: sinceRef.current || 0,
            waitMs: 20000,
            signal: ac.signal,
          });

          const events = Array.isArray(r.data?.events) ? r.data.events : [];
          const out = events.map((e) => e.data).join("");
          if (out) {
            xtermWrite(out);
            const url = extractFirstLocalUrl(out);
            if (url) setDetectedUrl(url);
          }

          const ns = r.data?.nextSince;
          if (typeof ns === "number" && Number.isFinite(ns)) {
            sinceRef.current = ns;
          }

          if (r.data?.dropped) {
            xtermWrite("\n[warning] output truncated (buffer limit)\n");
          }

          setTerminal((t) => ({
            ...t,
            running: true,
            meta: r.data?.meta || t.meta,
          }));
        }
      } catch (err) {
        shellIsOpenRef.current = false;
        const status = err?.response?.status;
        const msg =
          err?.response?.data?.message ||
          (status === 403
            ? "Shell terminal is disabled on server. Enable it with ENABLE_UNSAFE_TERMINAL=true (dev only)."
            : "Unable to start shell terminal.");

        xtermWrite(`\n[error] ${msg}\n`);
        setSaveError(msg);
        setTerminal((t) => ({ ...t, running: false }));
      }
    };

    run();

    return () => {
      cancelled = true;
      shellIsOpenRef.current = false;
      try {
        ac.abort();
      } catch {
        // ignore
      }

      try {
        shellOnDataDisposeRef.current?.dispose?.();
      } catch {
        // ignore
      }
      shellOnDataDisposeRef.current = null;

      apiCloseTerminal({ roomId, workdir }).catch(() => {});
    };
  }, [terminalMode, roomId, workdir, xtermReady]);

  const runShellLine = async (lineOverride) => {
    if (!roomId) {
      const msg = "Select a project first.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
      return;
    }

    if (!shellIsOpenRef.current) {
      pushTerminalLine(
        "\n[info] shell is still opening — wait for the header ([cwd]/[shell]) then retry.\n",
      );
      return;
    }

    const wdErr = validateWorkdir(workdir);
    if (wdErr) {
      setSaveError(wdErr);
      pushTerminalLine(formatTerminalError(wdErr));
      return;
    }

    const quick = {
      install: "npm install",
      ci: "npm ci",
      start: "npm start",
      test: "npm test",
      build: "npm run build",
      dev: "npm run dev",
    };

    const raw = typeof lineOverride === "string" ? lineOverride : "";
    const line = String(raw || commandLine || quick[command] || "").trim();
    if (!line) return;

    try {
      await apiSendTerminalInput({ roomId, workdir, data: line + "\r" });
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to run command.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
    }
  };

  const runNpm = async (lineOverride, workdirOverride) => {
    if (!roomId) {
      const msg = "Select a project first.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
      return;
    }

    const effectiveWorkdir =
      typeof workdirOverride === "string" ? workdirOverride : workdir;

    const wdErr = validateWorkdir(effectiveWorkdir);
    if (wdErr) {
      setSaveError(wdErr);
      pushTerminalLine(formatTerminalError(wdErr));
      return;
    }

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

    const argsByCommand = {
      install: ["install"],
      ci: ["ci"],
      start: ["start"],
      test: ["test"],
      build: ["run", "build"],
      dev: ["run", "dev"],
    };

    let npmArgs = argsByCommand[command] || ["start"];

    const lineText =
      typeof lineOverride === "string" ? lineOverride : undefined;
    const line = String(lineText ?? commandLine ?? "").trim();
    if (line) {
      const tokens = line
        .split(/\s+/)
        .map((x) => x.replace(/^"+|"+$/g, ""))
        .filter(Boolean);
      let t = tokens;
      if (t[0] === "npm") t = t.slice(1);

      const verb = t[0];
      if (!verb || !allowedVerbs.has(verb)) {
        const msg =
          "Only npm commands are supported (install/ci/uninstall/update/start/test/run).";
        setSaveError(msg);
        pushTerminalLine(formatTerminalError(msg));
        return;
      }

      npmArgs = t;
    }

    try {
      sinceRef.current = 0;
      setDetectedUrl(null);
      pollErrorShownRef.current = false;
      pollDelayRef.current = 1200;
      consecutive429Ref.current = 0;
      legacyLogsModeRef.current = false;
      legacyLogsIdxRef.current = 0;

      const base = projectPath || "";
      const wd = (effectiveWorkdir || "")
        .replace(/\\/g, "/")
        .replace(/^\//, "");
      const label = wd ? `${base}/${wd}` : base || "cwd";
      if (label) xtermWrite(`\n[cwd] ${label}\n`);

      if (line) {
        xtermWrite(`[cmd] ${line}\n`);
      }

      const startRes = await API.post("/run/exec", {
        roomId,
        workdir: effectiveWorkdir,
        npmArgs,
      });
      setTerminal((t) => ({
        ...t,
        running: true,
        meta: startRes.data?.meta || t.meta,
        previewUrl: startRes.data?.previewUrl || t.previewUrl || null,
      }));
      xtermWrite("\n[info] started, waiting for output...\n");

      const logsRes = await API.get("/run/logs", {
        params: { roomId, workdir: effectiveWorkdir, since: 0 },
      });

      const events = Array.isArray(logsRes.data?.events)
        ? logsRes.data.events
        : null;
      const legacy = Array.isArray(logsRes.data?.logs)
        ? logsRes.data.logs
        : null;

      if (events && events.length) {
        const out = events.map((e) => e.data).join("");
        if (out) {
          xtermWrite(out);
          const url = extractFirstLocalUrl(out);
          if (url) setDetectedUrl(url);
        }
      } else if (legacy && legacy.length) {
        legacyLogsModeRef.current = true;
        legacyLogsIdxRef.current = legacy.length;

        const out = legacy.join("");
        if (out) {
          xtermWrite(out);
          const url = extractFirstLocalUrl(out);
          if (url) setDetectedUrl(url);
        }
      }

      const nextSince = logsRes.data?.nextSince;
      if (typeof nextSince === "number" && Number.isFinite(nextSince)) {
        sinceRef.current = nextSince;
      }

      setTerminal({
        running: logsRes.data?.running,
        logs: logsRes.data?.logs || [],
        previewUrl:
          logsRes.data?.previewUrl || startRes.data?.previewUrl || null,
        meta: logsRes.data?.meta || startRes.data?.meta || null,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to run command.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
      setTerminal((t) => ({ ...t, running: false }));
    }
  };

  const startService = async (serviceWorkdir) => {
    if (!canWrite) return;
    setTerminalMode("npm");
    setCommand("start");
    setCommandLine("");
    setWorkdir(serviceWorkdir);
    return runNpm("npm start", serviceWorkdir);
  };

  const startClientAndServer = async () => {
    if (!canWrite) return;
    if (!roomId) {
      const msg = "Select a project first.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
      return;
    }

    setTerminalMode("npm");
    setCommand("start");
    setCommandLine("");

    // Start server in background (logs visible when you switch workdir to 'server').
    let serverInfo = null;
    try {
      await API.post("/run/exec", {
        roomId,
        workdir: "server",
        npmArgs: ["start"],
      });
      serverInfo =
        "\n[info] started server (workdir=server). Switch workdir to view logs.\n";
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to start server.";
      serverInfo = formatTerminalError(msg);
    }

    // Show client output in the terminal.
    setWorkdir("client");
    await runNpm("npm start", "client");
    if (serverInfo) xtermWrite(serverInfo);
  };

  const stopNpm = async () => {
    if (!roomId) return;

    if (terminalMode === "shell") {
      try {
        await apiCloseTerminal({ roomId, workdir });
        xtermWrite("\n[stopped] terminal closed\n");
        setTerminal((t) => ({ ...t, running: false }));
      } catch (err) {
        const msg = err?.response?.data?.message || "Unable to stop terminal.";
        setSaveError(msg);
        pushTerminalLine(formatTerminalError(msg));
      }
      return;
    }

    try {
      await API.post("/run/stop", { roomId, workdir });
      const logsRes = await API.get("/run/logs", {
        params: { roomId, workdir },
      });
      setTerminal({
        running: logsRes.data?.running,
        logs: logsRes.data?.logs || [],
        previewUrl: logsRes.data?.previewUrl || null,
        meta: logsRes.data?.meta || null,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to stop command.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
    }
  };

  const interruptNpm = async () => {
    if (!roomId) return;

    if (terminalMode === "shell") {
      try {
        await apiSendTerminalInput({ roomId, workdir, data: "\x03" });
      } catch (err) {
        const msg = err?.response?.data?.message || "Unable to send Ctrl+C.";
        setSaveError(msg);
        pushTerminalLine(formatTerminalError(msg));
      }
      return;
    }

    try {
      await API.post("/run/stop", { roomId, workdir, signal: "SIGINT" });
      const logsRes = await API.get("/run/logs", {
        params: { roomId, workdir },
      });
      setTerminal({
        running: logsRes.data?.running,
        logs: logsRes.data?.logs || [],
        previewUrl: logsRes.data?.previewUrl || null,
        meta: logsRes.data?.meta || null,
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Unable to interrupt command.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
    }
  };

  const stopAll = async () => {
    if (!roomId) return;
    try {
      await API.post("/run/stop", { roomId });
      const logsRes = await API.get("/run/logs", {
        params: { roomId, workdir },
      });
      setTerminal({
        running: logsRes.data?.running,
        logs: logsRes.data?.logs || [],
        previewUrl: logsRes.data?.previewUrl || null,
        meta: logsRes.data?.meta || null,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Unable to stop command.";
      setSaveError(msg);
      pushTerminalLine(formatTerminalError(msg));
    }
  };

  useEffect(() => {
    if (!roomId) return;
    if (terminalMode !== "npm") return;

    let cancelled = false;
    let timeoutId;

    const tick = async () => {
      if (cancelled) return;
      try {
        // Attach mode: on refresh/tab switch/workdir change we don't want to replay history.
        if (sinceRef.current === -1) {
          const attachRes = await API.get("/run/logs", {
            params: { roomId, workdir, since: 0 },
          });

          if (cancelled) return;

          pollErrorShownRef.current = false;
          consecutive429Ref.current = 0;
          pollDelayRef.current = attachRes.data?.running ? 1200 : 3000;

          const nextSince = attachRes.data?.nextSince;
          if (typeof nextSince === "number" && Number.isFinite(nextSince)) {
            sinceRef.current = nextSince;
          } else {
            // fallback to 0
            sinceRef.current = 0;
          }

          setTerminal((t) => ({
            ...t,
            running: Boolean(attachRes.data?.running),
            previewUrl: attachRes.data?.previewUrl || null,
            meta: attachRes.data?.meta || null,
          }));

          // Show a stable header so it doesn't feel like it "switches back".
          const label = cwdLabel || projectPath || "cwd";
          if (label) xtermWrite(`\n[cwd] ${label}\n`);

          timeoutId = setTimeout(tick, pollDelayRef.current);
          return;
        }

        const res = await API.get("/run/logs", {
          params: { roomId, workdir, since: sinceRef.current || 0 },
        });

        pollErrorShownRef.current = false;
        consecutive429Ref.current = 0;
        pollDelayRef.current = res.data?.running ? 1200 : 3000;

        const events = Array.isArray(res.data?.events) ? res.data.events : null;
        const legacy = Array.isArray(res.data?.logs) ? res.data.logs : null;

        if (res.data?.dropped) {
          xtermWrite("\n[warning] output truncated (scrollback limit)\n");
        }

        if (legacyLogsModeRef.current || (!events && legacy)) {
          legacyLogsModeRef.current = true;

          const idx = legacyLogsIdxRef.current || 0;
          const next = (legacy || []).slice(idx);
          legacyLogsIdxRef.current = (legacy || []).length;

          const out = next.join("");
          if (out) {
            xtermWrite(out);
            const url = extractFirstLocalUrl(out);
            if (url) setDetectedUrl(url);
          }
        } else {
          const out = (events || []).map((e) => e.data).join("");
          if (out) {
            xtermWrite(out);
            const url = extractFirstLocalUrl(out);
            if (url) setDetectedUrl(url);
          }

          const nextSince = res.data?.nextSince;
          if (typeof nextSince === "number" && Number.isFinite(nextSince)) {
            sinceRef.current = nextSince;
          }
        }

        setTerminal((t) => ({
          ...t,
          running: res.data?.running,
          previewUrl: res.data?.previewUrl || null,
          meta: res.data?.meta || null,
        }));
      } catch (err) {
        const status = err?.response?.status;

        if (status === 429) {
          consecutive429Ref.current = Math.min(
            consecutive429Ref.current + 1,
            10,
          );
          const backoff = Math.min(
            30000,
            1000 * 2 ** consecutive429Ref.current,
          );
          pollDelayRef.current = Math.max(
            pollDelayRef.current || 1200,
            backoff,
          );

          if (!pollErrorShownRef.current) {
            pollErrorShownRef.current = true;
            xtermWrite(
              `\n[rate limited] backing off to ${pollDelayRef.current}ms\n`,
            );
          }
          return;
        }

        if (!pollErrorShownRef.current) {
          pollErrorShownRef.current = true;
          xtermWrite(
            "\n[error] unable to fetch logs (server down, wrong workdir, or not logged in)\n",
          );
        }
      }
    };

    const schedule = (ms) => {
      if (cancelled) return;
      const delay = typeof ms === "number" && Number.isFinite(ms) ? ms : 1200;
      timeoutId = window.setTimeout(async () => {
        await tick();
        schedule(pollDelayRef.current);
      }, delay);
    };

    tick();
    schedule(pollDelayRef.current);

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [roomId, workdir, terminalMode]);

  const resolveCd = (currentWd, target) => {
    const cur = normalizePath(currentWd || "");
    const t = normalizePath(target || "");
    const curParts = cur.split("/").filter(Boolean);

    if (!t) return "";
    if (t.startsWith("/") || /^[a-zA-Z]:/.test(t)) return null;

    const parts = t.split("/").filter(Boolean);
    const next = [...curParts];
    for (const p of parts) {
      if (p === ".") continue;
      if (p === "..") {
        next.pop();
        continue;
      }
      next.push(p);
    }
    return next.join("/");
  };

  const runTerminalLine = async (line) => {
    const raw = String(line || "");
    const trimmed = raw.trim();
    if (!trimmed) return;

    // NPM mode only supports npm + a few builtins.
    // For compilers/runtimes (gcc/python/java), use Shell mode.
    if (terminalModeRef.current === "npm") {
      const first = trimmed.split(/\s+/)[0]?.toLowerCase();
      const shellOnly = new Set([
        "gcc",
        "g++",
        "clang",
        "python",
        "py",
        "java",
        "javac",
      ]);
      if (shellOnly.has(first)) {
        const msg =
          "That command needs Shell mode. Switch Terminal mode to Shell, then run it again.";
        setSaveError(msg);
        pushTerminalLine(formatTerminalError(msg));
        return;
      }
    }

    if (trimmed === "clear") {
      xtermClear();
      setTerminal((t) => ({ ...t, logs: [] }));
      return;
    }

    if (trimmed === "pwd") {
      pushTerminalLine(`${cwdLabel || ""}\n`);
      return;
    }

    if (trimmed === "cd" || trimmed.startsWith("cd ")) {
      const arg = trimmed === "cd" ? "" : trimmed.slice(3);
      const next = resolveCd(workdir, arg);
      if (next === null) {
        const msg = "Invalid cd path.";
        setSaveError(msg);
        pushTerminalLine(formatTerminalError(msg));
        return;
      }
      setWorkdir(next);
      const base = normalizePath(projectPath || "");
      const label = next ? `${base}/${next}` : base;
      pushTerminalLine(`\n[cwd] ${label}\n`);
      return;
    }

    return runNpm(trimmed);
  };

  const refreshCollaborators = async () => {
    if (!roomId) return;
    setCollabLoading(true);
    setCollabError("");
    try {
      const res = await apiGetCollaborators(roomId);
      const data = res.data || {};
      setCollabInfo({
        owner: data.owner || null,
        collaborators: Array.isArray(data.collaborators)
          ? data.collaborators
          : [],
        pendingInvites: Array.isArray(data.pendingInvites)
          ? data.pendingInvites
          : [],
      });
    } catch {
      setCollabError("Unable to load collaborators.");
    } finally {
      setCollabLoading(false);
    }
  };

  const inviteCollaborator = async () => {
    if (!roomId) return;
    if (accessRole !== "owner") return;

    const email = window.prompt("Collaborator email")?.trim();
    if (!email) return;
    const role = window.prompt("Role: editor | viewer", "editor")?.trim();
    const r = role === "viewer" ? "viewer" : "editor";

    try {
      await apiInviteCollaborator(roomId, { email, role: r });
      await refreshCollaborators();
      window.alert(
        "Invite sent. The collaborator must accept it from Dashboard → Project Invites.",
      );
    } catch (err) {
      window.alert(
        err?.response?.data?.message || "Unable to invite collaborator.",
      );
    }
  };

  const changeCollaboratorRole = async (userId, nextRole) => {
    if (!roomId) return;
    if (accessRole !== "owner") return;

    const r = nextRole === "viewer" ? "viewer" : "editor";
    try {
      await apiUpdateCollaboratorRole(roomId, userId, r);
      await refreshCollaborators();
    } catch (err) {
      window.alert(err?.response?.data?.message || "Unable to update role.");
    }
  };

  const removeOneCollaborator = async (userId) => {
    if (!roomId) return;
    if (accessRole !== "owner") return;

    const ok = window.confirm("Remove collaborator from this project?");
    if (!ok) return;

    try {
      await apiRemoveCollaborator(roomId, userId);
      await refreshCollaborators();
    } catch (err) {
      window.alert(
        err?.response?.data?.message || "Unable to remove collaborator.",
      );
    }
  };

  const revokeOneInvite = async (inviteId) => {
    if (!roomId) return;
    if (accessRole !== "owner") return;
    const ok = window.confirm("Revoke this pending invite?");
    if (!ok) return;

    try {
      await apiRevokeInvite(roomId, inviteId);
      await refreshCollaborators();
    } catch (err) {
      window.alert(err?.response?.data?.message || "Unable to revoke invite.");
    }
  };

  const acceptMyInvite = async (projectId, inviteId) => {
    try {
      await apiAcceptInvite(projectId, inviteId);
      setMyInvites((prev) => prev.filter((x) => x.inviteId !== inviteId));
      await refreshRooms({ keepSelection: false, selectRoomId: projectId });
    } catch (err) {
      window.alert(err?.response?.data?.message || "Unable to accept invite.");
    }
  };

  const declineMyInvite = async (projectId, inviteId) => {
    try {
      await apiDeclineInvite(projectId, inviteId);
      setMyInvites((prev) => prev.filter((x) => x.inviteId !== inviteId));
    } catch (err) {
      window.alert(
        err?.response?.data?.message || "Unable to decline invite.",
      );
    }
  };

  const createProject = async () => {
    const name = window.prompt("Project name")?.trim();
    if (!name) return;

    try {
      const res = await API.post("/project/create", { name, template: "blank" });
      const room = res.data;
      const roomWithRole = { ...room, accessRole: "owner" };
      const list = [roomWithRole, ...rooms];
      setRooms(list);
      setRoomId(roomWithRole._id);
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Unable to create project.");
    }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] min-h-0 bg-gradient-to-br from-gray-900 via-gray-900 to-black">
      {/* Main Toolbar */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm text-white px-4 py-2.5 shadow-lg">
        <select
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:bg-gray-800"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r._id} value={r._id}>
              {r.accessRole && r.accessRole !== "owner"
                ? `${r.name} (shared)`
                : r.name}
            </option>
          ))}
        </select>

        <button
          onClick={createProject}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          ✨ New Project
        </button>

        {roomId && (
          <span
            className="text-xs text-gray-300 px-2 py-1 bg-gray-800/50 rounded-lg"
            title="Your access level for this project"
          >
            Role:{" "}
            <span className="capitalize font-semibold text-blue-400">
              {accessRole}
            </span>
          </span>
        )}

        {roomId && accessRole === "owner" && (
          <button
            onClick={inviteCollaborator}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600"
          >
            👥 Invite
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-gray-300 px-2 py-1 bg-gray-800/50 rounded-lg">
            📝 Unsaved: {dirtyFiles.size}
          </span>

          <div
            className="flex items-center gap-2 px-2 py-1 bg-gray-800/50 rounded-lg"
            title={cwdLabel}
          >
            <span
              className={`h-2 w-2 rounded-full shadow-lg ${
                statusTone === "running"
                  ? "bg-green-500 animate-pulse"
                  : statusTone === "error"
                    ? "bg-orange-500"
                    : "bg-red-500"
              }`}
            />
            <span className="text-xs text-gray-300 truncate max-w-64 font-mono">
              {cwdLabel || "cwd"}
            </span>
          </div>

          <select
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer hover:bg-gray-800"
            value={terminalMode}
            onChange={(e) => setTerminalMode(e.target.value)}
            title="Terminal mode"
          >
            <option value="shell">💻 Shell</option>
            <option value="npm">📦 NPM</option>
            
          </select>

          {terminalMode === "shell" && (
            <select
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer hover:bg-gray-800"
              value={shellKind}
              onChange={(e) => setShellKind(e.target.value)}
              title="Shell type"
            >
              <option value="powershell">🪟 PowerShell</option>
              <option value="cmd">💾 cmd</option>
            </select>
          )}

          <select
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer hover:bg-gray-800"
            value={
              ["", "client", "server"].includes(workdir)
                ? workdir
                : "__custom__"
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__custom__") return;
              setWorkdir(v);
            }}
            title="Run in folder"
          >
            <option value="">📁 root</option>
            <option value="client">📱 client</option>
            <option value="server">⚙️ server</option>
            <option value="__custom__">🔧 custom</option>
          </select>

          <input
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-28 sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono"
            value={workdir}
            onChange={(e) => setWorkdir(e.target.value)}
            placeholder="📂 cwd (relative)"
            title="Current working directory (relative to project root). Example: client/src"
          />

          <select
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer hover:bg-gray-800"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            title="Quick commands"
          >
            <option value="install">📥 npm install</option>
            <option value="ci">🔧 npm ci</option>
            <option value="start">▶️ npm start</option>
            <option value="dev">🔄 npm run dev</option>
            <option value="test">🧪 npm test</option>
            <option value="build">🏗️ npm run build</option>
          </select>

          <input
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm w-56 sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono"
            value={commandLine}
            onChange={(e) => setCommandLine(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
                const el = e.currentTarget;
                const hasSelection =
                  typeof el.selectionStart === "number" &&
                  typeof el.selectionEnd === "number" &&
                  el.selectionEnd > el.selectionStart;

                if (!hasSelection) {
                  e.preventDefault();
                  interruptNpm();
                  return;
                }
              }
              if (e.key === "Enter") {
                if (terminalMode === "shell") return runShellLine();
                return runNpm();
              }
            }}
            placeholder="💬 Custom (optional): npm run dev"
            title="Custom npm command line (optional). Example: npm install axios"
          />

          <button
            onClick={() =>
              terminalMode === "shell" ? runShellLine() : runNpm()
            }
            disabled={!canWrite}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-900 disabled:to-blue-900 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            🚀 Run
          </button>

          {terminalMode === "npm" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => startService("client")}
                disabled={!canWrite}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-50"
                title="Start the client (workdir=client)"
              >
                Start Client
              </button>
              <button
                onClick={() => startService("server")}
                disabled={!canWrite}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-50"
                title="Start the server (workdir=server)"
              >
                Start Server
              </button>
              <button
                onClick={startClientAndServer}
                disabled={!canWrite}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600 disabled:opacity-50"
                title="Start client and server"
              >
                Start Both
              </button>
            </div>
          )}

          <button
            onClick={interruptNpm}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            title="Send Ctrl+C (SIGINT)"
            disabled={!terminal.running || !canWrite}
          >
            ⏹️ Ctrl+C
          </button>

          <button
            onClick={stopNpm}
            disabled={!canWrite}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-900 disabled:to-red-900 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            ⛔ Stop
          </button>

          <button
            onClick={stopAll}
            className="bg-red-900/80 hover:bg-red-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 border border-red-800"
            title="Stop all running commands for this project"
            disabled={terminalMode === "shell" || !canWrite}
          >
            🛑 Stop All
          </button>

          <button
            onClick={() => setShowTerminal((v) => !v)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600"
            title={showTerminal ? "Hide terminal" : "Show terminal"}
          >
            {showTerminal ? "🖥️ Terminal: On" : "🖥️ Terminal: Off"}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col w-full md:w-80 lg:w-96 md:shrink-0 bg-gradient-to-b from-gray-900 to-gray-950 border-r border-gray-800 overflow-y-auto">
          {/* My Project Invites */}
          {myInvites.length > 0 && (
            <div className="border-b border-gray-800 bg-gray-900/30 text-gray-200 px-3 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  ✉️ Project Invites
                  <span className="text-gray-500 ml-1">({myInvites.length})</span>
                </div>
                <button
                  onClick={refreshMyInvites}
                  className="text-xs text-gray-400 hover:text-white transition-colors duration-200"
                  disabled={myInvitesLoading}
                  title="Refresh invites"
                >
                  {myInvitesLoading ? "⟳ Loading..." : "🔄 Refresh"}
                </button>
              </div>

              {myInvitesError && (
                <div className="text-xs text-red-400 mt-1 mb-2 p-2 bg-red-900/20 rounded-lg">
                  {myInvitesError}
                </div>
              )}

              <div className="max-h-40 overflow-y-auto space-y-1">
                {myInvites.map((inv) => (
                  <div
                    key={inv.inviteId}
                    className="flex items-center gap-2 py-2 px-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-xs text-gray-200 truncate"
                        title={inv.projectName}
                      >
                        📁 {inv.projectName}
                      </div>
                      <div className="text-[11px] text-gray-500 capitalize">
                        Role: {inv.role}
                      </div>
                    </div>

                    <button
                      className="text-xs text-white px-2 py-1 rounded-md bg-blue-700 hover:bg-blue-600 transition-all duration-200"
                      onClick={() => acceptMyInvite(inv.projectId, inv.inviteId)}
                      title="Accept"
                    >
                      ✅ Accept
                    </button>
                    <button
                      className="text-xs text-gray-200 px-2 py-1 rounded-md bg-gray-800 hover:bg-gray-700 transition-all duration-200"
                      onClick={() => declineMyInvite(inv.projectId, inv.inviteId)}
                      title="Decline"
                    >
                      ❌ Decline
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Actions */}
          <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900/50 text-white px-3 py-2.5">
            <button
              onClick={newFile}
              disabled={!canWrite}
              className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-950 disabled:text-gray-500 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            >
              📄 + File
            </button>
            <button
              onClick={newFolder}
              disabled={!canWrite}
              className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-950 disabled:text-gray-500 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            >
              📁 + Folder
            </button>
            <div
              className="text-xs text-gray-400 truncate font-mono"
              title={currentDir || projectPath}
            >
              📍 {currentDir || projectPath || "No project"}
            </div>
          </div>

          {/* Collaborators Section */}
          {roomId && projectPath && (
            <div className="border-b border-gray-800 bg-gray-900/30 text-gray-200 px-3 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  👥 Collaborators
                  {collabInfo.pendingInvites?.length > 0 &&
                  accessRole === "owner" ? (
                    <span className="text-gray-500 ml-1">
                      {" "}
                      (pending: {collabInfo.pendingInvites.length})
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={refreshCollaborators}
                  className="text-xs text-gray-400 hover:text-white transition-colors duration-200"
                  disabled={collabLoading}
                  title="Refresh collaborators"
                >
                  {collabLoading ? "⟳ Loading..." : "🔄 Refresh"}
                </button>
              </div>

              {collabError && (
                <div className="text-xs text-red-400 mt-1 mb-2 p-2 bg-red-900/20 rounded-lg">
                  {collabError}
                </div>
              )}

              <div className="mt-2 text-xs text-gray-400 truncate">
                👑 Owner:{" "}
                {collabInfo.owner?.email || collabInfo.owner?.name || "-"}
              </div>

              <div className="mt-3 max-h-32 overflow-y-auto space-y-1">
                {collabInfo.collaborators?.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">
                    No collaborators yet.
                  </div>
                ) : (
                  collabInfo.collaborators.map((c) => (
                    <div
                      key={c.userId}
                      className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs text-gray-200 truncate"
                          title={c.email || c.name}
                        >
                          👤 {c.email || c.name || c.userId}
                        </div>
                      </div>

                      {accessRole === "owner" ? (
                        <>
                          <select
                            className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:bg-gray-700 transition-all duration-200"
                            value={c.role}
                            onChange={(e) =>
                              changeCollaboratorRole(c.userId, e.target.value)
                            }
                            title="Role"
                          >
                            <option value="editor">✏️ editor</option>
                            <option value="viewer">👁️ viewer</option>
                          </select>
                          <button
                            className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-900/20 transition-all duration-200"
                            onClick={() => removeOneCollaborator(c.userId)}
                            title="Remove"
                          >
                            ❌
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-800/50 rounded-md">
                          {c.role === "editor" ? "✏️" : "👁️"} {c.role}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {accessRole === "owner" &&
                collabInfo.pendingInvites?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                      ⏳ Pending invites
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {collabInfo.pendingInvites.map((inv) => (
                        <div
                          key={inv.inviteId}
                          className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-xs text-gray-200 truncate"
                              title={inv.email || inv.name}
                            >
                              📧 {inv.email || inv.name || inv.userId}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-800/50 rounded-md">
                            {inv.role === "editor" ? "✏️" : "👁️"} {inv.role}
                          </span>
                          <button
                            className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-900/20 transition-all duration-200"
                            onClick={() => revokeOneInvite(inv.inviteId)}
                            title="Revoke"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* File Tree */}
          {projectPath ? (
            <div className="flex-1 overflow-y-auto">
              <FileTree
                projectPath={projectPath}
                onSelectFile={openFile}
                onSelectDir={(d) => setCurrentDir(d)}
                onRename={renameEntry}
                onDelete={deleteEntry}
                dirtyFiles={dirtyFiles}
                refreshKey={treeRefreshKey}
                readOnly={!canWrite}
              />
            </div>
          ) : (
            <div className="flex-1 bg-gray-900 text-gray-400 p-6 text-center">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-sm">Create a project to start coding</p>
            </div>
          )}
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-gray-950">
          {/* Tabs */}
          <div className="flex items-center bg-gray-900 border-b border-gray-800 text-white overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
            {openFiles.map((f) => {
              const isActive = f.path === activePath;
              const isDirty = f.saved !== f.content;
              return (
                <button
                  key={f.path}
                  onClick={() => setActivePath(f.path)}
                  className={`px-4 py-2.5 text-xs border-r border-gray-800 flex items-center gap-2 transition-all duration-200 ${
                    isActive
                      ? "bg-gray-800 text-blue-400 border-t-2 border-t-blue-500"
                      : "bg-gray-900 hover:bg-gray-800/50 text-gray-400"
                  }`}
                >
                  <span className="truncate max-w-40 font-mono">
                    📄 {f.name}
                    {isDirty && <span className="text-yellow-500 ml-1">●</span>}
                  </span>
                  <span
                    className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded px-1 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(f.path);
                    }}
                    title="Close"
                  >
                    ✕
                  </span>
                </button>
              );
            })}
            {openFiles.length === 0 && (
              <div className="px-4 py-2.5 text-xs text-gray-500 italic">
                📂 No file opened
              </div>
            )}
          </div>

          {/* Code Editor */}
          <div className="flex-1 min-h-0">
            <CodeEditor
              filePath={activeFile?.path || ""}
              value={activeFile?.content ?? ""}
              onChange={updateActiveContent}
              onSave={saveActive}
              saving={saving}
              error={saveError}
              isDirty={Boolean(
                activeFile && activeFile.saved !== activeFile.content,
              )}
              readOnly={!canWrite}
            />
          </div>

          {/* Terminal */}
          <div
            className={
              showTerminal
                ? "h-48 md:h-56 lg:h-72 border-t border-gray-800 bg-black text-gray-200 flex flex-col shrink-0"
                : "hidden"
            }
          >
            {/* Terminal Tabs */}
            <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-800 bg-gray-950 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-800">
              {terminalTabs.map((t) => {
                const isActive = t.id === activeTerminalTabId;
                const modeIcon = t.terminalMode === "shell" ? "💻" : "📦";
                return (
                  <button
                    key={t.id}
                    onClick={() => switchTerminalTab(t.id)}
                    className={`px-3 py-1 rounded-md text-xs font-mono border transition-colors duration-150 whitespace-nowrap ${
                      isActive
                        ? "bg-gray-800 text-white border-gray-700"
                        : "bg-gray-950 text-gray-400 border-transparent hover:bg-gray-900 hover:text-gray-200"
                    }`}
                    title={`${t.title} • mode=${t.terminalMode} • workdir=${t.workdir || "(root)"}`}
                  >
                    {modeIcon} {t.title}
                  </button>
                );
              })}

              <button
                onClick={addTerminalTab}
                className="ml-1 px-2 py-1 rounded-md text-xs font-mono border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-900 transition-colors duration-150"
                title="New terminal"
              >
                +
              </button>
            </div>

            <div className="px-3 py-2 text-xs border-b border-gray-800 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono bg-gray-950">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      statusTone === "running"
                        ? "bg-green-500"
                        : statusTone === "error"
                          ? "bg-orange-500"
                          : "bg-red-500"
                    }`}
                  />
                  {activeTerminalTab?.title || "Terminal"}
                </span>
                <span
                  className="text-gray-500 truncate min-w-0"
                  title={cwdLabel}
                >
                  {cwdLabel || "cwd"}
                </span>
                {terminal.meta?.commandLine && (
                  <span
                    className="text-gray-400 truncate"
                    title={`${terminal.meta.commandLine}\n${terminal.meta.cwd || ""}`}
                  >
                    {terminal.meta.commandLine}
                  </span>
                )}
                {typeof terminal.meta?.pid === "number" && (
                  <span className="text-gray-500">
                    pid: {terminal.meta.pid}
                  </span>
                )}
                {terminal.meta && terminal.meta.status !== "running" && (
                  <span className="text-gray-500">
                    exit: {terminal.meta.exitCode ?? "-"}
                  </span>
                )}
                {derivedPreviewUrl && (
                  <a
                    href={derivedPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-300 hover:text-blue-200 underline truncate"
                    title={derivedPreviewUrl}
                  >
                    Preview
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 bg-gray-950 hover:bg-gray-900 px-2 py-0.5 rounded"
                  onClick={addTerminalTab}
                  title="New terminal"
                >
                  + New
                </button>
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={() => {
                    xtermClear();
                    setDetectedUrl(null);
                    setTerminal((t) => ({ ...t, logs: [] }));
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* XTerm Container */}
            <div
              ref={xtermHostRef}
              className="flex-1 overflow-hidden"
              onMouseDown={() => {
                try {
                  xtermRef.current?.focus();
                } catch {
                  // ignore
                }
              }}
              title={
                terminalMode === "shell"
                  ? "Click to focus the terminal"
                  : "Click to focus the terminal (or use the input below)"
              }
            />

            {/* Terminal Input */}
            {terminalMode !== "shell" ? (
              <div className="border-t border-gray-800 px-3 py-2 flex items-center gap-2 text-xs font-mono bg-gray-950">
                <span
                  className="text-gray-500 truncate max-w-72 min-w-0"
                  title={cwdLabel}
                >
                  📁 {cwdLabel || "cwd"}
                </span>
                <span className="text-green-500 font-bold">$</span>
                <input
                  ref={terminalInputRef}
                  className="flex-1 min-w-0 bg-black border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
                      e.preventDefault();
                      interruptNpm();
                      return;
                    }
                    if (e.key === "Enter") {
                      const line = terminalInput;
                      setTerminalInput("");
                      runTerminalLine(line);
                    }
                  }}
                  placeholder="💬 Type here: cd client | npm install | npm start"
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                />
              </div>
            ) : (
              <div className="border-t border-gray-800 px-3 py-2 flex items-center gap-2 text-xs font-mono bg-gray-950">
                <span
                  className="text-gray-500 truncate max-w-72 min-w-0"
                  title={cwdLabel}
                >
                  📁 {cwdLabel || "cwd"}
                </span>
                <span className="text-green-500 font-bold">$</span>
                <input
                  ref={terminalInputRef}
                  className="flex-1 min-w-0 bg-black border border-gray-800 rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
                      e.preventDefault();
                      interruptNpm();
                      return;
                    }
                    if (e.key === "Enter") {
                      const line = terminalInput;
                      setTerminalInput("");
                      runShellLine(line);
                    }
                  }}
                  placeholder="💬 Type here (sends to shell). You can also click the terminal above and type there."
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
