/**
 * Copies frontend/src/data/projects.json → backend/app/data/projects.json
 *
 * projects.json in the frontend is the single source of truth. Run
 * `npm run sync:projects` after editing it so the backend's
 * /api/projects endpoint serves the same information.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../src/data/projects.json");
const target = resolve(here, "../../backend/app/data/projects.json");

// Fail loudly if the JSON is invalid instead of copying a broken file.
const projects = JSON.parse(readFileSync(source, "utf8"));

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`Synced ${projects.length} projects → ${target}`);
