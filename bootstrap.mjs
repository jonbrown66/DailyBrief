#!/usr/bin/env node
/**
 * One-line installer for the daily-brief digest pipeline. Cross-platform.
 *
 *   curl -sSL https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node
 *
 * On Windows PowerShell:
 *   irm https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node -
 *
 * Default behavior:
 *   - Clones the repo to ~/daily-brief (or %USERPROFILE%\daily-brief on Windows)
 *   - npm install
 *   - node scripts/install.mjs --global
 *
 * After install: /run-daily, /check-daily, and the daily-brief skill all work
 * from any Claude Code session.
 *
 * Custom options:
 *   node bootstrap.mjs --target /custom/path --at 07:30 --repo https://github.com/me/fork.git
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";

const REPO_DEFAULT = "https://github.com/leiting-eric/DailyBrief.git";
const TARGET_DEFAULT = path.join(os.homedir(), "daily-brief");
const AT_DEFAULT = "16:00";

function parseArgs(argv) {
  const args = {
    repo: REPO_DEFAULT,
    target: TARGET_DEFAULT,
    at: AT_DEFAULT,
    skipScheduler: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--repo") args.repo = argv[++i];
    else if (argv[i] === "--target") args.target = argv[++i];
    else if (argv[i] === "--at") args.at = argv[++i];
    else if (argv[i] === "--skip-scheduler") args.skipScheduler = true;
    else if (argv[i] === "--help" || argv[i] === "-h") args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`daily-brief bootstrap installer

Usage:
  node bootstrap.mjs [options]

Options:
  --repo <url>          Git URL to clone (default: ${REPO_DEFAULT})
  --target <path>       Where to clone (default: ${TARGET_DEFAULT})
  --at HH:MM            Daily trigger time (default: ${AT_DEFAULT})
  --skip-scheduler      Don't register the OS scheduled task
`);
  process.exit(0);
}

console.log("=== daily-brief bootstrap ===");
console.log(`Platform: ${process.platform}`);
console.log(`Repo:     ${args.repo}`);
console.log(`Target:   ${args.target}`);
console.log(`Trigger:  ${args.at}\n`);

// === 1. Prerequisites ===

function requireCommand(cmd, hint) {
  const which = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(which, [cmd], { stdio: "ignore", shell: true });
  if (r.status !== 0) {
    throw new Error(`Missing prerequisite: '${cmd}' not on PATH.\n  ${hint}`);
  }
}

requireCommand("git", "Install Git: https://git-scm.com/downloads");
requireCommand("node", "Install Node 20+: https://nodejs.org/");
requireCommand("npm", "(should come with Node)");
requireCommand("claude", "Install Claude Code CLI: npm install -g @anthropic-ai/claude-code");

const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor < 20) {
  throw new Error(`Node ${process.versions.node} detected. Need 20+. Upgrade: https://nodejs.org/`);
}
console.log(`[OK] Prerequisites present (node ${process.versions.node})`);

// === 2. Clone or update ===

if (fs.existsSync(args.target)) {
  if (fs.existsSync(path.join(args.target, ".git"))) {
    console.log(`Target exists with .git — running 'git pull' instead of clone`);
    execSync("git pull --ff-only", { cwd: args.target, stdio: "inherit" });
  } else {
    throw new Error(
      `${args.target} exists but is not a git repository. Move/delete or use --target.`,
    );
  }
} else {
  execSync(`git clone "${args.repo}" "${args.target}"`, { stdio: "inherit" });
  console.log(`[OK] Cloned to ${args.target}`);
}

// === 3. npm install ===

console.log("\n=== npm install (may take 1-2 min) ===");
execSync("npm install", { cwd: args.target, stdio: "inherit", shell: true });
console.log("[OK] dependencies installed");

// === 4. Run install.mjs --global ===

if (!args.skipScheduler) {
  console.log("\n=== Registering scheduler + user-level skill ===");
  const installScript = path.join(args.target, "scripts", "install.mjs");
  execSync(`"${process.execPath}" "${installScript}" --at ${args.at} --global`, {
    stdio: "inherit",
    shell: true,
  });
}

// === 5. Smoke test ===

console.log("\n=== Smoke test (npm run dry-run, ~30s) ===");
const smoke = spawnSync("npm", ["run", "dry-run"], {
  cwd: args.target,
  shell: true,
  stdio: "inherit",
});
if (smoke.status !== 0) {
  console.warn(
    "Warning: dry-run exited non-zero. Some sources may be unreachable from this network — pipeline can still run with partial coverage.",
  );
}

// === 6. Final ===

console.log("\n✓ Installed!");
console.log("\nTry it:");
console.log("  - Open Claude Code anywhere, type:  /run-daily");
if (process.platform === "win32") {
  console.log("  - Or:  Start-ScheduledTask -TaskName DailyBrief");
} else if (process.platform === "darwin") {
  console.log("  - Or:  launchctl start com.daily-brief");
} else {
  console.log("  - Or wait until the cron trigger fires");
}
console.log(`  - Or:  cd "${args.target}" && npm run daily`);
console.log(`\nCustomize: see ${path.join(args.target, "FORKING.md")}`);
console.log(`Uninstall: node "${path.join(args.target, "scripts", "uninstall.mjs")}"`);
