// One-time setup on a new machine:  npm run setup
// 1. checks Node and Python, 2. creates backend/.venv and installs Python packages,
// 3. creates backend/.env from the example, 4. installs frontend packages (npm ci).
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BACKEND, FRONTEND, VENV_PYTHON, checkNode, fail, findPython, hasVenv, log, run, runNpm } from "./lib.mjs";

checkNode();
log(`Node ${process.versions.node} ✓`);

const python = findPython();
if (!python)
  fail(
    'Python 3.11+ not found. Install Python 3.12 from https://www.python.org (tick "Add python.exe to PATH" on Windows).',
  );
log(`Python ${python.version} ✓ (${python.cmd} ${python.pre.join(" ")})`.trim());

if (!hasVenv()) {
  log("Creating backend virtual environment (backend/.venv)…");
  run(python.cmd, [...python.pre, "-m", "venv", ".venv"], { cwd: BACKEND });
}
log("Installing backend packages…");
run(VENV_PYTHON, ["-m", "pip", "install", "--upgrade", "pip", "--quiet"], { cwd: BACKEND });
run(VENV_PYTHON, ["-m", "pip", "install", "-r", "requirements.txt", "--quiet"], { cwd: BACKEND });

const env = join(BACKEND, ".env");
if (!existsSync(env)) {
  copyFileSync(join(BACKEND, ".env.example"), env);
  log("Created backend/.env from .env.example (defaults work locally; edit it for email or production).");
}

log("Installing frontend packages (npm ci)…");
runNpm(["ci", "--no-audit", "--no-fund"], { cwd: FRONTEND });

console.log("\n\x1b[32m✓ Setup complete.\x1b[0m Start the site with:  \x1b[1mnpm run dev\x1b[0m\n");
