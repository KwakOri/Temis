import {
  StudioDiagnostic,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { createStudioInitialRuntimeValues } from "@/utils/template-studio/input-values";
import { migrateStudioTemplateDocument } from "@/utils/template-studio/migrations";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import {
  isStudioRuntimeValuesLike,
  validateStudioRuntimeValuesForDocument,
} from "@/utils/template-studio/timetable-runtime";

export const STUDIO_TEMPLATE_EXPORT_SCHEMA = "studio_template_export";
export const STUDIO_TEMPLATE_EXPORT_VERSION = 1;

export interface StudioTemplateExportPayload {
  schema: typeof STUDIO_TEMPLATE_EXPORT_SCHEMA;
  version: typeof STUDIO_TEMPLATE_EXPORT_VERSION;
  exportedAt: string;
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
}

export type StudioTemplateImportResult =
  | {
      ok: true;
      document: StudioTemplateDocument;
      runtimeValues: StudioRuntimeValues;
      diagnostics: StudioDiagnostic[];
      migrationWarnings: string[];
      usedRuntimeFallback: boolean;
    }
  | {
      ok: false;
      message: string;
      diagnostics?: StudioDiagnostic[];
    };

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getImportedDocumentSource = (value: unknown): unknown | null => {
  if (isRecord(value) && value.schema === "studio_template_document") {
    return value;
  }

  if (
    isRecord(value) &&
    value.schema === STUDIO_TEMPLATE_EXPORT_SCHEMA &&
    value.version === STUDIO_TEMPLATE_EXPORT_VERSION &&
    isRecord(value.document)
  ) {
    return value.document;
  }

  return null;
};

const getImportedRuntimeValues = (
  value: unknown,
): StudioRuntimeValues | null => {
  if (
    isRecord(value) &&
    value.schema === STUDIO_TEMPLATE_EXPORT_SCHEMA &&
    value.version === STUDIO_TEMPLATE_EXPORT_VERSION &&
    isStudioRuntimeValuesLike(value.runtimeValues)
  ) {
    return value.runtimeValues;
  }

  return null;
};

export const createStudioTemplateExportPayload = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
): StudioTemplateExportPayload => ({
  schema: STUDIO_TEMPLATE_EXPORT_SCHEMA,
  version: STUDIO_TEMPLATE_EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  document: cloneJson(document),
  runtimeValues: cloneJson(runtimeValues),
});

export const getStudioTemplateExportFilename = (
  document: StudioTemplateDocument,
): string => {
  const label = document.metadata.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date().toISOString().slice(0, 10);

  return `${label || "template-studio"}-${date}.json`;
};

export const getStudioTemplateBlockingDiagnostics = (
  diagnostics: StudioDiagnostic[],
): StudioDiagnostic[] =>
  diagnostics.filter((diagnostic) => diagnostic.severity === "error");

export const getStudioTemplateDiagnosticsSummary = (
  diagnostics: StudioDiagnostic[],
) => {
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  const warnings = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  );

  return {
    errorCount: errors.length,
    warningCount: warnings.length,
    firstError: errors[0] ?? null,
    firstWarning: warnings[0] ?? null,
  };
};

export const parseStudioTemplateExportJson = (
  source: string,
): StudioTemplateImportResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    return {
      ok: false,
      message: "The selected file is not valid JSON.",
    };
  }

  const importedDocumentSource = getImportedDocumentSource(parsed);

  if (!importedDocumentSource) {
    return {
      ok: false,
      message: "The selected JSON is not a Template Studio document.",
    };
  }

  const migrationResult = migrateStudioTemplateDocument(importedDocumentSource);

  if (!migrationResult.ok) {
    return {
      ok: false,
      message: migrationResult.message,
    };
  }

  const document = migrationResult.document;
  const diagnostics = validateStudioDocument(document);
  const blockingDiagnostics = getStudioTemplateBlockingDiagnostics(diagnostics);

  if (blockingDiagnostics.length > 0) {
    return {
      ok: false,
      message: `The selected document has ${blockingDiagnostics.length} validation error(s).`,
      diagnostics,
    };
  }

  const importedRuntimeValues = getImportedRuntimeValues(parsed);
  const runtimeDiagnostics = importedRuntimeValues
    ? validateStudioRuntimeValuesForDocument(document, importedRuntimeValues)
    : [];
  const runtimeBlockingDiagnostics =
    getStudioTemplateBlockingDiagnostics(runtimeDiagnostics);
  if (runtimeBlockingDiagnostics.length > 0) {
    return {
      ok: false,
      message: `The selected runtime values have ${runtimeBlockingDiagnostics.length} validation error(s).`,
      diagnostics: [...diagnostics, ...runtimeDiagnostics],
    };
  }

  return {
    ok: true,
    document,
    runtimeValues: importedRuntimeValues
      ? cloneJson(importedRuntimeValues)
      : createStudioInitialRuntimeValues(document),
    diagnostics: [...diagnostics, ...runtimeDiagnostics],
    migrationWarnings: migrationResult.warnings,
    usedRuntimeFallback: !importedRuntimeValues,
  };
};
