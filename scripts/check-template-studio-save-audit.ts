import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { createThumbnailStudioPreviewValues } from "../src/utils/thumbnail-studio/input-preview";
import {
  createTemplateStudioDocumentSummary,
  sanitizeTemplateStudioDiagnostics,
  sanitizeTemplateStudioDocumentSummary,
} from "../src/utils/template-studio/save-audit";

const document = createThumbnailStudioDocument({ name: "Audit check" });
document.assets.secret = {
  id: "secret",
  label: "Must not enter the audit log",
  src: "data:image/png;base64,do-not-log-this",
};
const runtimeValues = createThumbnailStudioPreviewValues(document);
const summary = createTemplateStudioDocumentSummary(document, runtimeValues);

assert.equal(summary.kind, "thumbnail");
assert.equal(summary.assetCount, 1);
assert.equal(summary.nodeCount, 0);
assert.ok(summary.documentBytes > 0);
assert.doesNotMatch(JSON.stringify(summary), /do-not-log-this/);

const diagnostics = sanitizeTemplateStudioDiagnostics([
  {
    id: "bad-input",
    severity: "error",
    title: "Invalid input",
    detail: "The input is invalid.",
    secret: "must be dropped",
  },
  { id: "invalid", severity: "fatal" },
]);
assert.deepEqual(diagnostics, [
  {
    id: "bad-input",
    severity: "error",
    title: "Invalid input",
    detail: "The input is invalid.",
  },
]);

assert.deepEqual(
  sanitizeTemplateStudioDocumentSummary({
    ...summary,
    rawDocument: document,
    assetCount: -1,
  }),
  {
    schema: "studio_template_document",
    kind: "thumbnail",
    version: document.version,
    rootNodeCount: 0,
    nodeCount: 0,
    inputCount: 0,
    documentBytes: summary.documentBytes,
    runtimeBytes: summary.runtimeBytes,
  },
  "Client-provided summaries must be allowlisted and non-negative.",
);

const migrationPath = fileURLToPath(
  new URL(
    "../supabase/migrations/20260819010000_create_template_studio_save_events.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");
assert.match(
  migration,
  /CREATE TABLE IF NOT EXISTS public\.template_studio_save_events/,
);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /REVOKE ALL .* FROM anon, authenticated/);
assert.match(migration, /GRANT SELECT, INSERT .* TO service_role/);
assert.doesNotMatch(
  migration,
  /document\s+JSONB|runtime_values\s+JSONB|src\s+TEXT/i,
  "Audit schema must not add raw document, runtime, or image-source columns.",
);

console.log("Template Studio save audit checks passed.");
