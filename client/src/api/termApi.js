import API from "../axiosConfig";

export const openTerminal = ({ roomId, workdir, shell, cols, rows }) =>
  API.post("/term/open", { roomId, workdir, shell, cols, rows });

export const sendTerminalInput = ({ roomId, workdir, data }) =>
  API.post("/term/input", { roomId, workdir, data });

export const resizeTerminal = ({ roomId, workdir, cols, rows }) =>
  API.post("/term/resize", { roomId, workdir, cols, rows });

export const closeTerminal = ({ roomId, workdir }) =>
  API.post("/term/close", { roomId, workdir });

export const getTerminalLogs = ({ roomId, workdir, since, waitMs, signal }) =>
  API.get("/term/logs", {
    params: { roomId, workdir, since, waitMs },
    timeout: Math.max(5000, (waitMs || 0) + 5000),
    signal,
  });
