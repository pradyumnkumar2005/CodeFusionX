import express from "express";
import auth from "../middleware/auth.js";
import {
  runProject,
  stopProject,
  execNpm,
  getLogs,
} from "../controllers/runController.js";

const runRoutes = express.Router();

runRoutes.post("/start", auth, runProject);
runRoutes.post("/stop", auth, stopProject);

runRoutes.post("/exec", auth, execNpm);
runRoutes.get("/logs", auth, getLogs);

export default runRoutes;