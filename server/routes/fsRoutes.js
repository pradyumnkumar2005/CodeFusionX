import express from "express";
import auth from "../middleware/auth.js";
import {
  readFile,
  writeFile,
  listFiles,
  createDir,
  createFile,
  deletePath,
  renamePath,
} from "../controllers/fsController.js";

const fsRoutes = express.Router();

fsRoutes.get("/read", auth, readFile);
fsRoutes.post("/write", auth, writeFile);
fsRoutes.get("/list", auth, listFiles);
fsRoutes.post("/mkdir", auth, createDir);
fsRoutes.post("/create", auth, createFile);
fsRoutes.post("/delete", auth, deletePath);
fsRoutes.post("/rename", auth, renamePath);

export default fsRoutes;