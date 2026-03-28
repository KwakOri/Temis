#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const tempDir = path.join(rootDir, "supabase", ".temp");
const schemaDumpFilePath = path.join(tempDir, "remote-schema.sql");
const dumpFilePath = path.join(tempDir, "remote-data.sql");
const passthroughArgs = process.argv.slice(2);

const envFromFiles = loadEnvFiles([
  path.join(rootDir, ".env"),
  path.join(rootDir, ".env.local"),
]);

const remoteDbUrl =
  process.env.SUPABASE_REMOTE_DB_URL ?? envFromFiles.SUPABASE_REMOTE_DB_URL;
const remoteDumpSchemas = (
  process.env.SUPABASE_REMOTE_DUMP_SCHEMAS ??
  envFromFiles.SUPABASE_REMOTE_DUMP_SCHEMAS ??
  "public"
)
  .split(",")
  .map((schema) => schema.trim())
  .filter(Boolean);

if (!remoteDbUrl) {
  console.error(
    "[dev:local] SUPABASE_REMOTE_DB_URL is required. Add it to .env.local or export it in your shell."
  );
  process.exit(1);
}

if (remoteDumpSchemas.length === 0) {
  console.error("[dev:local] SUPABASE_REMOTE_DUMP_SCHEMAS must include at least one schema.");
  process.exit(1);
}

ensureCommandAvailable("supabase");
ensureCommandAvailable("psql");

fs.mkdirSync(tempDir, { recursive: true });

console.log("[dev:local] 1/8 Starting local Supabase containers...");
runCommand("supabase", ["start", "--workdir", rootDir]);

console.log("[dev:local] 2/8 Loading local Supabase connection info...");
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

console.log("[dev:local] 3/8 Resetting local DB to clean baseline...");
runCommand("supabase", [
  "db",
  "reset",
  "--local",
  "--no-seed",
  "--yes",
  "--workdir",
  rootDir,
]);

console.log("[dev:local] 4/8 Dumping remote schema...");
const schemaDumpArgs = [
  "db",
  "dump",
  "--db-url",
  remoteDbUrl,
  "--file",
  schemaDumpFilePath,
  "--workdir",
  rootDir,
];
for (const schema of remoteDumpSchemas) {
  schemaDumpArgs.push("--schema", schema);
}
runCommand("supabase", schemaDumpArgs);

console.log("[dev:local] 5/8 Importing remote schema...");
runCommand("psql", [localDbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", schemaDumpFilePath]);

console.log("[dev:local] 6/8 Dumping remote data...");
const dataDumpArgs = [
  "db",
  "dump",
  "--data-only",
  "--use-copy",
  "--db-url",
  remoteDbUrl,
  "--file",
  dumpFilePath,
  "--workdir",
  rootDir,
];
for (const schema of remoteDumpSchemas) {
  dataDumpArgs.push("--schema", schema);
}
runCommand("supabase", dataDumpArgs);

console.log("[dev:local] 7/8 Importing remote data...");
runCommand("psql", [localDbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", dumpFilePath]);

console.log("[dev:local] 8/8 Starting Next.js with local Supabase keys...");
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
