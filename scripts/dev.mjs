// Starts the backend (http://localhost:8000) and the frontend (http://localhost:5173) together:
//   npm run dev        (Ctrl+C stops both)
// Other ports, e.g. if something else already uses 8000/5173:
//   macOS/Linux:  API_PORT=8010 WEB_PORT=5180 npm run dev
//   PowerShell:   $env:API_PORT=8010; $env:WEB_PORT=5180; npm run dev
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BACKEND, FRONTEND, IS_WIN, VENV_PYTHON, checkNode, fail, hasVenv, npmCommand } from "./lib.mjs";

checkNode();
if (!hasVenv() || !existsSync(join(FRONTEND, "node_modules"))) fail("Not set up yet. Run:  npm run setup");

const API_PORT = process.env.API_PORT || "8000";
const WEB_PORT = process.env.WEB_PORT || "5173";

const children = [];
function start(name, color, cmd, args, cwd, extraEnv = {}) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: "1", ...extraEnv } });
  child.on("error", (e) => fail(`Could not start ${name}: ${e.message}`));
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on("data", (d) =>
      d
        .toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => out.write(prefix + line + "\n")),
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (!stopping) {
      console.log(`${prefix}stopped (exit ${code}). Shutting everything down.`);
      stop(code ?? 1);
    }
  });
  children.push(child);
}

let stopping = false;
function stop(code = 0) {
  stopping = true;
  for (const c of children) {
    if (c.exitCode !== null) continue;
    // Kill the whole process tree (uvicorn --reload and npm both spawn sub-processes).
    if (IS_WIN) spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
    else c.kill("SIGTERM");
  }
  process.exit(code);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

// The API allows the website's origin (CORS), and the website is told where the API is.
start("api", "35", VENV_PYTHON, ["-m", "uvicorn", "app.main:app", "--reload", "--port", API_PORT], BACKEND, {
  CORS_ORIGINS: `http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT}`,
});
start("web", "36", ...npmCommand(["run", "dev", "--", "--port", WEB_PORT, "--strictPort"]), FRONTEND, {
  VITE_API_URL: `http://localhost:${API_PORT}`,
});

console.log(
  `\n  Frontend: \x1b[1mhttp://localhost:${WEB_PORT}\x1b[0m   API: http://localhost:${API_PORT}/docs   (Ctrl+C to stop)\n`,
);
