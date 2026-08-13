#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const supabaseDir = path.join(rootDir, "supabase");
const migrationsDir = path.join(supabaseDir, "migrations");
const tempDir = path.join(supabaseDir, ".temp");
const defaultProjectRef = "ajlgjdwkjyayrnocdfpj";
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

let restoreDir = null;
let keepDump = false;

try {
  const options = parseArgs(process.argv.slice(2));
  keepDump = options.keepDump;
  if (options.help) {
    printHelp();
  } else {
    main(options);
  }
} catch (error) {
  console.error(
    `[db:restore] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
} finally {
  if (restoreDir && !keepDump) {
    fs.rmSync(restoreDir, { recursive: true, force: true });
  } else if (restoreDir && keepDump) {
    console.log(`[db:restore] Kept restore artifacts at ${restoreDir}`);
  }
}

function main(options) {
  const context = loadContext();
  validateContext(context, options);

  console.log(
    `[db:restore] Remote source: ${context.useLinkedRemote ? `linked project ${context.projectRef}` : "SUPABASE_REMOTE_DB_URL"}`,
  );

  if (context.useLinkedRemote) {
    runCommand(
      "supabase",
      ["link", "--project-ref", context.projectRef, "--workdir", rootDir],
      { captureStdout: true },
    );
  }

  const remoteMigrationVersion = getRemoteMigrationVersion(context);
  const localMigrationVersions = getLocalMigrationVersions();
  validateMigrationVersion(remoteMigrationVersion, localMigrationVersions);

  const preflight = getRemoteDataPreflight(context);
  reportRemoteDataPreflight(preflight);

  fs.mkdirSync(tempDir, { recursive: true });
  restoreDir = fs.mkdtempSync(path.join(tempDir, "remote-restore-"));
  fs.chmodSync(restoreDir, 0o700);
  const dumpFilePath = path.join(restoreDir, "remote-data.sql");

  console.log("[db:restore] 1/7 Creating remote data dump...");
  dumpRemoteData(context, dumpFilePath);

  if (options.freshLocal) {
    console.log(
      `[db:restore] 2/7 Replacing local DB volume ${context.localDbVolume}...`,
    );
    replaceLocalDb(context);
  } else {
    console.log(
      "[db:restore] 2/7 Reusing the existing local DB volume (use --fresh-local to replace it)...",
    );
  }

  console.log("[db:restore] 3/7 Starting local Supabase...");
  const localConnection = startLocalSupabase(context);

  console.log(
    `[db:restore] 4/7 Resetting local DB to migration ${remoteMigrationVersion}...`,
  );
  resetLocalDbToVersion(remoteMigrationVersion);

  const dumpTableNames = extractCopyTablesFromDump(dumpFilePath);
  if (dumpTableNames.length === 0) {
    throw new Error("Remote dump contains no COPY table data.");
  }

  const existingTableNames = getExistingDumpTables(
    localConnection.dbUrl,
    dumpTableNames,
  );
  const missingTableNames = dumpTableNames.filter(
    (tableName) => !existingTableNames.includes(tableName),
  );
  let importFilePath = dumpFilePath;

  if (missingTableNames.length > 0 && !options.allowMissingTables) {
    throw new Error(
      `Remote dump tables are missing from the remote-version local schema: ${missingTableNames.join(", ")}. Review migration drift or rerun with --allow-missing-tables only when the omission is intentional.`,
    );
  }

  if (missingTableNames.length > 0) {
    console.warn(
      `[db:restore] Skipping explicitly allowed missing tables: ${missingTableNames.join(", ")}`,
    );
    importFilePath = createCompatibleDataDump(
      dumpFilePath,
      path.join(restoreDir, "remote-data-compatible.sql"),
      new Set(existingTableNames),
    );
  }

  console.log(
    `[db:restore] 5/7 Importing ${existingTableNames.length} remote table(s)...`,
  );
  truncateLocalTables(localConnection.dbUrl, existingTableNames);
  runCommand(
    "psql",
    [
      localConnection.dbUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "--single-transaction",
      "-q",
      "-f",
      importFilePath,
    ],
    { captureStdout: true },
  );

  console.log("[db:restore] 6/7 Applying pending local migrations...");
  runCommand(
    "supabase",
    ["migration", "up", "--local", "--yes", "--workdir", rootDir],
    { captureStdout: true },
  );
  syncLocalDerivedData(localConnection.dbUrl);

  console.log("[db:restore] 7/7 Verifying restored local DB...");
  verifyRestoredLocalDb(localConnection.dbUrl, localMigrationVersions.at(-1));

  console.log(
    `[db:restore] Complete. Remote migration ${remoteMigrationVersion} was imported, then local migrations through ${localMigrationVersions.at(-1)} were applied.`,
  );
  console.log(
    "[db:restore] Next step: run `npm run dev:local` to start the app against this local DB.",
  );
}

function loadContext() {
  const envFromFiles = loadEnvFiles([
    path.join(rootDir, ".env"),
    path.join(rootDir, ".env.local"),
    path.join(rootDir, ".envrc"),
  ]);
  const envForResolution = { ...envFromFiles, ...process.env };
  const remoteDbUrl = resolveEnvReference(
    process.env.SUPABASE_REMOTE_DB_URL ?? envFromFiles.SUPABASE_REMOTE_DB_URL,
    envForResolution,
  );
  const projectRef =
    process.env.SUPABASE_PROJECT_REF ??
    envFromFiles.SUPABASE_PROJECT_REF ??
    defaultProjectRef;
  const accessToken = resolveEnvReference(
    process.env.SUPABASE_ACCESS_TOKEN ??
      process.env.SB_TOKEN_TEMIS ??
      envFromFiles.SUPABASE_ACCESS_TOKEN ??
      envFromFiles.SB_TOKEN_TEMIS,
    envForResolution,
  );
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
  const localProjectId = readLocalProjectId();

  return {
    accessToken,
    localDbContainer: `supabase_db_${localProjectId}`,
    localDbVolume: `supabase_db_${localProjectId}`,
    projectRef,
    remoteDbUrl,
    remoteDumpSchemas,
    startExcludes,
    useLinkedRemote: !remoteDbUrl,
  };
}

function validateContext(context, options) {
  ensureCommandAvailable("supabase");
  ensureCommandAvailable("psql");
  if (options.freshLocal) ensureCommandAvailable("docker");

  if (context.useLinkedRemote && !context.accessToken) {
    throw new Error(
      "Missing remote auth. Set SB_TOKEN_TEMIS or SUPABASE_ACCESS_TOKEN.",
    );
  }
  if (context.remoteDumpSchemas.length === 0) {
    throw new Error(
      "SUPABASE_REMOTE_DUMP_SCHEMAS must include at least one schema.",
    );
  }
  if (context.accessToken) {
    process.env.SUPABASE_ACCESS_TOKEN = context.accessToken;
  }
}

function getRemoteMigrationVersion(context) {
  const output = runRemoteQuery(
    context,
    "select max(version)::text as latest_remote_migration from supabase_migrations.schema_migrations;",
  );
  const versions = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{14}$/.test(line));
  const latestVersion = versions.at(-1);
  if (!latestVersion) {
    throw new Error("Could not determine the latest remote migration version.");
  }
  return latestVersion;
}

function getLocalMigrationVersions() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migration directory not found: ${migrationsDir}`);
  }

  const versions = fs
    .readdirSync(migrationsDir)
    .map((fileName) => fileName.match(/^(\d{14})_.+\.sql$/)?.[1] ?? null)
    .filter(Boolean);

  return Array.from(new Set(versions)).sort();
}

