import express from "express";
import auth from "../middleware/auth.js";
import { createRoom, getRooms } from "../controllers/roomcontroller.js";

const roomRouter = express.Router();

roomRouter.post("/create", auth, createRoom);
roomRouter.get("/", auth, getRooms);

export default roomRouter;