import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server/utils -> server
export const SERVER_ROOT = path.resolve(__dirname, "..");
export const PROJECTS_ROOT = path.resolve(SERVER_ROOT, "projects");

export const resolveFromServerRoot = (...segments) => path.resolve(SERVER_ROOT, ...segments);
