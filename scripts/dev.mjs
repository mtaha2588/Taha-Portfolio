// Starts the backend (http://localhost:8000) and the frontend (http://localhost:5173) together:
//   npm run dev        (Ctrl+C stops both)
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BACKEND, FRONTEND, IS_WIN, VENV_PYTHON, checkNode, fail, hasVenv, npmCommand } from "./lib.mjs";

checkNode();
if (!hasVenv() || !existsSync(join(FRONTEND, "node_modules"))) fail("Not set up yet. Run:  npm run setup");

const children = [];
function start(name, color, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: "1" } });
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

start("api", "35", VENV_PYTHON, ["-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"], BACKEND);
start("web", "36", ...npmCommand(["run", "dev", "--", "--port", "5173", "--strictPort"]), FRONTEND);

console.log("\n  Frontend: \x1b[1mhttp://localhost:5173\x1b[0m   API: http://localhost:8000/docs   (Ctrl+C to stop)\n");
