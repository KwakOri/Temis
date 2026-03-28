#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const defaultProjectRef = "ajlgjdwkjyayrnocdfpj";
const tempDir = path.join(rootDir, "supabase", ".temp");
const dumpFilePath = path.join(tempDir, "remote-data.sql");
const passthroughArgs = process.argv.slice(2);

const envFromFiles = loadEnvFiles([
  path.join(rootDir, ".env"),
  path.join(rootDir, ".env.local"),
  path.join(rootDir, ".envrc"),
]);
const envForResolution = {
  ...envFromFiles,
  ...process.env,
};

const remoteDbUrl =
  process.env.SUPABASE_REMOTE_DB_URL ?? envFromFiles.SUPABASE_REMOTE_DB_URL;
const projectRef =
  process.env.SUPABASE_PROJECT_REF ??
  envFromFiles.SUPABASE_PROJECT_REF ??
  defaultProjectRef;
const resolvedAccessToken = resolveEnvReference(
  process.env.SUPABASE_ACCESS_TOKEN ??
    process.env.SB_TOKEN_TEMIS ??
    envFromFiles.SUPABASE_ACCESS_TOKEN ??
    envFromFiles.SB_TOKEN_TEMIS,
  envForResolution
);
const useLinkedRemote = !remoteDbUrl;
const defaultStartExcludes = [
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
];
const startExcludes = (
  process.env.SUPABASE_START_EXCLUDE ??
  envFromFiles.SUPABASE_START_EXCLUDE ??
  defaultStartExcludes.join(",")
)
  .split(",")
  .map((service) => service.trim())
  .filter(Boolean);
const remoteDumpSchemas = (
  process.env.SUPABASE_REMOTE_DUMP_SCHEMAS ??
  envFromFiles.SUPABASE_REMOTE_DUMP_SCHEMAS ??
  "public"
)
  .split(",")
  .map((schema) => schema.trim())
  .filter(Boolean);

if (useLinkedRemote && !resolvedAccessToken) {
  console.error(
    "[dev:local] Missing remote auth. Set SB_TOKEN_TEMIS or SUPABASE_ACCESS_TOKEN (or provide SUPABASE_REMOTE_DB_URL)."
  );
  process.exit(1);
}

if (remoteDumpSchemas.length === 0) {
  console.error("[dev:local] SUPABASE_REMOTE_DUMP_SCHEMAS must include at least one schema.");
  process.exit(1);
}

if (resolvedAccessToken) {
  process.env.SUPABASE_ACCESS_TOKEN = resolvedAccessToken;
}

ensureCommandAvailable("supabase");
ensureCommandAvailable("psql");

fs.mkdirSync(tempDir, { recursive: true });

console.log("[dev:local] 1/7 Starting local Supabase containers...");
const startArgs = ["start", "--workdir", rootDir];
for (const excludedService of startExcludes) {
  startArgs.push("--exclude", excludedService);
}
if (startExcludes.length > 0) {
  console.log(`[dev:local]    Excluding services: ${startExcludes.join(", ")}`);
}
runCommand("supabase", startArgs);

console.log("[dev:local] 2/7 Loading local Supabase connection info...");
const statusEnv = parseStatusOutput(
  runCommand("supabase", ["status", "-o", "env", "--workdir", rootDir], {
    captureStdout: true,
  })
);

const localDbUrl = statusEnv.DB_URL ?? statusEnv.POSTGRES_URL;
const localApiUrl = statusEnv.API_URL ?? statusEnv.KONG_URL;
const localAnonKey = statusEnv.ANON_KEY ?? statusEnv.SUPABASE_ANON_KEY;
const localServiceRoleKey =
  statusEnv.SERVICE_ROLE_KEY ?? statusEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!localDbUrl || !localApiUrl || !localAnonKey) {
  console.error(
    "[dev:local] Could not parse local Supabase env vars from `supabase status -o env`."
  );
  process.exit(1);
}

if (useLinkedRemote) {
  console.log(`[dev:local] 3/7 Linking to remote project (${projectRef})...`);
  runCommand("supabase", [
    "link",
    "--project-ref",
    projectRef,
    "--workdir",
    rootDir,
  ]);
} else {
  console.log("[dev:local] 3/7 Using SUPABASE_REMOTE_DB_URL as remote source...");
}

console.log("[dev:local] 4/7 Resetting local DB to clean baseline...");
runCommand("supabase", [
  "db",
  "reset",
  "--local",
  "--no-seed",
  "--yes",
  "--workdir",
  rootDir,
]);

console.log("[dev:local] 5/7 Dumping remote data...");
const dataDumpArgs = [
  "db",
  "dump",
  "--data-only",
  "--use-copy",
  "--file",
  dumpFilePath,
  "--workdir",
  rootDir,
];
if (useLinkedRemote) {
  dataDumpArgs.push("--linked");
} else {
  dataDumpArgs.push("--db-url", remoteDbUrl);
}
for (const schema of remoteDumpSchemas) {
  dataDumpArgs.push("--schema", schema);
}
runCommand("supabase", dataDumpArgs);

console.log("[dev:local] 6/7 Importing remote data...");
runCommand("psql", [localDbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", dumpFilePath]);

console.log("[dev:local] 7/7 Starting Next.js with local Supabase keys...");
const devEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: localApiUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: localAnonKey,
};

if (localServiceRoleKey) {
  devEnv.SUPABASE_SERVICE_ROLE_KEY = localServiceRoleKey;
}

const devProcess = spawn("npm", ["run", "dev", "--", ...passthroughArgs], {
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
    console.error(`[dev:local] Failed to run \`${command}\`: ${result.error.message}`);
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

function resolveEnvReference(rawValue, sourceEnv) {
  if (!rawValue) return rawValue;

  let resolved = rawValue.trim();
  const visited = new Set();

  while (true) {
    const referenceMatch = resolved.match(/^\$(\w+)$/) ?? resolved.match(/^\$\{(\w+)\}$/);
    if (!referenceMatch) {
      return resolved;
    }

    const key = referenceMatch[1];
    if (visited.has(key)) {
      return resolved;
    }
    visited.add(key);

    const nextValue = sourceEnv[key];
    if (!nextValue || typeof nextValue !== "string") {
      return resolved;
    }

    resolved = nextValue.trim();
  }
}
