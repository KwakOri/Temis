#!/usr/bin/env node

const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const expectedEmail = "admin@admin.com";
const expectedRole = "admin";

const restoreSource = fs.readFileSync(
  path.join(rootDir, "scripts/restore-local-db-from-remote.cjs"),
  "utf8",
);
assert(
  restoreSource.includes("ensureLocalTestAdmin(localConnection.dbUrl)"),
  "The remote restore flow must ensure the local test admin on every run.",
);

const {
  ensureLocalTestAdmin,
  LOCAL_TEST_ADMIN_EMAIL,
  LOCAL_TEST_ADMIN_NAME,
  LOCAL_TEST_ADMIN_PASSWORD_HASH,
} = require("./ensure-local-test-admin.cjs");

assert(
  LOCAL_TEST_ADMIN_EMAIL === expectedEmail,
  "The restore helper must target admin@admin.com.",
);
assert(
  typeof LOCAL_TEST_ADMIN_NAME === "string" && LOCAL_TEST_ADMIN_NAME.length > 0,
  "The restore helper must provide a local test-admin name.",
);

const localDbUrl = readLocalDbUrl();
ensureLocalTestAdmin(localDbUrl);
ensureLocalTestAdmin(localDbUrl);

const userCount = runLocalQuery(
  localDbUrl,
  `SELECT COUNT(*)::text FROM public.users WHERE email = '${expectedEmail}';`,
).trim();
assert(userCount === "1", `Expected exactly one local test admin, got ${userCount}.`);

const [userId, email, role, passwordHash] = runLocalQuery(
  localDbUrl,
  `
    SELECT id::text, email, role, password
    FROM public.users
    WHERE email = '${expectedEmail}';
  `,
).trim().split("|");
assert(/^\d+$/.test(userId), "The local test admin must have a numeric user id.");
assert(email === expectedEmail, "The local test-admin email was not persisted.");
assert(role === expectedRole, "The local test admin must have role admin.");
assert(
  passwordHash === LOCAL_TEST_ADMIN_PASSWORD_HASH,
  "The local test-admin password hash is invalid.",
);

const adminFunction = runLocalQuery(
  localDbUrl,
  "SELECT pg_get_functiondef('public.is_admin_user()'::regprocedure);",
);
assert(
  adminFunction.includes(expectedEmail),
  "The local RLS admin function must recognize admin@admin.com.",
);

const rlsResult = runLocalQuery(
  localDbUrl,
  `
    BEGIN;
    SELECT set_config('request.jwt.claims', '{"user_id":${userId}}', true);
    SELECT public.is_admin_user()::text;
    ROLLBACK;
  `,
).trim().split(/\r?\n/).findLast((line) => line === "true" || line === "false");
assert(rlsResult === "true", "The local test admin must pass is_admin_user().");

console.log("Local test admin checks passed.");

function readLocalDbUrl() {
  const statusEnv = parseEnv(
    runCommand("supabase", ["status", "-o", "env", "--workdir", rootDir], {
      captureStdout: true,
    }),
  );
  const dbUrl = statusEnv.DB_URL ?? statusEnv.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error("Could not read the local DB URL from supabase status.");
  }
  return dbUrl;
}

function runLocalQuery(dbUrl, sql) {
  return runCommand("psql", [dbUrl, "-At", "-F", "|", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    captureStdout: true,
  });
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: options.captureStdout ? ["inherit", "pipe", "pipe"] : "inherit",
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(
      `${command} failed: ${`${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim()}`,
    );
  }
  return result.stdout ?? "";
}

function parseEnv(rawOutput) {
  const env = {};
  for (const line of rawOutput.split(/\r?\n/)) {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) continue;
    const key = line.slice(0, separatorIndex);
    const rawValue = line.slice(separatorIndex + 1).trim();
    env[key] =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
  }
  return env;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
