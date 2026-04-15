'use client';

import { TemplateRenderConfigProvider } from '@/contexts/v2/template-render-config-context';
import { V2TemplateFontFaceStyle, V2TimeTableEditor } from '@/app/(root)/v2-template/_components';
import type { V2TemplateRenderConfig } from '@/types/time-table/template-render-config';
import {
  v2_createEmptyTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from '@/utils/v2/template-render-config';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const v2_DRAFT_AUTOSAVE_DEBOUNCE_MS = 2500;
const v2_DRAFT_AUTOSAVE_RETRY_DELAY_MS = 1200;

type V2DbSyncStatus = 'idle' | 'checking' | 'ready' | 'error';

type V2HttpError = Error & { status?: number };

type V2DraftAutosavePayload = {
  templateId: string;
  renderConfig: V2TemplateRenderConfig;
  serialized: string;
  baseRevisionNo: number | null;
};

type TemplateEditorClientProps = {
  forcedTemplateId?: string;
  allowQueryTemplateId?: boolean;
};

type V2AdminRenderConfigResponse = {
  success: boolean;
  templateId: string;
  source: 'db' | 'empty';
  configVersion: number;
  renderConfig: V2TemplateRenderConfig;
  createdAt: string | null;
  updatedAt: string | null;
  latestRevisionNo?: number | null;
};

type V2AdminRenderConfigDraftResponse = {
  success: boolean;
  templateId: string;
  hasDraft: boolean;
  draft: {
    id: string;
    configVersion: number;
    renderConfig: V2TemplateRenderConfig;
    baseRevisionNo: number | null;
    isAutosave: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type V2AdminRenderConfigPublishResponse = {
  success: boolean;
  templateId: string;
  revisionNo: number;
  latestRevisionNo: number;
  configVersion: number;
  renderConfig: V2TemplateRenderConfig;
  createdAt: string;
  updatedAt: string;
};

const v2_isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const v2_extractApiErrorMessage = (result: unknown): string | null => {
  if (!v2_isRecord(result)) return null;
  return typeof result.error === 'string' ? result.error : null;
};

const v2_createHttpError = ({
  message,
  status,
}: {
  message: string;
  status: number;
}): V2HttpError => {
  const error = new Error(message) as V2HttpError;
  error.status = status;
  return error;
};

const v2_resolveValidTemplateId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return v2_TEMPLATE_ID_REGEX.test(value) ? value : undefined;
};

const v2_toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
};

const v2_fetchAdminRenderConfig = async (
  templateId: string
): Promise<V2AdminRenderConfigResponse> => {
  const response = await fetch(`/api/admin/v2/templates/${templateId}/render-config`, {
    method: 'GET',
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => null)) as
    | V2AdminRenderConfigResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw v2_createHttpError({
      message:
        v2_extractApiErrorMessage(result) || 'DB render-config 조회에 실패했습니다.',
      status: response.status,
    });
  }

  return result as V2AdminRenderConfigResponse;
};

const v2_fetchAdminRenderConfigDraft = async (
  templateId: string
): Promise<V2AdminRenderConfigDraftResponse> => {
  const response = await fetch(`/api/admin/v2/templates/${templateId}/render-config/draft`, {
    method: 'GET',
    cache: 'no-store',
  });
  const result = (await response.json().catch(() => null)) as
    | V2AdminRenderConfigDraftResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw v2_createHttpError({
      message: v2_extractApiErrorMessage(result) || 'DB draft 조회에 실패했습니다.',
      status: response.status,
    });
  }

  return result as V2AdminRenderConfigDraftResponse;
};

