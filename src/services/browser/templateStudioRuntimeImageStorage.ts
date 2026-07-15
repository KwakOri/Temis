/**
 * Browser-only IndexedDB store for Studio runtime images. These images never
 * leave the browser — the server strips image input values from
 * template_studio_user_states entirely (see runtime-image-strip.ts). This
 * module must only be called from client components / client-only effects.
 */
const DB_NAME = "temis-template-runtime";
const DB_VERSION = 1;
const STORE_NAME = "runtime-images";
const INDEX_BY_USER_TEMPLATE = "by-user-template";

export type StudioRuntimeImageScope = "global" | "day" | "entry";

export interface StudioRuntimeImageContext {
  scope: StudioRuntimeImageScope;
  dayId?: string;
  entryId?: string;
}

export interface StudioRuntimeImageRecord {
  key: string;
  userId: string;
  templateId: string;
  inputId: string;
  scope: StudioRuntimeImageScope;
  contextKey: string;
  blob: Blob;
  mimeType: "image/png";
  byteSize: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
}

export interface StudioRuntimeImageLocator {
  userId: string;
  templateId: string;
  inputId: string;
  context: StudioRuntimeImageContext;
}

export class StudioRuntimeImageQuotaError extends Error {
  constructor(message = "Not enough browser storage space to save this image.") {
    super(message);
    this.name = "StudioRuntimeImageQuotaError";
  }
}

export const buildStudioRuntimeImageContextKey = (
  context: StudioRuntimeImageContext,
): string => {
  if (context.scope === "global") return "global";
  if (context.scope === "day") return `day:${context.dayId ?? ""}`;
  return `entry:${context.dayId ?? ""}:${context.entryId ?? ""}`;
};

const buildRecordKey = (locator: StudioRuntimeImageLocator): string =>
  `v1:${locator.userId}:${locator.templateId}:${buildStudioRuntimeImageContextKey(
    locator.context,
  )}:${locator.inputId}`;

const isIndexedDbAvailable = (): boolean =>
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(
      new Error("IndexedDB is not available in this environment."),
    );
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex(INDEX_BY_USER_TEMPLATE, ["userId", "templateId"], {
          unique: false,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB."));
  });

  return dbPromise;
};

export const putStudioRuntimeImage = async (
  locator: StudioRuntimeImageLocator,
  blob: Blob,
): Promise<StudioRuntimeImageRecord> => {
  const db = await openDatabase();
  const now = Date.now();
  const record: StudioRuntimeImageRecord = {
    key: buildRecordKey(locator),
    userId: locator.userId,
    templateId: locator.templateId,
    inputId: locator.inputId,
    scope: locator.context.scope,
    contextKey: buildStudioRuntimeImageContextKey(locator.context),
    blob,
    mimeType: "image/png",
    byteSize: blob.size,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);

    const fail = () => {
      const error = tx.error;
      if (error?.name === "QuotaExceededError") {
        reject(new StudioRuntimeImageQuotaError());
      } else {
        reject(error ?? new Error("Failed to save the image locally."));
      }
    };

    tx.oncomplete = () => resolve(record);
    tx.onerror = fail;
    tx.onabort = fail;
  });
};

export const getStudioRuntimeImage = async (
  locator: StudioRuntimeImageLocator,
): Promise<StudioRuntimeImageRecord | null> => {
  const db = await openDatabase();
  const key = buildRecordKey(locator);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () =>
      resolve((request.result as StudioRuntimeImageRecord | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read the image locally."));
  });
};

export const deleteStudioRuntimeImage = async (
  locator: StudioRuntimeImageLocator,
): Promise<void> => {
  const db = await openDatabase();
  const key = buildRecordKey(locator);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to delete the image locally."));
  });
};

export const deleteStudioRuntimeImagesForTemplate = async (
  userId: string,
  templateId: string,
): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const index = tx.objectStore(STORE_NAME).index(INDEX_BY_USER_TEMPLATE);
    const range = IDBKeyRange.only([userId, templateId]);
    const cursorRequest = index.openCursor(range);

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    cursorRequest.onerror = () =>
      reject(cursorRequest.error ?? new Error("Failed to clear local images."));
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to clear local images."));
  });
};

/**
 * Best-effort headroom check before a write. Not authoritative — the actual
 * put() call is still the source of truth for whether storage succeeded.
 */
export const estimateStudioRuntimeImageStorageHeadroom = async (): Promise<{
  usage: number;
  quota: number;
} | null> => {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { usage, quota };
  } catch {
    return null;
  }
};
