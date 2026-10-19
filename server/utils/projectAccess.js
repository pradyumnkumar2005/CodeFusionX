import Room from "../models/Room.js";

export const getUserProjectRole = (room, userId) => {
  if (!room || !userId) return null;
  const uid = String(userId);

  if (String(room.owner) === uid) return "owner";

  const collab = Array.isArray(room.collaborators)
    ? room.collaborators.find((c) => String(c.user) === uid)
    : null;

  if (!collab) return null;
  return collab.role === "viewer" ? "viewer" : "editor";
};

export const canReadProject = (role) => role === "owner" || role === "editor" || role === "viewer";
export const canWriteProject = (role) => role === "owner" || role === "editor";

export const findRoomByIdForUser = async (roomId, userId) => {
  const room = await Room.findOne({
    _id: roomId,
    $or: [{ owner: userId }, { "collaborators.user": userId }],
  });

  if (!room) return { room: null, role: null };
  const role = getUserProjectRole(room, userId);
  return { room, role };
};

export const findRoomByProjectIdForUser = async ({ projectId, userId }) => {
  if (!projectId || !userId) return { room: null, role: null };

  const roomPathWin = `projects\\${projectId}`;
  const roomPathPosix = `projects/${projectId}`;

  const room = await Room.findOne({
    path: { $in: [roomPathWin, roomPathPosix] },
    $or: [{ owner: userId }, { "collaborators.user": userId }],
  });

  if (!room) return { room: null, role: null };
  const role = getUserProjectRole(room, userId);
  return { room, role };
};
