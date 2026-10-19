import API from "../axiosConfig";

export const getCollaborators = (projectId) =>
  API.get(`/project/${projectId}/collaborators`);

export const inviteCollaborator = (projectId, { email, role }) =>
  API.post(`/project/${projectId}/invite`, { email, role });

export const updateCollaboratorRole = (projectId, userId, role) =>
  API.patch(`/project/${projectId}/collaborators/${userId}`, { role });

export const removeCollaborator = (projectId, userId) =>
  API.delete(`/project/${projectId}/collaborators/${userId}`);

export const listMyInvites = () => API.get("/project/invites");

export const acceptInvite = (projectId, inviteId) =>
  API.post(`/project/${projectId}/invites/${inviteId}/accept`);

export const declineInvite = (projectId, inviteId) =>
  API.post(`/project/${projectId}/invites/${inviteId}/decline`);

export const revokeInvite = (projectId, inviteId) =>
  API.delete(`/project/${projectId}/invites/${inviteId}`);
