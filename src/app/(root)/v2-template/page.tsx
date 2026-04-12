'use client';

import { TemplateRenderConfigProvider } from '@/contexts/v2/template-render-config-context';
import type {
  V2TemplateRenderConfig,
} from '@/types/time-table/template-render-config';
import {
  v2_createDefaultTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from '@/utils/time-table/template-render-config';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { V2TemplateFontFaceStyle, V2TimeTableEditor } from './_components';
import { v2_createFigmaTimeTableNode1075_5624RenderConfigResponse } from './_data/figma-time-table-node-1075-5624-response';
import './_styles/index.css';

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const v2_RENDER_CONFIG_STORAGE_PREFIX = 'v2-template-render-config';
const v2_INDEXED_DB_NAME = 'v2-template-render-config-db';
const v2_INDEXED_DB_STORE_NAME = 'snapshots';
const v2_INDEXED_DB_VERSION = 1;

const v2_isQuotaExceededError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
};

const v2_STORAGE_DEBUG_ENABLED = process.env.NODE_ENV !== 'production';

const v2_logStorageDebug = (
  message: string,
  payload?: Record<string, unknown>
): void => {
  if (!v2_STORAGE_DEBUG_ENABLED) return;
  if (payload) {
    console.info(`[v2-template][storage] ${message}`, payload);
    return;
  }
  console.info(`[v2-template][storage] ${message}`);
};

const v2_isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

type V2IndexedDbPointer = {
  __v2Storage: 'indexeddb';
  updatedAt: number;
};

const v2_createIndexedDbPointer = (): V2IndexedDbPointer => ({
  __v2Storage: 'indexeddb',
  updatedAt: Date.now(),
});

const v2_isIndexedDbPointer = (value: unknown): value is V2IndexedDbPointer => {
  return (
    v2_isRecord(value) &&
    value.__v2Storage === 'indexeddb' &&
    typeof value.updatedAt === 'number'
  );
};

const v2_openIndexedDb = (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not available'));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(v2_INDEXED_DB_NAME, v2_INDEXED_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(v2_INDEXED_DB_STORE_NAME)) {
        db.createObjectStore(v2_INDEXED_DB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
};

const v2_readIndexedDbSnapshot = async (
  storageKey: string
): Promise<string | null> => {
  try {
    const db = await v2_openIndexedDb();
    return await new Promise<string | null>((resolve, reject) => {
      const transaction = db.transaction(v2_INDEXED_DB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(v2_INDEXED_DB_STORE_NAME);
      const request = store.get(storageKey);

      request.onsuccess = () => {
        const result = request.result;
        resolve(typeof result === 'string' ? result : null);
      };
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to read IndexedDB snapshot'));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
      transaction.onabort = () => db.close();
    });
  } catch {
    return null;
  }
};

const v2_writeIndexedDbSnapshot = async (
  storageKey: string,
  serialized: string
): Promise<boolean> => {
  try {
    const db = await v2_openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(v2_INDEXED_DB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(v2_INDEXED_DB_STORE_NAME);
      const request = store.put(serialized, storageKey);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to write IndexedDB snapshot'));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
      transaction.onabort = () => db.close();
    });
    return true;
  } catch {
    return false;
  }
};

const v2_deleteIndexedDbSnapshot = async (storageKey: string): Promise<void> => {
  try {
    const db = await v2_openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(v2_INDEXED_DB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(v2_INDEXED_DB_STORE_NAME);
      const request = store.delete(storageKey);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to delete IndexedDB snapshot'));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
      transaction.onabort = () => db.close();
    });
  } catch {
    // Ignore delete failures; this is best-effort cleanup.
  }
};

const v2_compactTemplateRenderConfigStorage = (
  storageKey: string
): string[] => {
  const removableKeys: string[] = [];
  const targetPrefix = `${v2_RENDER_CONFIG_STORAGE_PREFIX}:`;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    if (key === storageKey) continue;
    if (!key.startsWith(targetPrefix)) continue;
    removableKeys.push(key);
  }

  removableKeys.forEach((key) => {
    window.localStorage.removeItem(key);
  });

  return removableKeys;
};

const v2_createStorageSafeRenderConfig = (
  current: V2TemplateRenderConfig,
  fallback: V2TemplateRenderConfig
): V2TemplateRenderConfig => {
  return {
    ...current,
    // 이미지 에셋은 localStorage에서 제외한다.
    assets: fallback.assets,
    assetDimensions: fallback.assetDimensions,
  };
};