function validateMigrationVersion(remoteVersion, localVersions) {
  if (localVersions.length === 0) {
    throw new Error("No local migrations were found.");
  }
  if (!localVersions.includes(remoteVersion)) {
    throw new Error(
      `Remote migration ${remoteVersion} is not present in ${migrationsDir}.`,
    );
  }
  if (remoteVersion > localVersions.at(-1)) {
    throw new Error(
      `Remote migration ${remoteVersion} is newer than local migration ${localVersions.at(-1)}.`,
    );
  }
}

function getRemoteDataPreflight(context) {
  const output = runRemoteQuery(
    context,
    `
      SELECT 'template_access_duplicate_groups' AS check_name, COUNT(*)::text AS value
      FROM (
        SELECT template_id, user_id
        FROM public.template_access
        GROUP BY template_id, user_id
        HAVING COUNT(*) > 1
      ) duplicate_groups
      UNION ALL
      SELECT 'shop_template_duplicate_groups', COUNT(*)::text
      FROM (
        SELECT template_id
        FROM public.shop_templates
        WHERE template_id IS NOT NULL
        GROUP BY template_id
        HAVING COUNT(*) > 1
      ) duplicate_groups
      UNION ALL
      SELECT 'pending_purchase_duplicate_groups', COUNT(*)::text
      FROM (
        SELECT user_id, template_id
        FROM public.template_purchase_requests
        WHERE status = 'pending'
        GROUP BY user_id, template_id
        HAVING COUNT(*) > 1
      ) duplicate_groups;
    `,
  );
  const rows = parseCsvRows(output);
  return new Map(rows.map(([name, value]) => [name, Number(value)]));
}

