/**
 * Batch cleanup for legacy Template Studio runtime image values.
 *
 * Per docs/template-system-integration/12-user-runtime-browser-image-storage.md,
 * runtime images now live only in the browser's IndexedDB. The runtime GET
 * route (src/app/api/user/templates/[id]/runtime/route.ts) already strips
 * and persists this cleanup lazily whenever a user next opens a template,
 * but states nobody has reopened yet can still carry old image Data URIs in
 * template_studio_user_states.runtime_values. This script finds those rows
 * and strips only the image-input keys, leaving every other runtime value
 * (text/select/timetable) untouched.
 *
 * Each row is rewritten with a single `.update()` call, so a failure on one
 * row never leaves that row's JSON partially modified — it is either
 * untouched or fully replaced with the stripped value.
 *
 * Usage:
 *   npx tsx scripts/cleanup-legacy-runtime-image-data.ts                 # dry-run
 *   npx tsx scripts/cleanup-legacy-runtime-image-data.ts --apply
 *   npx tsx scripts/cleanup-legacy-runtime-image-data.ts --apply --template-id <uuid>
 *
 * Requires the same Supabase env vars the app uses at runtime
 * (SUPABASE_URL, SUPABASE_SECRET_KEY). Verify against a
 * local/replica database before ever running --apply against production.
 */
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { getTemplateStudioCurrentDocument } from "../src/services/server/templateStudioPersistenceService";
import type { StudioRuntimeValues, StudioTemplateDocument } from "../src/types/template-studio";
import { stripStudioRuntimeImageValues } from "../src/utils/template-studio/runtime-image-strip";

// template_studio_* tables aren't in the generated Supabase types yet
// (src/types/supabase.ts), so this is typed loosely rather than through the
// generated `Database` union.
type StudioQueryResult<T> = { data: T[] | null; error: { message: string } | null };
type StudioQuery<T> = PromiseLike<StudioQueryResult<T>> & {
  select(columns?: string): StudioQuery<T>;
  eq(column: string, value: unknown): StudioQuery<T>;
  order(column: string, options?: { ascending?: boolean }): StudioQuery<T>;
  range(from: number, to: number): StudioQuery<T>;
  update(value: unknown): StudioQuery<T>;
};
type StudioTablesClient = {
  from<T>(table: string): StudioQuery<T>;
};
const studioClient = supabaseAdminServer as unknown as StudioTablesClient;

type CliOptions = {
  apply: boolean;
  templateId?: string;
  maxRows: number;
};

type UserStateRow = {
  id: string;
  template_id: string;
  user_id: number;
  runtime_values: StudioRuntimeValues;
};

const printHelp = () => {
  console.log(
    [
      "Usage: npx tsx scripts/cleanup-legacy-runtime-image-data.ts [options]",
      "",
      "Default mode is dry-run (no writes). Strips image-input values out of",
      "template_studio_user_states.runtime_values; all other values (text,",
      "select, timetable) are left untouched.",
      "",
      "Options:",
      "  --apply                 Actually write the cleaned runtime_values",
      "  --template-id <uuid>    Limit cleanup to one template",
      "  --max-rows <n>          Maximum rows to scan per run (default: 5000)",
      "  --help                  Show help",
    ].join("\n")
  );
};

const parseCliOptions = (): CliOptions => {
  const argv = process.argv.slice(2);
  const argMap = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      argMap.set(key, true);
      continue;
    }
    argMap.set(key, next);
    index += 1;
  }

  if (argMap.has("help") || argMap.has("h")) {
    printHelp();
    process.exit(0);
  }

  const maxRowsRaw = argMap.get("max-rows");
  const maxRows = typeof maxRowsRaw === "string" ? Number(maxRowsRaw) : 5000;
  if (!Number.isFinite(maxRows) || maxRows <= 0) {
    throw new Error("--max-rows must be a positive number.");
  }

  return {
    apply: argMap.has("apply"),
    templateId:
      typeof argMap.get("template-id") === "string"
        ? String(argMap.get("template-id")).trim()
        : undefined,
    maxRows: Math.trunc(maxRows),
  };
};

