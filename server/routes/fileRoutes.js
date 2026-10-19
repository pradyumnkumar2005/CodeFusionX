import express from "express";
import auth from "../middleware/auth.js";
import {
  createFile,
  getFiles,
  getFile,
  updateFile,
  deleteFile,
} from "../controllers/filecontroller.js";

const fileRouter = express.Router();

fileRouter.post("/create", auth, createFile);
fileRouter.get("/room/:roomId", auth, getFiles);
fileRouter.get("/:fileId", auth, getFile);
fileRouter.put("/:fileId", auth, updateFile);
fileRouter.delete("/:fileId", auth, deleteFile);

export default fileRouter;