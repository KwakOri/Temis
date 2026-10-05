import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createLegacyAssetInventory,
  OWNER_KINDS,
  type CatalogEntry,
  type OwnerKind,
} from "./lib/legacy-template-asset-inventory";

const HELP = `Usage: npm run inventory:legacy-assets -- [options]
  --owner-kind <timetable|team_timetable|thumbnail>
  --template-id <uuid>
  --catalog <json-file>   Read-only parent snapshot: [{ownerKind, templateId}]
  --output <json-file>    Save the full inventory; no source files are changed
  --json                 Print the full inventory
  --strict               Exit with failure if any template is not ready
  --help

Reads local files only. Does not upload files or contact a database.
Without --catalog, database parent checks remain not_checked.`;

function run() {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--help", "--json", "--strict"].includes(arg)) flags.add(arg);
    else if (
      ["--owner-kind", "--template-id", "--catalog", "--output"].includes(arg)
    ) {
      const value = argv[++index];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${arg}`);
      values.set(arg, value);
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (flags.has("--help")) {
    console.log(HELP);
    return;
  }
  const kind = values.get("--owner-kind");
  if (kind && !OWNER_KINDS.includes(kind as OwnerKind))
    throw new Error("Invalid owner kind");
  const id = values.get("--template-id");
  if (id && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id))
    throw new Error("Invalid template ID");
  let catalog: CatalogEntry[] | undefined;
  const catalogFile = values.get("--catalog");
  if (catalogFile) {
    const parsed: unknown = JSON.parse(readFileSync(catalogFile, "utf8"));
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (row) =>
          row &&
          typeof row === "object" &&
          OWNER_KINDS.includes(row.ownerKind) &&
          typeof row.templateId === "string",
      )
    ) {
      throw new Error("Invalid catalog snapshot");
    }
    catalog = parsed;
  }
  const rootDir = path.resolve(__dirname, "..");
  const inventory = createLegacyAssetInventory(rootDir, {
    ownerKind: kind as OwnerKind | undefined,
    templateId: id,
    catalog,
  });
  if ((kind || id) && inventory.templates.length === 0)
    throw new Error("No templates matched the filter");
  const json = JSON.stringify(inventory, null, 2) + "\n";
  const output = values.get("--output");
  if (output) {
    const file = path.resolve(output);
    const relative = path.relative(rootDir, file);
    if (
      file === path.resolve(catalogFile ?? "") ||
      relative === "package.json" ||
      /^(?:src|public|supabase|scripts|\.git)(?:\/|$)/.test(relative)
    ) {
      throw new Error(
        "Output must be a report path, not source or catalog input",
      );
    }
    writeFileSync(file, json, { flag: "wx" });
  }
  if (flags.has("--json")) console.log(json.trimEnd());
  else {
    console.log(JSON.stringify(inventory.summary, null, 2));
    const counts = new Map<string, number>();
    for (const template of inventory.templates)
      for (const issue of template.issues)
        counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
    console.log("Issues:", JSON.stringify(Object.fromEntries(counts)));
  }
  if (
    flags.has("--strict") &&
    inventory.templates.some((template) => template.status !== "ready")
  )
    process.exitCode = 1;
}

try {
  run();
} catch {
  console.error(
    "Inventory failed. Check arguments, report paths, and image inputs. Use --help for usage.",
  );
  process.exitCode = 1;
}
