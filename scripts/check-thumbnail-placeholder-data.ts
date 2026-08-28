/**
 * Reports thumbnail documents that still store the same text in
 * `defaultValue` and `placeholder`.
 *
 * This is intentionally a read-only dry-run. The correction should be made by
 * opening the allowlisted template in Thumbnail Studio and publishing a new
 * revision so the old revision remains available for audit/rollback.
 *
 * Usage:
 *   npx tsx scripts/check-thumbnail-placeholder-data.ts
 *   npx tsx scripts/check-thumbnail-placeholder-data.ts --template-id <uuid>
 */
import { createHash } from "node:crypto";

import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";

const ALLOWLISTED_TEMPLATE_IDS = [
  "cc9d0c48-bb1f-4354-8fc5-7ce252bc668d",
  "bd209147-64a9-40f0-a2bd-ff6dd9b51969",
  "fb08ffad-1f92-41c9-9733-6ad7920c41d8",
] as const;

type StudioDocumentRow = {
  template_id: string;
  document: StudioTemplateDocument;
  runtime_values: StudioRuntimeValues;
};

type TemplateRow = {
  id: string;
  name: string;
  template_engine: string | null;
  template_kind: string | null;
  status: string;
};

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };
type Query<T> = PromiseLike<QueryResult<T>> & {
  select(columns?: string): Query<T>;
  eq(column: string, value: unknown): Query<T>;
  in(column: string, values: readonly string[]): Query<T>;
};
type ReadonlySupabaseClient = {
  from<T>(table: string): Query<T>;
};

const db = supabaseAdminServer as unknown as ReadonlySupabaseClient;

const hashJson = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 12);

const selectedTemplateIds = (): string[] => {
  const requested = process.argv
    .slice(2)
    .reduce<string | null>((value, token, index, args) => {
      if (token === "--template-id") return args[index + 1] ?? null;
      return value;
    }, null);

  if (!requested) return [...ALLOWLISTED_TEMPLATE_IDS];
  if (!ALLOWLISTED_TEMPLATE_IDS.includes(requested as never)) {
    throw new Error(
      "--template-id must be one of the explicit thumbnail allowlist IDs.",
    );
  }
  return [requested];
};

const getTextInputs = (document: StudioTemplateDocument) =>
  Object.values(document.inputs).filter(
    (input): input is Extract<StudioInputDefinition, { type: "text" }> =>
      input.type === "text",
  );

const run = async () => {
  const templateIds = selectedTemplateIds();
  const [
    { data: templates, error: templateError },
    { data: documents, error: documentError },
  ] = await Promise.all([
    db
      .from<TemplateRow>("templates")
      .select("id, name, template_engine, template_kind, status")
      .in("id", templateIds),
    db
      .from<StudioDocumentRow>("template_studio_documents")
      .select("template_id, document, runtime_values")
      .in("template_id", templateIds),
  ]);

  if (templateError) throw templateError;
  if (documentError) throw documentError;

  const templatesById = new Map(
    (templates ?? []).map((template) => [template.id, template]),
  );
  const documentsById = new Map(
    (documents ?? []).map((document) => [document.template_id, document]),
  );
  let candidateCount = 0;

  console.log("[check:thumbnail-placeholder-data] read-only dry-run");
  console.log(
    `[check:thumbnail-placeholder-data] templates=${templateIds.length}`,
  );

  for (const templateId of templateIds) {
    const template = templatesById.get(templateId);
    const record = documentsById.get(templateId);
    if (!template || !record) {
      console.log(`- ${templateId}: template or Studio document not found`);
      continue;
    }

    const inputIds = getTextInputs(record.document)
      .filter(
        (input) =>
          Boolean(input.placeholder?.trim()) &&
          input.defaultValue === input.placeholder,
      )
      .map((input) => input.id);
    const runtimeIds = inputIds.filter((inputId) => {
      const input = record.document.inputs[inputId];
      return (
        input?.type === "text" &&
        record.runtime_values.global?.[inputId] === input.placeholder
      );
    });
    if (inputIds.length === 0 && runtimeIds.length === 0) {
      console.log(
        `- ${template.name} (${templateId}): no legacy placeholder values`,
      );
      continue;
    }

    candidateCount += 1;
    console.log(`- ${template.name} (${templateId})`);
    console.log(
      `  kind=${template.template_engine}/${template.template_kind} status=${template.status}`,
    );
    console.log(`  document_hash=${hashJson(record.document)}`);
    console.log(`  runtime_hash=${hashJson(record.runtime_values)}`);
    console.log(`  input_ids=${inputIds.join(",") || "none"}`);
    console.log(`  runtime_global_ids=${runtimeIds.join(",") || "none"}`);
    console.log(
      "  action=edit in Thumbnail Studio, clear default/runtime value, then publish a new revision",
    );
  }

  console.log(
    `[check:thumbnail-placeholder-data] templates_needing_review=${candidateCount}`,
  );
  console.log(
    "[check:thumbnail-placeholder-data] no database writes were performed",
  );
};

run().catch((error) => {
  console.error("[check:thumbnail-placeholder-data] failed:", error);
  process.exitCode = 1;
});
