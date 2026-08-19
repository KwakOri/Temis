import type {
  StudioDiagnostic,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";

export const TEMPLATE_STUDIO_SAVE_OPERATIONS = [
  "save_draft",
  "publish",
  "preview",
] as const;

export type TemplateStudioSaveOperation =
  (typeof TEMPLATE_STUDIO_SAVE_OPERATIONS)[number];

export interface TemplateStudioDocumentSummary {
  schema: string;
  version: number;
  kind: string | null;
  rootNodeCount: number;
  nodeCount: number;
  inputCount: number;
  assetCount: number;
  documentBytes: number;
  runtimeBytes: number;
}

const getJsonByteLength = (value: unknown): number => {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return 0;
  }
};

export const createTemplateStudioDocumentSummary = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
): TemplateStudioDocumentSummary => ({
  schema: document.schema,
  version: document.version,
  kind: document.metadata.kind ?? null,
  rootNodeCount: document.graph.rootNodeIds.length,
  nodeCount: Object.keys(document.graph.nodes).length,
  inputCount: Object.keys(document.inputs).length,
  assetCount: Object.keys(document.assets).length,
  documentBytes: getJsonByteLength(document),
  runtimeBytes: getJsonByteLength(runtimeValues),
});

export const sanitizeTemplateStudioDiagnostics = (
  value: unknown,
): StudioDiagnostic[] => {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 50).flatMap((diagnostic) => {
    if (!diagnostic || typeof diagnostic !== "object") return [];
    const candidate = diagnostic as Partial<StudioDiagnostic>;
    if (
      typeof candidate.id !== "string" ||
      (candidate.severity !== "error" && candidate.severity !== "warning") ||
      typeof candidate.title !== "string" ||
      typeof candidate.detail !== "string"
    ) {
      return [];
    }

    return [
      {
        id: candidate.id.slice(0, 200),
        severity: candidate.severity,
        title: candidate.title.slice(0, 300),
        detail: candidate.detail.slice(0, 1000),
      },
    ];
  });
};

export const sanitizeTemplateStudioDocumentSummary = (
  value: unknown,
): Record<string, string | number | null> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Record<string, unknown>;
  const summary: Record<string, string | number | null> = {};

  for (const key of ["schema", "kind"] as const) {
    const field = candidate[key];
    if (field === null) summary[key] = null;
    if (typeof field === "string") summary[key] = field.slice(0, 100);
  }

  for (const key of [
    "version",
    "rootNodeCount",
    "nodeCount",
    "inputCount",
    "assetCount",
    "documentBytes",
    "runtimeBytes",
  ] as const) {
    const field = candidate[key];
    if (typeof field === "number" && Number.isFinite(field) && field >= 0) {
      summary[key] = Math.floor(field);
    }
  }

  return summary;
};

export const isTemplateStudioSaveOperation = (
  value: unknown,
): value is TemplateStudioSaveOperation =>
  TEMPLATE_STUDIO_SAVE_OPERATIONS.includes(
    value as TemplateStudioSaveOperation,
  );
