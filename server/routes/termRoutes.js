import express from "express";
import auth from "../middleware/auth.js";
import {
  closeTerminal,
  getTerminalLogs,
  openTerminal,
  resizeTerminal,
  terminalInput,
} from "../controllers/terminalController.js";

const termRoutes = express.Router();

termRoutes.post("/open", auth, openTerminal);
termRoutes.post("/input", auth, terminalInput);
termRoutes.post("/resize", auth, resizeTerminal);
termRoutes.post("/close", auth, closeTerminal);
termRoutes.get("/logs", auth, getTerminalLogs);

export default termRoutes;
