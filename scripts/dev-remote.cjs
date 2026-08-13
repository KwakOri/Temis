#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const defaultProjectRef = "ajlgjdwkjyayrnocdfpj";
const passthroughArgs = process.argv.slice(2);
const baseEnv = loadEnvFiles([
  path.join(rootDir, ".env"),
  path.join(rootDir, ".env.local"),
  path.join(rootDir, ".envrc"),
]);
const remoteEnv = loadEnvFiles([
  path.join(rootDir, ".env.remote"),
  path.join(rootDir, ".env.remote.local"),
]);
const sourceEnv = {
  ...baseEnv,
  ...remoteEnv,
  ...process.env,
};

const resolveTargetEnv = (key) =>
  resolveEnvReference(
    process.env[key] ?? remoteEnv[key] ?? baseEnv[key],
    sourceEnv
  );

const supabaseUrl = resolveTargetEnv("SUPABASE_URL");
const supabasePublishableKey = resolveTargetEnv("SUPABASE_PUBLISHABLE_KEY");
const supabaseSecretKey = resolveTargetEnv("SUPABASE_SECRET_KEY");
const projectRef = resolveTargetEnv("SUPABASE_PROJECT_REF") ?? defaultProjectRef;

const missingKeys = [
  ["SUPABASE_URL", supabaseUrl],
  ["SUPABASE_PUBLISHABLE_KEY", supabasePublishableKey],
  ["SUPABASE_SECRET_KEY", supabaseSecretKey],
]
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(
    `[dev:remote] Missing required remote env: ${missingKeys.join(", ")}. ` +
      "Set them in .env.remote.local (preferred) or .env.local."
  );
  process.exit(1);
}

let parsedSupabaseUrl;
try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch {
  console.error("[dev:remote] SUPABASE_URL must be a valid URL.");
  process.exit(1);
}

if (!supabasePublishableKey.startsWith("sb_publishable_")) {
  console.error(
    "[dev:remote] SUPABASE_PUBLISHABLE_KEY must use the sb_publishable_ format."
  );
  process.exit(1);
}

if (!supabaseSecretKey.startsWith("sb_secret_")) {
  console.error("[dev:remote] SUPABASE_SECRET_KEY must use the sb_secret_ format.");
  process.exit(1);
}

const expectedHostname = `${projectRef}.supabase.co`;
if (parsedSupabaseUrl.hostname !== expectedHostname) {
  console.error(
    `[dev:remote] Refusing unexpected remote target ${parsedSupabaseUrl.hostname}. ` +
      `Expected ${expectedHostname}.`
  );
  process.exit(1);
}

console.log(`[dev:remote] target=${projectRef} (${parsedSupabaseUrl.origin})`);
console.log("[dev:remote] Starting Next.js with explicit remote Supabase keys...");

const devProcess = spawn("npm", ["run", "dev:next", "--", ...passthroughArgs], {
  cwd: rootDir,
  env: {
    ...process.env,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
    NEXT_PUBLIC_SUPABASE_TARGET: "remote",
    SUPABASE_SECRET_KEY: supabaseSecretKey,
  },
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
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
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

function resolveEnvReference(rawValue, env) {
  if (!rawValue) return rawValue;

  let resolved = rawValue.trim();
  const visited = new Set();

  while (true) {
    const match =
      resolved.match(/^\$(\w+)$/) ?? resolved.match(/^\$\{(\w+)\}$/);
    if (!match) return resolved;

    const key = match[1];
    if (visited.has(key)) return resolved;
    visited.add(key);

    const nextValue = env[key];
    if (!nextValue || typeof nextValue !== "string") return resolved;
    resolved = nextValue.trim();
  }
}