const fetchCandidateRows = async (options: CliOptions): Promise<UserStateRow[]> => {
  const rows: UserStateRow[] = [];
  const pageSize = 500;
  let from = 0;

  while (rows.length < options.maxRows) {
    let query = studioClient
      .from<UserStateRow>("template_studio_user_states")
      .select("id, template_id, user_id, runtime_values")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (options.templateId) {
      query = query.eq("template_id", options.templateId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as UserStateRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows.slice(0, options.maxRows);
};

const countRuntimeValueKeys = (record?: Record<string, string>): number =>
  Object.keys(record ?? {}).length;

const countRemovedFields = (
  before: StudioRuntimeValues,
  after: StudioRuntimeValues
): number => {
  let removed = countRuntimeValueKeys(before.global) - countRuntimeValueKeys(after.global);

  for (const dayId of Object.keys(before.days ?? {})) {
    removed +=
      countRuntimeValueKeys(before.days?.[dayId]) -
      countRuntimeValueKeys(after.days?.[dayId]);
  }

  for (const dayId of Object.keys(before.entries ?? {})) {
    const beforeList = before.entries?.[dayId] ?? [];
    const afterList = after.entries?.[dayId] ?? [];
    beforeList.forEach((entry, index) => {
      removed += countRuntimeValueKeys(entry) - countRuntimeValueKeys(afterList[index]);
    });
  }

  return removed;
};

const run = async () => {
  const options = parseCliOptions();
  const rows = await fetchCandidateRows(options);

  console.log(`[cleanup:runtime-images] mode=${options.apply ? "apply" : "dry-run"}`);
  console.log(`[cleanup:runtime-images] scanned rows=${rows.length}`);

  const documentCache = new Map<string, StudioTemplateDocument | null>();

  let candidateCount = 0;
  let removedFieldTotal = 0;
  let appliedCount = 0;
  let errorCount = 0;
  const preview: string[] = [];

  for (const row of rows) {
    if (!documentCache.has(row.template_id)) {
      const record = await getTemplateStudioCurrentDocument(row.template_id);
      documentCache.set(row.template_id, record ? record.document : null);
    }
    const document = documentCache.get(row.template_id);
    // No published document (e.g. deleted/unpublished template) means there
    // is no input contract to strip against — leave the row untouched.
    if (!document) continue;

    const { values, changed } = stripStudioRuntimeImageValues(
      document,
      row.runtime_values
    );
    if (!changed) continue;

    candidateCount += 1;
    const removedFields = countRemovedFields(row.runtime_values, values);
    removedFieldTotal += removedFields;
    if (preview.length < 20) {
      preview.push(
        `  - state id=${row.id} template=${row.template_id} user=${row.user_id} removed_fields=${removedFields}`
      );
    }

    if (!options.apply) continue;

    const { error } = await studioClient
      .from("template_studio_user_states")
      .update({ runtime_values: values })
      .eq("id", row.id);

    if (error) {
      errorCount += 1;
      console.error(
        `[cleanup:runtime-images] failed to update state id=${row.id}:`,
        error.message
      );
      continue;
    }
    appliedCount += 1;
  }

  console.log(`[cleanup:runtime-images] rows needing cleanup=${candidateCount}`);
  console.log(`[cleanup:runtime-images] image fields to remove=${removedFieldTotal}`);
  if (preview.length > 0) {
    console.log("[cleanup:runtime-images] preview:");
    preview.forEach((line) => console.log(line));
    if (candidateCount > preview.length) {
      console.log(`  ... and ${candidateCount - preview.length} more`);
    }
  }

  if (!options.apply) {
    console.log("[cleanup:runtime-images] dry-run complete. Add --apply to write changes.");
    return;
  }

  console.log(
    `[cleanup:runtime-images] apply complete: updated=${appliedCount}, errors=${errorCount}`
  );
  if (errorCount > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("[cleanup:runtime-images] failed:", error);
  process.exitCode = 1;
});
