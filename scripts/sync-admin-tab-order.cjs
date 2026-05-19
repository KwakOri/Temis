#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const adminTabsPath = path.join(rootDir, "src", "lib", "adminTabs.ts");
const args = process.argv.slice(2);

const options = parseArgs(args);
const sourceTabIds = readAdminTabIds();
const requestedTabIds = options.tabIds.length > 0 ? options.tabIds : sourceTabIds;
const tabIds = unique([...requestedTabIds]);

if (tabIds.length === 0) {
  console.error("[sync-admin-tab-order] No tab ids found.");
  process.exit(1);
}

validateTabIds(tabIds);

const sql = buildSql(tabIds, options.visible);

if (options.dryRun) {
  console.log(sql);
  process.exit(0);
}

const dbUrl = options.dbUrl || getLocalDbUrl();

console.log(
  `[sync-admin-tab-order] Syncing ${tabIds.length} tab id(s) into admin_tab_order...`
);
runCommand("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q"], { input: sql });
console.log("[sync-admin-tab-order] Done.");

function parseArgs(rawArgs) {
  const parsed = {
    dbUrl: null,
    dryRun: false,
    visible: true,
    tabIds: [],
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--hidden") {
      parsed.visible = false;
      continue;
    }

    if (arg === "--visible") {
      parsed.visible = true;
      continue;
    }

    if (arg === "--db-url") {
      const value = rawArgs[index + 1];

      if (!value) {
        console.error("[sync-admin-tab-order] --db-url requires a value.");
        process.exit(1);
      }

      parsed.dbUrl = value;
      index += 1;
      continue;
    }

    if (arg === "--tab-id") {
      const value = rawArgs[index + 1];

      if (!value) {
        console.error("[sync-admin-tab-order] --tab-id requires a value.");
        process.exit(1);
      }

      parsed.tabIds.push(value);
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg.startsWith("--")) {
      console.error(`[sync-admin-tab-order] Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }

    parsed.tabIds.push(arg);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  npm run admin:tabs:sync
  npm run admin:tabs:sync -- --dry-run
  npm run admin:tabs:sync -- --tab-id settlements
  npm run admin:tabs:sync -- customOrders settlements

Options:
  --db-url <url>  Target database URL. Defaults to local Supabase DB.
  --dry-run       Print SQL without applying it.
  --hidden        Newly inserted rows default to is_visible = false.
  --visible       Newly inserted rows default to is_visible = true.
  --tab-id <id>   Add a specific tab id. Can be repeated.
`);
}

function readAdminTabIds() {
  const source = fs.readFileSync(adminTabsPath, "utf8");
  const match = source.match(
    /ADMIN_TAB_SEGMENT_BY_ID[\s\S]*?=\s*\{([\s\S]*?)\};/
  );

  if (!match) {
    console.error(
      `[sync-admin-tab-order] Could not find ADMIN_TAB_SEGMENT_BY_ID in ${adminTabsPath}.`
    );
    process.exit(1);
  }

  return [...match[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/gm)].map(
    (item) => item[1]
  );
}

function unique(values) {
  return [...new Set(values)];
}

function validateTabIds(values) {
  const invalid = values.filter((value) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(value));

  if (invalid.length > 0) {
    console.error(
      `[sync-admin-tab-order] Invalid tab id(s): ${invalid.join(", ")}`
    );
    process.exit(1);
  }
}

function getLocalDbUrl() {
  const rawStatus = runCommand(
    "supabase",
    ["status", "-o", "env", "--workdir", rootDir],
    { captureStdout: true }
  );
  const status = parseStatusEnv(rawStatus);
  const dbUrl = status.DB_URL || status.POSTGRES_URL;

  if (!dbUrl) {
    console.error(
      "[sync-admin-tab-order] Could not read local DB URL. Start Supabase or pass --db-url."
    );
    process.exit(1);
  }

  return dbUrl;
}

function parseStatusEnv(rawStatus) {
  const parsed = {};

  for (const line of rawStatus.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);

    if (!match) {
      continue;
    }

    parsed[match[1]] = match[2].replace(/^"|"$/g, "");
  }

  return parsed;
}

function buildSql(ids, visible) {
  const values = ids
    .map((id, index) => `(${sqlString(id)}, ${index}, ${visible ? "true" : "false"})`)
    .join(",\n    ");
  const idArray = `ARRAY[${ids.map(sqlString).join(", ")}]::text[]`;

  return `BEGIN;

DO $$
DECLARE
  v_allowed text[];
BEGIN
  WITH constraint_values AS (
    SELECT match[1] AS tab_id
    FROM pg_constraint c
    CROSS JOIN LATERAL regexp_matches(
      pg_get_constraintdef(c.oid),
      '''([^'']+)''',
      'g'
    ) AS match
    WHERE c.conrelid = 'public.admin_tab_order'::regclass
      AND c.conname = 'check_tab_id'
  ),
  desired_values AS (
    SELECT unnest(${idArray}) AS tab_id
  ),
  existing_values AS (
    SELECT tab_id::text
    FROM public.admin_tab_order
  )
  SELECT array_agg(DISTINCT tab_id ORDER BY tab_id)
    INTO v_allowed
  FROM (
    SELECT tab_id FROM constraint_values
    UNION
    SELECT tab_id FROM desired_values
    UNION
    SELECT tab_id FROM existing_values
  ) allowed
  WHERE tab_id IS NOT NULL
    AND tab_id <> '';

  ALTER TABLE public.admin_tab_order
    DROP CONSTRAINT IF EXISTS check_tab_id;

  EXECUTE format(
    'ALTER TABLE public.admin_tab_order ADD CONSTRAINT check_tab_id CHECK (tab_id = ANY (%L::varchar[]))',
    v_allowed::varchar[]
  );
END
$$;

WITH desired(tab_id, source_order, is_visible) AS (
  VALUES
    ${values}
),
missing AS (
  SELECT
    desired.*,
    ROW_NUMBER() OVER (ORDER BY desired.source_order) AS append_offset
  FROM desired
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.admin_tab_order ato
    WHERE ato.tab_id = desired.tab_id
  )
),
max_order AS (
  SELECT COALESCE(MAX(order_index), -1) AS current_max
  FROM public.admin_tab_order
)
INSERT INTO public.admin_tab_order (tab_id, order_index, is_visible)
SELECT
  missing.tab_id,
  max_order.current_max + missing.append_offset,
  missing.is_visible
FROM missing
CROSS JOIN max_order
ORDER BY missing.source_order
ON CONFLICT (tab_id) DO NOTHING;

SELECT tab_id, order_index, is_visible
FROM public.admin_tab_order
ORDER BY order_index;

COMMIT;
`;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runCommand(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
    input: options.input,
    stdio: options.captureStdout ? ["inherit", "pipe", "pipe"] : "pipe",
  });

  if (result.error) {
    console.error(
      `[sync-admin-tab-order] Failed to run \`${command}\`: ${result.error.message}`
    );
    process.exit(1);
  }

  if (result.stdout && !options.captureStdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr && !options.captureStdout) {
    process.stderr.write(result.stderr);
  }

  if ((result.status ?? 1) !== 0) {
    if (options.captureStdout) {
      if (result.stdout) {
        process.stdout.write(result.stdout);
      }

      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    }

    process.exit(result.status ?? 1);
  }

  return result.stdout || "";
}
