import express from "express";
import auth from "../middleware/auth.js";
import {
	acceptInvite,
	createProject,
	declineInvite,
	getCollaborators,
	inviteCollaborator,
	listMyInvites,
	removeCollaborator,
	revokeInvite,
	updateCollaboratorRole,
} from "../controllers/projectController.js";

const projectRoutes = express.Router();

projectRoutes.get("/create", (req, res) => {
	return res
		.status(405)
		.json({ message: "Use POST /api/project/create" });
});

projectRoutes.post("/create", auth, createProject);

// Collaboration
projectRoutes.get("/invites", auth, listMyInvites);
projectRoutes.get("/:projectId/collaborators", auth, getCollaborators);
projectRoutes.post("/:projectId/invite", auth, inviteCollaborator);
projectRoutes.post("/:projectId/invites/:inviteId/accept", auth, acceptInvite);
projectRoutes.post("/:projectId/invites/:inviteId/decline", auth, declineInvite);
projectRoutes.delete("/:projectId/invites/:inviteId", auth, revokeInvite);
projectRoutes.patch(
	"/:projectId/collaborators/:userId",
	auth,
	updateCollaboratorRole
);
projectRoutes.delete(
	"/:projectId/collaborators/:userId",
	auth,
	removeCollaborator
);

export default projectRoutes;