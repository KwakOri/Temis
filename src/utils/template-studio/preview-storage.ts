import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";

export const TEMPLATE_STUDIO_PREVIEW_STORAGE_PREFIX =
  "template-studio:preview:";

export interface TemplateStudioPreviewStoragePayload {
  version: 1;
  createdAt: number;
  source: "draft";
  templateId?: string | null;
  templateName?: string;
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
}

export interface TemplateStudioPreviewStorageResult {
  payload: TemplateStudioPreviewStoragePayload;
  storage: "session" | "local";
}

const isPreviewPayload = (
  value: unknown,
): value is TemplateStudioPreviewStoragePayload => {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<TemplateStudioPreviewStoragePayload>;
  return (
    payload.version === 1 &&
    payload.source === "draft" &&
    Boolean(payload.document) &&
    Boolean(payload.runtimeValues)
  );
};

export const createTemplateStudioPreviewStorageKey = (): string => {
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${TEMPLATE_STUDIO_PREVIEW_STORAGE_PREFIX}${suffix}`;
};

export const writeTemplateStudioPreviewStorage = (
  key: string,
  payload: TemplateStudioPreviewStoragePayload,
): void => {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(payload);
  window.sessionStorage.setItem(key, serialized);
  window.localStorage.setItem(key, serialized);
};

export const readTemplateStudioPreviewStorage = (
  key: string,
): TemplateStudioPreviewStorageResult | null => {
  if (typeof window === "undefined") return null;

  const candidates = [
    ["session", window.sessionStorage.getItem(key)] as const,
    ["local", window.localStorage.getItem(key)] as const,
  ];

  for (const [storage, raw] of candidates) {
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isPreviewPayload(parsed)) {
        return {
          payload: parsed,
          storage,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
};