function reportRemoteDataPreflight(preflight) {
  const accessDuplicates =
    preflight.get("template_access_duplicate_groups") ?? 0;
  const shopDuplicates = preflight.get("shop_template_duplicate_groups") ?? 0;
  const pendingDuplicates =
    preflight.get("pending_purchase_duplicate_groups") ?? 0;

  console.log(
    `[db:restore] Remote preflight: template_access duplicates=${accessDuplicates}, shop_templates duplicates=${shopDuplicates}, pending purchase duplicates=${pendingDuplicates}`,
  );

  if (shopDuplicates > 0) {
    throw new Error(
      `Remote data has ${shopDuplicates} duplicate shop_templates.template_id group(s); the unique index migration will fail. Resolve them remotely before restoring.`,
    );
  }
  if (pendingDuplicates > 0) {
    throw new Error(
      `Remote data has ${pendingDuplicates} duplicate pending purchase group(s); the pending-request unique index migration will fail. Resolve them remotely before restoring.`,
    );
  }
  if (accessDuplicates > 0) {
    console.warn(
      `[db:restore] template_access duplicates will be reconciled by 20260715050000_reconcile_template_access.sql (${accessDuplicates} group(s)).`,
    );
  }
}

function dumpRemoteData(context, dumpFilePath) {
  const args = [
    "db",
    "dump",
    "--data-only",
    "--use-copy",
    "--file",
    dumpFilePath,
    "--workdir",
    rootDir,
  ];
  if (context.useLinkedRemote) {
    args.push("--linked");
  } else {
    args.push("--db-url", context.remoteDbUrl);
  }
  for (const schema of context.remoteDumpSchemas) {
    args.push("--schema", schema);
  }

  runCommand("supabase", args, { captureStdout: true });
  const stat = fs.statSync(dumpFilePath);
  if (stat.size < 100) {
    throw new Error(`Remote dump is unexpectedly small: ${stat.size} bytes.`);
  }
  fs.chmodSync(dumpFilePath, 0o600);
}

function replaceLocalDb(context) {
  runOptionalCommand("supabase", ["stop", "--workdir", rootDir]);
  removeIfPresent("docker", ["rm", context.localDbContainer]);
  removeIfPresent("docker", ["volume", "rm", context.localDbVolume]);
}

function startLocalSupabase(context) {
  const startArgs = ["start", "--workdir", rootDir];
  for (const excludedService of context.startExcludes) {
    startArgs.push("--exclude", excludedService);
  }
  runCommand("supabase", startArgs, { captureStdout: true });

  const statusEnv = parseStatusOutput(
    runCommand("supabase", ["status", "-o", "env", "--workdir", rootDir], {
      captureStdout: true,
    }),
  );
  const dbUrl = statusEnv.DB_URL ?? statusEnv.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error(
      "Could not read the local DB URL from `supabase status -o env`.",
    );
  }
  return { dbUrl };
}

function resetLocalDbToVersion(version) {
  runCommand(
    "supabase",
    [
      "db",
      "reset",
      "--local",
      "--no-seed",
      "--yes",
      "--version",
      version,
      "--workdir",
      rootDir,
    ],
    { captureStdout: true },
  );
}

function extractCopyTablesFromDump(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const tables = new Set();
  for (const line of lines) {
    const tableName = extractCopyTableName(line);
    if (tableName) tables.add(tableName);
  }
  return Array.from(tables);
}

