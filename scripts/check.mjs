// Runs every quality check:  npm run check
// backend tests, frontend lint + formatting + production build.
import { BACKEND, FRONTEND, VENV_PYTHON, checkNode, fail, hasVenv, log, run, runNpm } from "./lib.mjs";

checkNode();
if (!hasVenv()) fail("Not set up yet. Run:  npm run setup");

log("Backend tests (pytest)…");
run(VENV_PYTHON, ["-m", "pytest", "-q"], { cwd: BACKEND });
log("Frontend lint…");
runNpm(["run", "lint"], { cwd: FRONTEND });
log("Frontend formatting…");
runNpm(["run", "format:check"], { cwd: FRONTEND });
log("Frontend production build…");
runNpm(["run", "build"], { cwd: FRONTEND });

console.log("\n\x1b[32m✓ All checks passed.\x1b[0m\n");