const v2_saveAdminRenderConfigDraft = async ({
  templateId,
  renderConfig,
  baseRevisionNo,
  isAutosave,
  signal,
}: {
  templateId: string;
  renderConfig: V2TemplateRenderConfig;
  baseRevisionNo?: number | null;
  isAutosave: boolean;
  signal?: AbortSignal;
}): Promise<V2AdminRenderConfigDraftResponse> => {
  const response = await fetch(`/api/admin/v2/templates/${templateId}/render-config/draft`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      configVersion: renderConfig.version,
      renderConfig,
      baseRevisionNo: baseRevisionNo ?? null,
      isAutosave,
    }),
  });
  const result = (await response.json().catch(() => null)) as
    | V2AdminRenderConfigDraftResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw v2_createHttpError({
      message: v2_extractApiErrorMessage(result) || 'DB draft 저장에 실패했습니다.',
      status: response.status,
    });
  }

  return result as V2AdminRenderConfigDraftResponse;
};

const v2_publishAdminRenderConfig = async ({
  templateId,
  renderConfig,
}: {
  templateId: string;
  renderConfig: V2TemplateRenderConfig;
}): Promise<V2AdminRenderConfigPublishResponse> => {
  const response = await fetch(`/api/admin/v2/templates/${templateId}/render-config/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      configVersion: renderConfig.version,
      renderConfig,
    }),
  });
  const result = (await response.json().catch(() => null)) as
    | V2AdminRenderConfigPublishResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw v2_createHttpError({
      message: v2_extractApiErrorMessage(result) || 'DB publish에 실패했습니다.',
      status: response.status,
    });
  }

  return result as V2AdminRenderConfigPublishResponse;
};

const TemplateEditorClient = ({
  forcedTemplateId,
  allowQueryTemplateId = false,
}: TemplateEditorClientProps) => {
  const searchParams = useSearchParams();
  const queryTemplateId = allowQueryTemplateId
    ? searchParams.get('templateId')
    : undefined;

  const templateId = useMemo(() => {
    return (
      v2_resolveValidTemplateId(forcedTemplateId) ??
      v2_resolveValidTemplateId(queryTemplateId)
    );
  }, [forcedTemplateId, queryTemplateId]);
  const defaultRenderConfig = useMemo<V2TemplateRenderConfig>(
    () => v2_createEmptyTemplateRenderConfig(),
    []
  );

  const [renderConfig, setRenderConfig] =
    useState<V2TemplateRenderConfig>(defaultRenderConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [dbSyncStatus, setDbSyncStatus] = useState<V2DbSyncStatus>('idle');
  const [dbSyncMessage, setDbSyncMessage] = useState<string>('초기화 중');
  const [dbSource, setDbSource] = useState<'db' | 'empty'>('empty');
  const [latestRevisionNo, setLatestRevisionNo] = useState<number | null>(null);
  const [lastDraftSavedSerialized, setLastDraftSavedSerialized] =
    useState<string | null>(null);
  const [isDraftAutosaving, setIsDraftAutosaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const baseRevisionNoRef = useRef<number | null>(null);
  const isDbHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const autosaveInFlightRef = useRef<Promise<void> | null>(null);
  const autosaveAbortControllerRef = useRef<AbortController | null>(null);
  const pendingAutosavePayloadRef = useRef<V2DraftAutosavePayload | null>(null);

  const renderConfigSerialized = useMemo(
    () => JSON.stringify(renderConfig),
    [renderConfig]
  );
  const hasUnpublishedChanges = useMemo(
    () =>
      dbSyncStatus === 'ready' &&
      lastDraftSavedSerialized !== null &&
      lastDraftSavedSerialized !== renderConfigSerialized,
    [dbSyncStatus, lastDraftSavedSerialized, renderConfigSerialized]
  );

  const flushPendingAutosave = useCallback(async (): Promise<void> => {
    if (autosaveInFlightRef.current) {
      await autosaveInFlightRef.current;
      return;
    }

    const payload = pendingAutosavePayloadRef.current;
    if (!payload) {
      return;
    }

    pendingAutosavePayloadRef.current = null;
    const abortController = new AbortController();
    autosaveAbortControllerRef.current = abortController;
    setIsDraftAutosaving(true);

    const runSave = async () => {
      try {
        const response = await v2_saveAdminRenderConfigDraft({
          templateId: payload.templateId,
          renderConfig: payload.renderConfig,
          baseRevisionNo: payload.baseRevisionNo,
          isAutosave: true,
          signal: abortController.signal,
        });

        if (!response.hasDraft || !response.draft) {
          throw new Error('DB draft 응답이 비어 있습니다.');
        }

        baseRevisionNoRef.current =
          response.draft.baseRevisionNo ?? baseRevisionNoRef.current;
        setLastDraftSavedSerialized(payload.serialized);
        setDbSyncMessage('DB draft 자동 저장 완료');
      } catch (error) {
        if (abortController.signal.aborted) return;

        const status =
          typeof (error as { status?: unknown })?.status === 'number'
            ? (error as { status: number }).status
            : null;

        if (status === 409 || status === 429) {
          if (
            pendingAutosavePayloadRef.current === null ||
            pendingAutosavePayloadRef.current.serialized === payload.serialized
          ) {
            pendingAutosavePayloadRef.current = payload;
          }

          setDbSyncMessage('DB 저장 대기 중입니다. 자동으로 재시도합니다.');

          if (autosaveRetryTimerRef.current) {
            clearTimeout(autosaveRetryTimerRef.current);
          }

          autosaveRetryTimerRef.current = setTimeout(() => {
            autosaveRetryTimerRef.current = null;
            void flushPendingAutosave();
          }, v2_DRAFT_AUTOSAVE_RETRY_DELAY_MS);

          return;
        }

        setDbSyncMessage(v2_toErrorMessage(error, 'DB draft 자동 저장에 실패했습니다.'));
      } finally {
        if (autosaveAbortControllerRef.current === abortController) {
          autosaveAbortControllerRef.current = null;
        }
        autosaveInFlightRef.current = null;
        setIsDraftAutosaving(false);
      }

      if (pendingAutosavePayloadRef.current && !autosaveRetryTimerRef.current) {
        void flushPendingAutosave();
      }
    };

    const savePromise = runSave();
    autosaveInFlightRef.current = savePromise;
    await savePromise;
  }, []);

  const flushAutosaveBeforePublish = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (autosaveRetryTimerRef.current) {
      clearTimeout(autosaveRetryTimerRef.current);
      autosaveRetryTimerRef.current = null;
    }

    if (pendingAutosavePayloadRef.current) {
      await flushPendingAutosave();
    }

    if (autosaveInFlightRef.current) {
      await autosaveInFlightRef.current;
    }
  }, [flushPendingAutosave]);

  useEffect(() => {
    let isDisposed = false;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (autosaveRetryTimerRef.current) {
      clearTimeout(autosaveRetryTimerRef.current);
      autosaveRetryTimerRef.current = null;
    }
    if (autosaveAbortControllerRef.current) {
      autosaveAbortControllerRef.current.abort();
      autosaveAbortControllerRef.current = null;
    }
    autosaveInFlightRef.current = null;
    pendingAutosavePayloadRef.current = null;

    if (!templateId) {
      setIsLoading(false);
      setDbSyncStatus('error');
      setDbSyncMessage('유효한 templateId가 필요합니다.');
      setDbSource('empty');
      setLatestRevisionNo(null);
      setLastDraftSavedSerialized(null);
      setPublishError(null);
      baseRevisionNoRef.current = null;
      isDbHydratedRef.current = false;
      return;
    }

    setIsLoading(true);
    setDbSyncStatus('checking');
    setDbSyncMessage('DB 설정을 불러오는 중');
    setPublishError(null);
    isDbHydratedRef.current = false;

    const syncWithDb = async () => {
      try {
        const [renderConfigResponse, draftResponse] = await Promise.all([
          v2_fetchAdminRenderConfig(templateId),
          v2_fetchAdminRenderConfigDraft(templateId),
        ]);

        if (isDisposed) return;

        const draft = draftResponse.hasDraft ? draftResponse.draft : null;
        const resolvedConfig = v2_normalizeTemplateRenderConfig(
          draft?.renderConfig ?? renderConfigResponse.renderConfig
        );
        const resolvedSerialized = JSON.stringify(resolvedConfig);
        const resolvedLatestRevisionNo = renderConfigResponse.latestRevisionNo ?? null;

        baseRevisionNoRef.current =
          draft?.baseRevisionNo ?? resolvedLatestRevisionNo ?? null;
        setRenderConfig(resolvedConfig);
        setLastDraftSavedSerialized(resolvedSerialized);
        setLatestRevisionNo(resolvedLatestRevisionNo);
        setDbSource(renderConfigResponse.source);
        setDbSyncStatus('ready');
        setDbSyncMessage(
          draft
            ? 'DB draft를 불러왔습니다.'
            : renderConfigResponse.source === 'db'
              ? 'DB 렌더링 설정을 불러왔습니다.'
              : '빈 렌더링 설정으로 시작합니다.'
        );
        isDbHydratedRef.current = true;
      } catch (error) {
        if (isDisposed) return;

        const status =
          typeof (error as { status?: unknown })?.status === 'number'
            ? ((error as { status: number }).status ?? null)
            : null;

        const defaultMessage =
          status === 404
            ? '템플릿 또는 render-config를 찾을 수 없습니다.'
            : 'DB 설정 동기화 중 오류가 발생했습니다.';

        setDbSyncStatus('error');
        setDbSyncMessage(v2_toErrorMessage(error, defaultMessage));
        setDbSource('empty');
        setLatestRevisionNo(null);
        setLastDraftSavedSerialized(null);
        baseRevisionNoRef.current = null;
        isDbHydratedRef.current = false;
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    };

    void syncWithDb();

    return () => {
      isDisposed = true;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      if (autosaveRetryTimerRef.current) {
        clearTimeout(autosaveRetryTimerRef.current);
        autosaveRetryTimerRef.current = null;
      }
      if (autosaveAbortControllerRef.current) {
        autosaveAbortControllerRef.current.abort();
        autosaveAbortControllerRef.current = null;
      }
      autosaveInFlightRef.current = null;
      pendingAutosavePayloadRef.current = null;
    };
  }, [templateId]);

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (dbSyncStatus !== 'ready') {
      pendingAutosavePayloadRef.current = null;
      return;
    }
    if (!templateId) {
      pendingAutosavePayloadRef.current = null;
      return;
    }
    if (isLoading) return;
    if (!isDbHydratedRef.current) return;
    if (
      lastDraftSavedSerialized !== null &&
      lastDraftSavedSerialized === renderConfigSerialized
    ) {
      return;
    }

    pendingAutosavePayloadRef.current = {
      templateId,
      renderConfig,
      serialized: renderConfigSerialized,
      baseRevisionNo: baseRevisionNoRef.current ?? null,
    };

    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void flushPendingAutosave();
    }, v2_DRAFT_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    dbSyncStatus,
    flushPendingAutosave,
    isLoading,
    lastDraftSavedSerialized,
    renderConfig,
    renderConfigSerialized,
    templateId,
  ]);

  const handlePublish = useCallback(async () => {
    if (!templateId) return;
    if (dbSyncStatus !== 'ready') return;
    if (isPublishing) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      await flushAutosaveBeforePublish();
      if (autosaveRetryTimerRef.current) {
        clearTimeout(autosaveRetryTimerRef.current);
        autosaveRetryTimerRef.current = null;
      }
      pendingAutosavePayloadRef.current = null;

      const publishResult = await v2_publishAdminRenderConfig({
        templateId,
        renderConfig,
      });
      const normalized = v2_normalizeTemplateRenderConfig(publishResult.renderConfig);
      const normalizedSerialized = JSON.stringify(normalized);

      setRenderConfig(normalized);
      setLastDraftSavedSerialized(normalizedSerialized);
      setLatestRevisionNo(publishResult.latestRevisionNo);
      baseRevisionNoRef.current = publishResult.latestRevisionNo;
      setDbSource('db');
      setDbSyncStatus('ready');
      setDbSyncMessage(`Revision ${publishResult.revisionNo} 발행 완료`);
    } catch (error) {
      const message = v2_toErrorMessage(error, 'DB publish에 실패했습니다.');
      setPublishError(message);
      setDbSyncMessage(message);
    } finally {
      setIsPublishing(false);
    }
  }, [dbSyncStatus, flushAutosaveBeforePublish, isPublishing, renderConfig, templateId]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      const isSaveShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "s";
      if (!isSaveShortcut) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.repeat) return;

      if (dbSyncStatus !== "ready") {
        setDbSyncMessage("아직 저장할 수 없습니다. DB 동기화 상태를 확인해 주세요.");
        return;
      }
      if (isPublishing || isDraftAutosaving) {
        setDbSyncMessage("이미 저장 중입니다.");
        return;
      }

      void handlePublish();
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => {
      window.removeEventListener("keydown", handleSaveShortcut);
    };
  }, [dbSyncStatus, handlePublish, isDraftAutosaving, isPublishing]);

  const dbSyncBadgeTone = useMemo(() => {
    if (dbSyncStatus === 'error') return 'text-rose-300';
    if (dbSyncStatus === 'checking') return 'text-sky-300';
    return hasUnpublishedChanges ? 'text-amber-200' : 'text-emerald-300';
  }, [dbSyncStatus, hasUnpublishedChanges]);

  const dbSyncBadgeLabel = useMemo(() => {
    if (dbSyncStatus === 'idle') return '초기화 중';
    if (dbSyncStatus === 'checking') return 'DB 동기화 확인 중';
    if (dbSyncStatus === 'error') return 'DB 동기화 오류';
    if (isDraftAutosaving) return 'DB draft 저장 중';
    if (hasUnpublishedChanges) return '발행 전 변경사항 있음';
    if (latestRevisionNo) return `발행됨 (rev ${latestRevisionNo})`;
    return 'DB 동기화 준비 완료';
  }, [dbSyncStatus, hasUnpublishedChanges, isDraftAutosaving, latestRevisionNo]);

  const providerValue = useMemo(
    () => ({
      templateId: templateId ?? null,
      source: dbSource,
      isLoading,
      renderConfig,
      setRenderConfig,
    }),
    [dbSource, isLoading, renderConfig, templateId]
  );

  return (
    <TemplateRenderConfigProvider value={providerValue}>
      <V2TemplateFontFaceStyle />
      <div className="fixed bottom-3 left-3 z-[250] flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/85 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur">
        <span className={dbSyncBadgeTone}>{dbSyncBadgeLabel}</span>
        {dbSyncStatus === 'ready' && templateId ? (
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || isDraftAutosaving}
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPublishing ? '발행 중...' : hasUnpublishedChanges ? '발행' : '재발행'}
          </button>
        ) : null}
      </div>
      {publishError ? (
        <div className="fixed top-14 right-3 z-[250] max-w-xs rounded-md border border-rose-500/70 bg-rose-950/80 px-3 py-2 text-xs text-rose-100 shadow-lg backdrop-blur">
          {publishError}
        </div>
      ) : null}
      {dbSyncMessage ? (
        <div className="fixed bottom-3 right-3 z-[250] max-w-sm rounded-md border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300 shadow-lg backdrop-blur">
          {dbSyncMessage}
        </div>
      ) : null}
      <div className="fixed inset-0 h-full w-full">
        <V2TimeTableEditor />
      </div>
    </TemplateRenderConfigProvider>
  );
};

export default TemplateEditorClient;
