import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";

export const TEMPLATE_STUDIO_PREVIEW_STORAGE_PREFIX =
  "template-studio:preview:";
export const TEMPLATE_STUDIO_PREVIEW_RUN_STORAGE_KEY =
  "template-studio:preview-run-id";

export interface TemplateStudioPreviewStoragePayload {
  version: 1;
  createdAt: number;
  source: "draft";
  previewId?: string;
  previewRunId?: string;
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

export const createTemplateStudioPreviewId = (): string =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getOrCreateTemplateStudioPreviewRunId = (): string => {
  if (typeof window === "undefined") {
    return createTemplateStudioPreviewId();
  }

  const currentRunId = window.sessionStorage.getItem(
    TEMPLATE_STUDIO_PREVIEW_RUN_STORAGE_KEY,
  );
  if (currentRunId) return currentRunId;

  const nextRunId = createTemplateStudioPreviewId();
  window.sessionStorage.setItem(
    TEMPLATE_STUDIO_PREVIEW_RUN_STORAGE_KEY,
    nextRunId,
  );
  return nextRunId;
};

const pruneTemplateStudioPreviewStorage = (
  storage: Storage,
  preserveKey: string,
): void => {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const storageKey = storage.key(index);
    if (
      storageKey?.startsWith(TEMPLATE_STUDIO_PREVIEW_STORAGE_PREFIX) &&
      storageKey !== preserveKey
    ) {
      storage.removeItem(storageKey);
    }
  }
};

const tryWritePreviewStorage = (
  storage: Storage,
  key: string,
  serialized: string,
): unknown | null => {
  try {
    pruneTemplateStudioPreviewStorage(storage, key);
    storage.setItem(key, serialized);
    return null;
  } catch (error) {
    storage.removeItem(key);
    return error;
  }
};

export const writeTemplateStudioPreviewStorage = (
  key: string,
  payload: TemplateStudioPreviewStoragePayload,
): void => {
  if (typeof window === "undefined") return;

  const serialized = JSON.stringify(payload);
  const sessionError = tryWritePreviewStorage(
    window.sessionStorage,
    key,
    serialized,
  );
  const localError = tryWritePreviewStorage(
    window.localStorage,
    key,
    serialized,
  );

  if (sessionError && localError) {
    throw sessionError instanceof Error
      ? sessionError
      : new Error("Template Studio 미리보기 데이터를 저장하지 못했습니다.");
  }
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
