import API from "../axiosConfig";

export const listFiles = (dir) => API.get("/fs/list", { params: { dir } });

export const readFile = (filePath) =>
  API.get("/fs/read", { params: { filePath } });

export const writeFile = (filePath, content) =>
  API.post("/fs/write", { filePath, content });

export const createDir = (dirPath) => API.post("/fs/mkdir", { dirPath });

export const createFile = (filePath, content = "") =>
  API.post("/fs/create", { filePath, content });

export const deletePath = (targetPath) => API.post("/fs/delete", { targetPath });

export const renamePath = (oldPath, newPath) =>
  API.post("/fs/rename", { oldPath, newPath });
