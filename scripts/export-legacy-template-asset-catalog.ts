import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { createLegacyAssetInventory } from "./lib/legacy-template-asset-inventory";
const output = process.argv[2];
if (!output || !path.resolve(output).startsWith("/tmp/"))
  throw new Error("A new /tmp output file is required.");
const rows = JSON.parse(
  execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_temis",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-c",
      `SELECT COALESCE(json_agg(entry),'[]') FROM (SELECT 'timetable' AS "ownerKind", id::text AS "templateId" FROM public.templates UNION ALL SELECT 'team_timetable', id::text FROM public.team_templates UNION ALL SELECT 'thumbnail', id::text FROM public.thumbnails) entry`,
    ],
    { encoding: "utf8" },
  ),
);
writeFileSync(output, JSON.stringify(rows, null, 2), { flag: "wx" });
const inventory = createLegacyAssetInventory(path.resolve(__dirname, ".."), {
  catalog: rows,
});
console.log(
  JSON.stringify(
    {
      source: "local Docker supabase_db_temis (read-only)",
      summary: inventory.summary,
      missingParents: inventory.templates
        .filter((item) => item.parentStatus === "missing")
        .map((item) => ({
          ownerKind: item.ownerKind,
          templateId: item.templateId,
        })),
    },
    null,
    2,
  ),
);