function extractCopyTableName(line) {
  const match = line.match(
    /^COPY\s+((?:"[^"]+"|[^\s(]+)(?:\.(?:"[^"]+"|[^\s(]+))?)\s+\(/,
  );
  return match?.[1]?.trim() ?? null;
}

function getExistingDumpTables(localDbUrl, tableNames) {
  const values = tableNames
    .map((tableName) => `('${escapeSqlLiteral(tableName)}')`)
    .join(", ");
  const output = runLocalQuery(
    localDbUrl,
    `
      SELECT table_name
      FROM (VALUES ${values}) AS dump_tables(table_name)
      WHERE to_regclass(table_name) IS NOT NULL
      ORDER BY table_name;
    `,
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createCompatibleDataDump(sourcePath, targetPath, existingTableSet) {
  const sourceLines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  const outputLines = [];
  let copyMode = null;

  for (const line of sourceLines) {
    if (copyMode) {
      if (line === "\\.") {
        if (copyMode === "include") outputLines.push(line);
        copyMode = null;
      } else if (copyMode === "include") {
        outputLines.push(line);
      }
      continue;
    }

    const tableName = extractCopyTableName(line);
    if (tableName) {
      copyMode = existingTableSet.has(tableName) ? "include" : "skip";
      if (copyMode === "include") outputLines.push(line);
      continue;
    }

    outputLines.push(line);
  }

  fs.writeFileSync(targetPath, outputLines.join("\n"), "utf8");
  fs.chmodSync(targetPath, 0o600);
  return targetPath;
}

function truncateLocalTables(localDbUrl, tableNames) {
  if (tableNames.length === 0) return;
  const truncateSql = `TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE;`;
  runCommand(
    "psql",
    [localDbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-c", truncateSql],
    { captureStdout: true },
  );
}

function verifyRestoredLocalDb(localDbUrl, expectedLatestMigration) {
  const latestMigration = runLocalQuery(
    localDbUrl,
    "select max(version)::text from supabase_migrations.schema_migrations;",
  ).trim();
  if (latestMigration !== expectedLatestMigration) {
    throw new Error(
      `Local migration verification failed: expected ${expectedLatestMigration}, got ${latestMigration || "empty"}.`,
    );
  }

  const objectRows = parsePipeRows(
    runLocalQuery(
      localDbUrl,
      `
        SELECT object_name, (to_regclass(object_name) IS NOT NULL)::text
        FROM (VALUES
          ('public.template_studio_documents'),
          ('public.template_studio_user_states'),
          ('public.custom_thumbnail_orders'),
          ('public.template_hub_list')
        ) AS required_objects(object_name);
      `,
    ),
  );
  const missingObjects = objectRows
    .filter(([, exists]) => exists !== "true")
    .map(([name]) => name);
  if (missingObjects.length > 0) {
    throw new Error(
      `Local object verification failed; missing: ${missingObjects.join(", ")}.`,
    );
  }

  const integrityRows = parsePipeRows(
    runLocalQuery(
      localDbUrl,
      `
        SELECT 'template_access_duplicate_groups', COUNT(*)::text
        FROM (
          SELECT template_id, user_id
          FROM public.template_access
          GROUP BY template_id, user_id
          HAVING COUNT(*) > 1
        ) q
        UNION ALL
        SELECT 'shop_template_duplicate_groups', COUNT(*)::text
        FROM (
          SELECT template_id
          FROM public.shop_templates
          WHERE template_id IS NOT NULL
          GROUP BY template_id
          HAVING COUNT(*) > 1
        ) q
        UNION ALL
        SELECT 'pending_purchase_duplicate_groups', COUNT(*)::text
        FROM (
          SELECT user_id, template_id
          FROM public.template_purchase_requests
          WHERE status = 'pending'
          GROUP BY user_id, template_id
          HAVING COUNT(*) > 1
        ) q;
      `,
    ),
  );
  const failedIntegrityChecks = integrityRows.filter(
    ([, value]) => value !== "0",
  );
  if (failedIntegrityChecks.length > 0) {
    throw new Error(
      `Local integrity verification failed: ${failedIntegrityChecks.map(([name, value]) => `${name}=${value}`).join(", ")}.`,
    );
  }

  const stats = new Map(
    parsePipeRows(
      runLocalQuery(
        localDbUrl,
        `
          SELECT 'users', COUNT(*)::text FROM public.users
          UNION ALL SELECT 'templates', COUNT(*)::text FROM public.templates
          UNION ALL SELECT 'template_access', COUNT(*)::text FROM public.template_access;
        `,
      ),
    ),
  );
  console.log(
    `[db:restore] Verified migration=${latestMigration}, users=${stats.get("users") ?? "0"}, templates=${stats.get("templates") ?? "0"}, template_access=${stats.get("template_access") ?? "0"}.`,
  );
}

function syncLocalDerivedData(localDbUrl) {
  runCommand(
    "psql",
    [
      localDbUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-c",
      `
        INSERT INTO public.template_sale_royalties (
          template_sale_id,
          artist_id,
          artist_name_snapshot,
          royalty_amount,
          status
        )
        SELECT
          ts.id,
          a.id,
          a.name,
          0,
          'unpaid'
        FROM public.template_sales ts
        JOIN public.template_artists ta
          ON ta.template_id = ts.template_id
        JOIN public.artists a
          ON a.id = ta.artist_id
        WHERE ts.status = 'completed'
          AND a.is_active = true
        ON CONFLICT (template_sale_id, artist_id) DO NOTHING;
      `,
    ],
    { captureStdout: true },
  );
}

function runRemoteQuery(context, sql) {
  const args = ["db", "query", "--output", "csv", "--workdir", rootDir];
  if (context.useLinkedRemote) {
    args.push("--linked");
  } else {
    args.push("--db-url", context.remoteDbUrl);
  }
  args.push(sql);
  return runCommand("supabase", args, { captureStdout: true });
}

function runLocalQuery(localDbUrl, sql) {
  return runCommand(
    "psql",
    [localDbUrl, "-At", "-F", "|", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { captureStdout: true },
  );
}

function parseCsvRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("check_name,"))
    .map((line) => line.split(","));
}

function parsePipeRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|"));
}

function removeIfPresent(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if ((result.status ?? 1) === 0) return;

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/No such (container|volume)/i.test(output)) return;
  throw new Error(
    `Failed to remove local Docker resource with ${command} ${args.join(" ")}: ${output.trim()}`,
  );
}

function runOptionalCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if ((result.status ?? 1) === 0) return;

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/not running|not found|no containers/i.test(output)) return;
  throw new Error(
    `Failed to run optional command ${command} ${args.join(" ")}: ${output.trim()}`,
  );
}