const TimeTableTemplatePage = () => {
  const searchParams = useSearchParams();
  const rawTemplateId = searchParams.get('templateId');

  const templateId = useMemo(() => {
    if (!rawTemplateId) return undefined;
    return v2_TEMPLATE_ID_REGEX.test(rawTemplateId) ? rawTemplateId : undefined;
  }, [rawTemplateId]);

  const exampleData = useMemo(
    () => v2_createFigmaTimeTableNode1075_5624RenderConfigResponse(),
    []
  );

  const fallbackConfig = useMemo(() => v2_createDefaultTemplateRenderConfig(), []);
  const defaultRenderConfig = useMemo<V2TemplateRenderConfig>(
    () => exampleData.renderConfig ?? fallbackConfig,
    [exampleData.renderConfig, fallbackConfig]
  );
  const storageKey = useMemo(
    () => `${v2_RENDER_CONFIG_STORAGE_PREFIX}:${templateId ?? exampleData.templateId}`,
    [exampleData.templateId, templateId]
  );
  const [renderConfig, setRenderConfig] =
    useState<V2TemplateRenderConfig>(defaultRenderConfig);
  const [isLoading, setIsLoading] = useState(true);
  const preferIndexedDbRef = useRef(false);
  const storageSafeRenderConfig = useMemo(
    () => v2_createStorageSafeRenderConfig(renderConfig, defaultRenderConfig),
    [defaultRenderConfig, renderConfig]
  );

  useEffect(() => {
    v2_logStorageDebug('resolved storage key', {
      storageKey,
      rawTemplateId,
      resolvedTemplateId: templateId ?? exampleData.templateId,
    });
  }, [exampleData.templateId, rawTemplateId, storageKey, templateId]);

  useEffect(() => {
    let isDisposed = false;
    setIsLoading(true);
    v2_logStorageDebug('restore start', {
      storageKey,
    });

    const restore = async () => {
      const applyFallback = () => {
        if (isDisposed) return;
        setRenderConfig(defaultRenderConfig);
      };
      const applyParsedConfig = ({
        parsed,
        source,
        serializedLength,
      }: {
        parsed: unknown;
        source: 'localStorage' | 'indexedDB';
        serializedLength: number;
      }) => {
        if (isDisposed) return;
        v2_logStorageDebug('restore hit', {
          storageKey,
          source,
          serializedLength,
        });
        setRenderConfig(v2_normalizeTemplateRenderConfig(parsed));
      };

      try {
        const rawStored = window.localStorage.getItem(storageKey);
        if (rawStored) {
          try {
            const parsed = JSON.parse(rawStored);
            if (v2_isIndexedDbPointer(parsed)) {
              preferIndexedDbRef.current = true;
              v2_logStorageDebug('restore pointer found in localStorage', {
                storageKey,
                updatedAt: parsed.updatedAt,
              });
            } else {
              preferIndexedDbRef.current = false;
              applyParsedConfig({
                parsed,
                source: 'localStorage',
                serializedLength: rawStored.length,
              });
              return;
            }
          } catch (error) {
            v2_logStorageDebug('localStorage payload parse failed', {
              storageKey,
              error:
                error instanceof Error
                  ? `${error.name}: ${error.message}`
                  : String(error),
            });
          }
        } else {
          v2_logStorageDebug('restore localStorage miss', {
            storageKey,
          });
        }

        const rawIndexedDb = await v2_readIndexedDbSnapshot(storageKey);
        if (rawIndexedDb) {
          try {
            const parsedIndexedDb = JSON.parse(rawIndexedDb);
            preferIndexedDbRef.current = true;
            applyParsedConfig({
              parsed: parsedIndexedDb,
              source: 'indexedDB',
              serializedLength: rawIndexedDb.length,
            });
            return;
          } catch (error) {
            v2_logStorageDebug('indexedDB payload parse failed', {
              storageKey,
              error:
                error instanceof Error
                  ? `${error.name}: ${error.message}`
                  : String(error),
            });
          }
        } else {
          v2_logStorageDebug('restore indexedDB miss', {
            storageKey,
          });
        }

        v2_logStorageDebug('restore fallback default render config', {
          storageKey,
        });
        applyFallback();
      } catch (error) {
        console.error('Failed to restore render config from storage', error);
        v2_logStorageDebug('restore failed -> fallback default render config', {
          storageKey,
          error:
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error),
        });
        applyFallback();
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    };

    void restore();

    return () => {
      isDisposed = true;
    };
  }, [defaultRenderConfig, storageKey]);

  useEffect(() => {
    if (isLoading) {
      v2_logStorageDebug('persist skipped while loading', {
        storageKey,
      });
      return;
    }
    const serialized = JSON.stringify(storageSafeRenderConfig);
    const persistPointerToLocalStorage = () => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(v2_createIndexedDbPointer())
        );
        v2_logStorageDebug(
          'persist updated localStorage pointer to indexedDB payload',
          { storageKey }
        );
      } catch (pointerError) {
        v2_logStorageDebug('persist pointer update failed', {
          storageKey,
          error:
            pointerError instanceof Error
              ? `${pointerError.name}: ${pointerError.message}`
              : String(pointerError),
        });
      }
    };

    if (preferIndexedDbRef.current) {
      void (async () => {
        const indexedSaved = await v2_writeIndexedDbSnapshot(storageKey, serialized);
        if (!indexedSaved) {
          v2_logStorageDebug('persist indexedDB preferred-mode failed', {
            storageKey,
            serializedLength: serialized.length,
          });
          return;
        }
        v2_logStorageDebug('persist success via indexedDB preferred-mode', {
          storageKey,
          serializedLength: serialized.length,
        });
        persistPointerToLocalStorage();
      })();
      return;
    }

    try {
      window.localStorage.setItem(storageKey, serialized);
      const persisted = window.localStorage.getItem(storageKey);
      preferIndexedDbRef.current = false;
      v2_logStorageDebug('persist success', {
        storageKey,
        serializedLength: serialized.length,
        persistedLength: persisted?.length ?? 0,
        sameAsSnapshot: persisted === serialized,
      });
      void v2_deleteIndexedDbSnapshot(storageKey);
    } catch (error) {
      if (v2_isQuotaExceededError(error)) {
        v2_logStorageDebug('persist blocked by quota (first attempt)', {
          storageKey,
          serializedLength: serialized.length,
        });

        try {
          const removedKeys = v2_compactTemplateRenderConfigStorage(storageKey);
          if (removedKeys.length > 0) {
            v2_logStorageDebug('storage compaction removed stale keys', {
              storageKey,
              removedKeys,
            });
          }
          window.localStorage.setItem(storageKey, serialized);
          const persisted = window.localStorage.getItem(storageKey);
          preferIndexedDbRef.current = false;
          v2_logStorageDebug('persist success after compaction', {
            storageKey,
            serializedLength: serialized.length,
            persistedLength: persisted?.length ?? 0,
            sameAsSnapshot: persisted === serialized,
          });
          void v2_deleteIndexedDbSnapshot(storageKey);
          return;
        } catch (retryError) {
          if (!v2_isQuotaExceededError(retryError)) {
            console.error(
              'Failed to persist render config to localStorage after compaction',
              retryError
            );
            v2_logStorageDebug('persist failed after compaction', {
              storageKey,
              serializedLength: serialized.length,
              error:
                retryError instanceof Error
                  ? `${retryError.name}: ${retryError.message}`
                  : String(retryError),
            });
            return;
          }

          v2_logStorageDebug(
            'persist still blocked by quota after compaction -> indexedDB fallback',
            {
              storageKey,
              serializedLength: serialized.length,
            }
          );

          void (async () => {
            const indexedSaved = await v2_writeIndexedDbSnapshot(
              storageKey,
              serialized
            );
            if (!indexedSaved) {
              v2_logStorageDebug('persist indexedDB fallback failed', {
                storageKey,
                serializedLength: serialized.length,
              });
              return;
            }

            preferIndexedDbRef.current = true;
            v2_logStorageDebug('persist success via indexedDB fallback', {
              storageKey,
              serializedLength: serialized.length,
            });

            persistPointerToLocalStorage();
          })();
        }
        return;
      }
      console.error('Failed to persist render config to localStorage', error);
      v2_logStorageDebug('persist failed', {
        storageKey,
        serializedLength: serialized.length,
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error),
      });
    }
  }, [isLoading, storageKey, storageSafeRenderConfig]);

  const providerValue = useMemo(
    () => ({
      templateId: templateId ?? null,
      source: 'default' as const,
      isLoading,
      renderConfig,
      setRenderConfig,
    }),
    [isLoading, renderConfig, templateId]
  );

  return (
    <TemplateRenderConfigProvider value={providerValue}>
      <V2TemplateFontFaceStyle />
      <div className="fixed inset-0 w-full h-full">
        <V2TimeTableEditor />
      </div>
    </TemplateRenderConfigProvider>
  );
};

export default TimeTableTemplatePage;
