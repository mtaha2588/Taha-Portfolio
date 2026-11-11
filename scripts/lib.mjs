// Shared helpers for the cross-platform root scripts (setup / dev / check).
// Commands are started without a shell, so arguments are passed safely and
// identically on Windows, macOS and Linux.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const BACKEND = join(ROOT, "backend");
export const FRONTEND = join(ROOT, "frontend");
export const IS_WIN = process.platform === "win32";

/** Python inside the backend virtual environment. */
export const VENV_PYTHON = IS_WIN
  ? join(BACKEND, ".venv", "Scripts", "python.exe")
  : join(BACKEND, ".venv", "bin", "python");

export const log = (msg) => console.log(`\x1b[36m▸\x1b[0m ${msg}`);
export const fail = (msg) => {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
};

/** Runs a command (no shell), streaming its output; exits the script if it fails. */
export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.error) fail(`Could not start ${cmd}: ${r.error.message}`);
  if (r.status !== 0) fail(`Command failed: ${cmd} ${args.join(" ")}`);
}

/**
 * How to invoke npm without a shell. `npm run` exposes npm's own JS entry
 * point in npm_execpath, which Node can run directly on every OS (on
 * Windows, "npm" itself is a .cmd file that can't be spawned without a shell).
 */
export function npmCommand(args) {
  const cli = process.env.npm_execpath;
  if (cli && cli.endsWith(".js")) return [process.execPath, [cli, ...args]];
  return [IS_WIN ? "npm.cmd" : "npm", args];
}

export function runNpm(args, opts = {}) {
  const [cmd, full] = npmCommand(args);
  run(cmd, full, { ...opts, shell: !cmd.endsWith(".js") && cmd === "npm.cmd" });
}

export function checkNode() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  const ok = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22;
  if (!ok) fail(`Node.js ${process.versions.node} is too old. Install Node 22 LTS (or 20.19+) from https://nodejs.org`);
}

/** Finds a system Python 3.11+ to create the virtual environment with. */
export function findPython() {
  const candidates = IS_WIN
    ? [
        ["py", ["-3.12"]],
        ["py", ["-3"]],
        ["python", []],
        ["python3", []],
      ]
    : [
        ["python3.12", []],
        ["python3", []],
        ["python", []],
      ];
  for (const [cmd, pre] of candidates) {
    const r = spawnSync(cmd, [...pre, "-c", "import sys;print(sys.version_info[0],sys.version_info[1])"], {
      encoding: "utf8",
    });
    if (r.error || r.status !== 0 || !r.stdout) continue;
    const [maj, min] = r.stdout.trim().split(" ").map(Number);
    if (maj === 3 && min >= 11) return { cmd, pre, version: `${maj}.${min}` };
  }
  return null;
}

export const hasVenv = () => existsSync(VENV_PYTHON);
