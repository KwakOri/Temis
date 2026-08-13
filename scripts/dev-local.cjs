#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const rawArgs = process.argv.slice(2);
const dumpRequested =
  rawArgs.includes("--dump") || toBoolean(process.env.npm_config_dump);

if (dumpRequested) {
  console.error(
    "[dev:local] Remote dump restore is separate from local dev. Use `npm run db:restore:remote -- --fresh-local`, then run `npm run dev:local`.",
  );
  process.exit(1);
}

const envFromFiles = loadEnvFiles([
  path.join(rootDir, ".env"),
  path.join(rootDir, ".env.local"),
  path.join(rootDir, ".envrc"),
]);
const startExcludes = (
  process.env.SUPABASE_START_EXCLUDE ??
  envFromFiles.SUPABASE_START_EXCLUDE ??
  [
    "realtime",
    "storage-api",
    "imgproxy",
    "mailpit",
    "postgres-meta",
    "studio",
    "edge-runtime",
    "logflare",
    "vector",
    "supavisor",
  ].join(",")
)
  .split(",")
  .map((service) => service.trim())
  .filter(Boolean);

ensureCommandAvailable("supabase");

console.log("[dev:local] mode=local (reuse current local DB state)");
console.log("[dev:local] 1/4 Starting local Supabase containers...");
const startArgs = ["start", "--workdir", rootDir];
for (const excludedService of startExcludes) {
  startArgs.push("--exclude", excludedService);
}
if (startExcludes.length > 0) {
  console.log(`[dev:local]    Excluding services: ${startExcludes.join(", ")}`);
}
runCommand("supabase", startArgs, { captureStdout: true });

console.log("[dev:local] 2/4 Loading local Supabase connection info...");
const statusEnv = parseStatusOutput(
  runCommand("supabase", ["status", "-o", "env", "--workdir", rootDir], {
    captureStdout: true,
  }),
);

const localApiUrl = statusEnv.API_URL ?? statusEnv.KONG_URL;
const localPublishableKey = statusEnv.PUBLISHABLE_KEY;
const localSecretKey = statusEnv.SECRET_KEY;

if (!localApiUrl || !localPublishableKey || !localSecretKey) {
  console.error(
    "[dev:local] Could not parse local Supabase URL and keys from `supabase status -o env`.",
  );
  process.exit(1);
}

console.log("[dev:local] 3/4 Applying pending local migrations...");
runCommand("supabase", [
  "migration",
  "up",
  "--local",
  "--yes",
  "--workdir",
  rootDir,
]);

console.log("[dev:local] 4/4 Starting Next.js with local Supabase keys...");
const devEnv = {
  ...process.env,
  SUPABASE_URL: localApiUrl,
  SUPABASE_PUBLISHABLE_KEY: localPublishableKey,
  NEXT_PUBLIC_SUPABASE_TARGET: "local",
  SUPABASE_SECRET_KEY: localSecretKey,
};

const devProcess = spawn("npm", ["run", "dev:next", "--", ...rawArgs], {
  cwd: rootDir,
  env: devEnv,
  stdio: "inherit",
});

const forwardSignal = (signal) => {
  if (!devProcess.killed) {
    devProcess.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

devProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});

function runCommand(command, args, options = {}) {
  const { captureStdout = false } = options;
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: captureStdout ? ["inherit", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    console.error(
      `[dev:local] Failed to run \`${command}\`: ${result.error.message}`,
    );
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    if (captureStdout) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return result.stdout ?? "";
}

function ensureCommandAvailable(command) {
  const whichCommand = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(whichCommand, [command], { stdio: "ignore" });

  if ((result.status ?? 1) !== 0) {
    console.error(`[dev:local] Missing required command: ${command}`);
    process.exit(1);
  }
}

function parseStatusOutput(rawOutput) {
  const parsed = {};
  const lines = rawOutput.split(/\r?\n/).map((line) => line.trim());

  for (const line of lines) {
    if (!line || !line.includes("=")) continue;
    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex);
    const rawValue = line.slice(separatorIndex + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    parsed[key] = value;
  }

  return parsed;
}

function loadEnvFiles(filePaths) {
  const merged = {};
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    Object.assign(merged, parseEnvFile(fs.readFileSync(filePath, "utf8")));
  }
  return merged;
}

function parseEnvFile(content) {
  const parsed = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex < 1) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      const inlineCommentIndex = value.indexOf(" #");
      if (inlineCommentIndex > -1) {
        value = value.slice(0, inlineCommentIndex).trim();
      }
    }
    parsed[key] = value;
  }
  return parsed;
}

function toBoolean(value) {
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}