function runCommand(command, args, options = {}) {
  const captureStdout = options.captureStdout ?? false;
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: captureStdout ? ["inherit", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }
  if ((result.status ?? 1) !== 0) {
    const output = captureStdout
      ? `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim()
      : "";
    throw new Error(
      `Command failed (${result.status ?? "unknown"}): ${command} ${args.join(" ")}${output ? `\n${output.slice(-4000)}` : ""}`,
    );
  }
  return result.stdout ?? "";
}

function ensureCommandAvailable(command) {
  const whichCommand = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(whichCommand, [command], { stdio: "ignore" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Missing required command: ${command}`);
  }
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
      if (inlineCommentIndex > -1)
        value = value.slice(0, inlineCommentIndex).trim();
    }
    parsed[key] = value;
  }
  return parsed;
}

function parseStatusOutput(rawOutput) {
  const parsed = {};
  for (const line of rawOutput.split(/\r?\n/).map((entry) => entry.trim())) {
    if (!line || !line.includes("=")) continue;
    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex);
    const rawValue = line.slice(separatorIndex + 1).trim();
    parsed[key] =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
  }
  return parsed;
}

function readLocalProjectId() {
  const configPath = path.join(supabaseDir, "config.toml");
  const config = fs.readFileSync(configPath, "utf8");
  return config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] ?? "temis";
}

function resolveEnvReference(rawValue, sourceEnv) {
  if (!rawValue) return rawValue;
  let resolved = rawValue.trim();
  const visited = new Set();
  while (true) {
    const match =
      resolved.match(/^\$(\w+)$/) ?? resolved.match(/^\$\{(\w+)\}$/);
    if (!match) return resolved;
    const key = match[1];
    if (visited.has(key))
      throw new Error(`Circular environment reference: ${key}`);
    visited.add(key);
    resolved = sourceEnv[key];
    if (!resolved) return undefined;
    resolved = resolved.trim();
  }
}

function escapeSqlLiteral(value) {
  return value.replaceAll("'", "''");
}

function parseArgs(args) {
  const options = {
    allowMissingTables: false,
    freshLocal: false,
    help: false,
    keepDump: false,
  };
  for (const arg of args) {
    if (arg === "--fresh-local") options.freshLocal = true;
    else if (arg === "--keep-dump") options.keepDump = true;
    else if (arg === "--allow-missing-tables")
      options.allowMissingTables = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/restore-local-db-from-remote.cjs [options]

Options:
  --fresh-local             Replace only the local Supabase DB container/volume.
  --keep-dump               Keep the temporary remote dump for inspection.
  --allow-missing-tables    Skip dump tables missing from the remote-version schema.
  --help                    Show this help.

Examples:
  npm run db:restore:remote -- --fresh-local
  npm run db:restore:remote -- --fresh-local --keep-dump
`);
}
