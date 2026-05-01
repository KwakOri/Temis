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
import type { SetStateAction } from 'react';

const v2_TEMPLATE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const v2_DRAFT_AUTOSAVE_DEBOUNCE_MS = 2500;
const v2_DRAFT_AUTOSAVE_RETRY_DELAY_MS = 1200;
const v2_RENDER_CONFIG_HISTORY_LIMIT = 80;
const v2_RENDER_CONFIG_HISTORY_MERGE_MS = 600;

type V2DbSyncStatus = 'idle' | 'checking' | 'ready' | 'error';

type V2HttpError = Error & { status?: number };

type V2DraftAutosavePayload = {
  templateId: string;
  renderConfig: V2TemplateRenderConfig;
  serialized: string;
  baseRevisionNo: number | null;
};

type V2RenderConfigHistory = {
  past: V2TemplateRenderConfig[];
  future: V2TemplateRenderConfig[];
  lastPushedAt: number;
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

type V2AdminFigmaImportIntoEditorResponse = {
  success: boolean;
  import: {
    templateId: string;
    renderConfig: V2TemplateRenderConfig;
    layoutMode: 'grid3x3' | 'flex4x2' | 'free';
    mode: string;
    detectedStatuses: string[];
    detectedFeatures: V2AdminFigmaDetectedFeatures;
    cardComponentSetSource: 'input' | 'auto-detected';
    resolvedCardComponentSetUrl: string;
    warnings: string[];
    critical: string[];
    assetImportSummary: {
      discovered: number;
      mapped: number;
      uploaded: number;
      applied: number;
      warnings: string[];
      unresolved: string[];
    } | null;
  };
};

type V2AdminFigmaDetectedStatus = 'online' | 'offline' | 'multi' | 'offlineMemo';

type V2AdminFigmaDetectedFeatures = {
  artist: {
    enabled: boolean;
    on: boolean;
    off: boolean;
    object: boolean;
    text: boolean;
    profile: boolean;
  };
  memo: {
    enabled: boolean;
    on: boolean;
    off: boolean;
    object: boolean;
    text: boolean;
  };
};

type V2AdminFigmaAnalyzeResponse = {
  success: boolean;
  analysis: {
    mode: string;
    canImport: boolean;
    detectedStatuses: V2AdminFigmaDetectedStatus[];
    statusCounts: Record<V2AdminFigmaDetectedStatus, number>;
    statusSourceModeByStatus: Record<
      V2AdminFigmaDetectedStatus,
      'none' | 'shared' | 'byDay'
    >;
    warnings: string[];
    critical: string[];
    templateNameSuggestion: string;
    layoutModeCandidate: 'grid3x3' | 'flex4x2' | 'free';
    detectedFeatures: V2AdminFigmaDetectedFeatures;
    cardComponentSetSource: 'input' | 'auto-detected';
    resolvedCardComponentSetUrl: string;
  };
};

type V2FigmaImportSettingChange = {
  key: 'multi' | 'offlineMemo' | 'artist' | 'memo';
  action: 'enable' | 'disable';
  label: string;
  title: string;
  description: string;
};

type V2PendingFigmaImportConfirmation = {
  rootFigmaUrl: string;
  withAssets: boolean;
  changes: V2FigmaImportSettingChange[];
  detectedStatuses: V2AdminFigmaDetectedStatus[];
  warnings: string[];
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

const v2_isTemplateEditorTextEditingTarget = (
  target: EventTarget | null
): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, select, button, [contenteditable='true']")
  );
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

const v2_importAdminFigmaIntoEditor = async ({
  templateId,
  rootFigmaUrl,
  withAssets,
}: {
  templateId: string;
  rootFigmaUrl: string;
  withAssets: boolean;
}): Promise<V2AdminFigmaImportIntoEditorResponse> => {
  const response = await fetch(`/api/admin/v2/templates/${templateId}/figma/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rootFigmaUrl,
      layoutModeOverride: 'auto',
      assetImportMode: withAssets ? 'with-assets' : 'without-assets',
    }),
  });
  const result = (await response.json().catch(() => null)) as
    | V2AdminFigmaImportIntoEditorResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw v2_createHttpError({
      message: v2_extractApiErrorMessage(result) || 'Figma import에 실패했습니다.',
      status: response.status,
    });
  }

  return result as V2AdminFigmaImportIntoEditorResponse;
};

const v2_analyzeAdminFigmaForEditor = async ({
  rootFigmaUrl,
}: {
  rootFigmaUrl: string;
}): Promise<V2AdminFigmaAnalyzeResponse> => {
  const response = await fetch('/api/admin/v2/templates/figma/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rootFigmaUrl,
    }),
  });
  const result = (await response.json().catch(() => null)) as
    | V2AdminFigmaAnalyzeResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    throw v2_createHttpError({
      message: v2_extractApiErrorMessage(result) || 'Figma 분석에 실패했습니다.',
      status: response.status,
    });
  }

  return result as V2AdminFigmaAnalyzeResponse;
};

const v2_buildFigmaImportSettingChanges = ({
  renderConfig,
  detectedStatuses,
  detectedFeatures,
}: {
  renderConfig: V2TemplateRenderConfig;
  detectedStatuses: readonly V2AdminFigmaDetectedStatus[];
  detectedFeatures: V2AdminFigmaDetectedFeatures;
}): V2FigmaImportSettingChange[] => {
  const statusSet = new Set(detectedStatuses);
  const currentStatusOptions = renderConfig.timetable.statusOptions;
  const changes: V2FigmaImportSettingChange[] = [];
  const graphNodes = renderConfig.graph.nodes ?? {};
  const formFields = renderConfig.formSchema.fields ?? [];
  const currentArtistEnabled =
    Boolean(renderConfig.editorOptions.isArtist) &&
    Boolean(
      graphNodes['scene-artist-group'] ||
        graphNodes['scene-artist-text'] ||
        graphNodes['scene-artist-object'] ||
        formFields.some((field) => field.scope === 'global' && field.key === 'artistText')
    );
  const currentMemoEnabled =
    Boolean(renderConfig.editorOptions.isMemo) &&
    Boolean(
      graphNodes['scene-memo'] ||
        graphNodes['scene-memo-object'] ||
        graphNodes['scene-memo-text'] ||
        formFields.some((field) => field.scope === 'global' && field.key === 'memoText')
    );

  const statusOptionDefinitions = [
    {
      key: 'multi',
      label: '다회차',
      detectedDescription: 'Figma에서 다회차 카드 상태가 감지되었습니다.',
      missingDescription: '현재 템플릿은 다회차를 사용하지만 Figma에서는 감지되지 않았습니다.',
    },
    {
      key: 'offlineMemo',
      label: '오프라인 메모',
      detectedDescription: 'Figma에서 오프라인 메모 카드 상태가 감지되었습니다.',
      missingDescription:
        '현재 템플릿은 오프라인 메모를 사용하지만 Figma에서는 감지되지 않았습니다.',
    },
  ] satisfies Array<{
    key: 'multi' | 'offlineMemo';
    label: string;
    detectedDescription: string;
    missingDescription: string;
  }>;

  statusOptionDefinitions.forEach((option) => {
    const isDetected = statusSet.has(option.key);
    const isEnabled = Boolean(currentStatusOptions[option.key]);
    if (isDetected && !isEnabled) {
      changes.push({
        key: option.key,
        action: 'enable',
        label: option.label,
        title: `${option.label} 사용`,
        description: option.detectedDescription,
      });
      return;
    }
    if (!isDetected && isEnabled) {
      changes.push({
        key: option.key,
        action: 'disable',
        label: option.label,
        title: `${option.label} 미사용`,
        description: option.missingDescription,
      });
    }
  });

  const featureDefinitions = [
    {
      key: 'artist',
      label: '아티스트',
      isDetected: detectedFeatures.artist.enabled,
      isEnabled: currentArtistEnabled,
      detectedDescription: 'Figma에서 아티스트 on 상태 오브젝트가 감지되었습니다.',
      missingDescription:
        '현재 템플릿은 아티스트를 사용하지만 Figma에서는 아티스트 on 상태가 감지되지 않았습니다.',
    },
    {
      key: 'memo',
      label: '메모',
      isDetected: detectedFeatures.memo.enabled,
      isEnabled: currentMemoEnabled,
      detectedDescription: 'Figma에서 메모 on 상태 오브젝트가 감지되었습니다.',
      missingDescription:
        '현재 템플릿은 메모를 사용하지만 Figma에서는 메모 on 상태가 감지되지 않았습니다.',
    },
  ] satisfies Array<{
    key: 'artist' | 'memo';
    label: string;
    isDetected: boolean;
    isEnabled: boolean;
    detectedDescription: string;
    missingDescription: string;
  }>;

  featureDefinitions.forEach((option) => {
    if (option.isDetected && !option.isEnabled) {
      changes.push({
        key: option.key,
        action: 'enable',
        label: option.label,
        title: `${option.label} 사용`,
        description: option.detectedDescription,
      });
      return;
    }
    if (!option.isDetected && option.isEnabled) {
      changes.push({
        key: option.key,
        action: 'disable',
        label: option.label,
        title: `${option.label} 미사용`,
        description: option.missingDescription,
      });
    }
  });

  return changes;
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

  const [renderConfig, setRenderConfigState] =
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
  const [figmaImportUrl, setFigmaImportUrl] = useState('');
  const [figmaImportWithAssets, setFigmaImportWithAssets] = useState(true);
  const [isFigmaImporting, setIsFigmaImporting] = useState(false);
  const [figmaImportMessage, setFigmaImportMessage] = useState<string | null>(null);
  const [pendingFigmaImportConfirmation, setPendingFigmaImportConfirmation] =
    useState<V2PendingFigmaImportConfirmation | null>(null);

  const baseRevisionNoRef = useRef<number | null>(null);
  const isDbHydratedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const autosaveInFlightRef = useRef<Promise<void> | null>(null);
  const autosaveAbortControllerRef = useRef<AbortController | null>(null);
  const pendingAutosavePayloadRef = useRef<V2DraftAutosavePayload | null>(null);
  const renderConfigHistoryRef = useRef<V2RenderConfigHistory>({
    past: [],
    future: [],
    lastPushedAt: 0,
  });

  const resetRenderConfigHistory = useCallback(() => {
    renderConfigHistoryRef.current = {
      past: [],
      future: [],
      lastPushedAt: 0,
    };
  }, []);

  const setRenderConfig = useCallback(
    (updater: SetStateAction<V2TemplateRenderConfig>) => {
      setRenderConfigState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig)(
                prev
              )
            : updater;
        if (next === prev) return prev;

        const prevSerialized = JSON.stringify(prev);
        const nextSerialized = JSON.stringify(next);
        if (prevSerialized === nextSerialized) return prev;

        const now = Date.now();
        const history = renderConfigHistoryRef.current;
        const shouldMerge =
          history.past.length > 0 &&
          now - history.lastPushedAt < v2_RENDER_CONFIG_HISTORY_MERGE_MS;

        renderConfigHistoryRef.current = shouldMerge
          ? {
              ...history,
              future: [],
              lastPushedAt: now,
            }
          : {
              past: [...history.past, prev].slice(-v2_RENDER_CONFIG_HISTORY_LIMIT),
              future: [],
              lastPushedAt: now,
            };

        return next;
      });
    },
    []
  );

  const undoRenderConfig = useCallback(() => {
    const history = renderConfigHistoryRef.current;
    const previous = history.past[history.past.length - 1];
    if (!previous) return;

    setRenderConfigState((current) => {
      renderConfigHistoryRef.current = {
        past: history.past.slice(0, -1),
        future: [current, ...history.future].slice(
          0,
          v2_RENDER_CONFIG_HISTORY_LIMIT
        ),
        lastPushedAt: 0,
      };
      return previous;
    });
    setDbSyncMessage('실행 취소했습니다.');
  }, []);

  const redoRenderConfig = useCallback(() => {
    const history = renderConfigHistoryRef.current;
    const next = history.future[0];
    if (!next) return;

    setRenderConfigState((current) => {
      renderConfigHistoryRef.current = {
        past: [...history.past, current].slice(-v2_RENDER_CONFIG_HISTORY_LIMIT),
        future: history.future.slice(1),
        lastPushedAt: 0,
      };
      return next;
    });
    setDbSyncMessage('다시 실행했습니다.');
  }, []);

  const cancelPendingAutosave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (autosaveRetryTimerRef.current) {
      clearTimeout(autosaveRetryTimerRef.current);
      autosaveRetryTimerRef.current = null;
    }
    pendingAutosavePayloadRef.current = null;

    if (autosaveAbortControllerRef.current) {
      autosaveAbortControllerRef.current.abort();
    }
    if (autosaveInFlightRef.current) {
      await autosaveInFlightRef.current.catch(() => undefined);
    }
  }, []);

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
      resetRenderConfigHistory();
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
        setRenderConfigState(resolvedConfig);
        resetRenderConfigHistory();
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
  }, [resetRenderConfigHistory, templateId]);

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

      setRenderConfigState(normalized);
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

  const executeFigmaImport = useCallback(async ({
    rootFigmaUrl,
    withAssets,
    confirmedChanges = [],
    keepImportingState = false,
  }: {
    rootFigmaUrl: string;
    withAssets: boolean;
    confirmedChanges?: V2FigmaImportSettingChange[];
    keepImportingState?: boolean;
  }) => {
    if (!templateId) return;
    if (!keepImportingState) {
      setIsFigmaImporting(true);
    }
    setFigmaImportMessage(
      withAssets
        ? 'Figma 구조와 이미지 에셋을 가져오는 중입니다.'
        : 'Figma 구조를 가져오는 중입니다.'
    );
    setDbSyncMessage(
      withAssets
        ? 'Figma import 진행 중 (이미지 에셋 포함)'
        : 'Figma import 진행 중'
    );

    try {
      await cancelPendingAutosave();

      const importResult = await v2_importAdminFigmaIntoEditor({
        templateId,
        rootFigmaUrl,
        withAssets,
      });
      const normalized = v2_normalizeTemplateRenderConfig(
        importResult.import.renderConfig
      );
      const normalizedSerialized = JSON.stringify(normalized);

      setFigmaImportMessage('Figma 결과를 draft에 저장하는 중입니다.');
      const draftResponse = await v2_saveAdminRenderConfigDraft({
        templateId,
        renderConfig: normalized,
        baseRevisionNo: baseRevisionNoRef.current ?? null,
        isAutosave: false,
      });
      if (!draftResponse.hasDraft || !draftResponse.draft) {
        throw new Error('DB draft 응답이 비어 있습니다.');
      }

      baseRevisionNoRef.current =
        draftResponse.draft.baseRevisionNo ?? baseRevisionNoRef.current;
      setRenderConfig(normalized);
      setLastDraftSavedSerialized(normalizedSerialized);
      setDbSyncStatus('ready');

      const statusSummary =
        importResult.import.detectedStatuses.length > 0
          ? importResult.import.detectedStatuses.join(', ')
          : '상태 없음';
      const warningSuffix =
        importResult.import.warnings.length > 0
          ? ` / 경고 ${importResult.import.warnings.length}개`
          : '';
      const assetSummary = importResult.import.assetImportSummary;
      const assetSuffix = assetSummary
        ? ` / 에셋 ${assetSummary.applied}/${assetSummary.mapped}개 적용`
        : '';
      const settingSuffix =
        confirmedChanges.length > 0
          ? ` / 설정 ${confirmedChanges.map((change) => change.title).join(', ')}`
          : '';
      setFigmaImportMessage(
        `적용 완료: ${statusSummary}${assetSuffix}${settingSuffix}${warningSuffix}`
      );
      setDbSyncMessage(
        `Figma import 적용 완료 (${statusSummary}${assetSuffix}${settingSuffix})`
      );
    } catch (error) {
      const message = v2_toErrorMessage(error, 'Figma import에 실패했습니다.');
      setFigmaImportMessage(message);
      setDbSyncMessage(message);
    } finally {
      if (!keepImportingState) {
        setIsFigmaImporting(false);
      }
    }
  }, [cancelPendingAutosave, setRenderConfig, templateId]);

  const handleFigmaImport = useCallback(async () => {
    if (!templateId) return;
    if (dbSyncStatus !== 'ready' || isLoading || isPublishing || isFigmaImporting) {
      setFigmaImportMessage('DB 동기화가 완료된 뒤 다시 시도해 주세요.');
      return;
    }

    const rootFigmaUrl = figmaImportUrl.trim();
    if (!rootFigmaUrl) {
      setFigmaImportMessage('Figma 링크를 입력해 주세요.');
      return;
    }

    setIsFigmaImporting(true);
    setPendingFigmaImportConfirmation(null);
    setFigmaImportMessage('Figma 구조와 템플릿 설정을 비교하는 중입니다.');
    setDbSyncMessage('Figma import 설정 확인 중');

    try {
      const analyzeResult = await v2_analyzeAdminFigmaForEditor({
        rootFigmaUrl,
      });

      if (!analyzeResult.analysis.canImport) {
        const criticalSummary =
          analyzeResult.analysis.critical[0] ??
          'Figma 구조 검증에서 오류가 감지되었습니다.';
        throw new Error(criticalSummary);
      }

      const settingChanges = v2_buildFigmaImportSettingChanges({
        renderConfig,
        detectedStatuses: analyzeResult.analysis.detectedStatuses,
        detectedFeatures: analyzeResult.analysis.detectedFeatures,
      });

      if (settingChanges.length > 0) {
        setPendingFigmaImportConfirmation({
          rootFigmaUrl,
          withAssets: figmaImportWithAssets,
          changes: settingChanges,
          detectedStatuses: analyzeResult.analysis.detectedStatuses,
          warnings: analyzeResult.analysis.warnings,
        });
        setFigmaImportMessage(
          `${settingChanges.map((change) => change.title).join(', ')} 설정 변경이 필요합니다. 적용 여부를 확인해 주세요.`
        );
        setDbSyncMessage('Figma import 설정 확인 대기 중');
        return;
      }

      await executeFigmaImport({
        rootFigmaUrl,
        withAssets: figmaImportWithAssets,
        keepImportingState: true,
      });
    } catch (error) {
      const message = v2_toErrorMessage(error, 'Figma 분석에 실패했습니다.');
      setFigmaImportMessage(message);
      setDbSyncMessage(message);
    } finally {
      setIsFigmaImporting(false);
    }
  }, [
    dbSyncStatus,
    executeFigmaImport,
    figmaImportWithAssets,
    figmaImportUrl,
    isFigmaImporting,
    isLoading,
    isPublishing,
    renderConfig,
    templateId,
  ]);

  const confirmPendingFigmaImport = useCallback(() => {
    const pending = pendingFigmaImportConfirmation;
    if (!pending || isFigmaImporting) return;
    setPendingFigmaImportConfirmation(null);
    void executeFigmaImport({
      rootFigmaUrl: pending.rootFigmaUrl,
      withAssets: pending.withAssets,
      confirmedChanges: pending.changes,
    });
  }, [executeFigmaImport, isFigmaImporting, pendingFigmaImportConfirmation]);

  const cancelPendingFigmaImport = useCallback(() => {
    setPendingFigmaImportConfirmation(null);
    setFigmaImportMessage('Figma import를 취소했습니다.');
    setDbSyncMessage('Figma import 취소');
  }, []);

  const resetFigmaImport = useCallback(() => {
    setFigmaImportUrl('');
    setFigmaImportWithAssets(true);
    setFigmaImportMessage(null);
    setPendingFigmaImportConfirmation(null);
  }, []);

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

  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (event.altKey) return;
      if (v2_isTemplateEditorTextEditingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const isModKey = event.metaKey || event.ctrlKey;
      const isUndoShortcut = isModKey && key === 'z' && !event.shiftKey;
      const isRedoShortcut =
        (isModKey && key === 'z' && event.shiftKey) ||
        (event.ctrlKey && !event.metaKey && key === 'y');
      if (!isUndoShortcut && !isRedoShortcut) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;

      if (isRedoShortcut) {
        redoRenderConfig();
        return;
      }
      undoRenderConfig();
    };

    window.addEventListener('keydown', handleHistoryShortcut);
    return () => {
      window.removeEventListener('keydown', handleHistoryShortcut);
    };
  }, [redoRenderConfig, undoRenderConfig]);

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

  const isFigmaImportDisabled =
    !templateId ||
    dbSyncStatus !== 'ready' ||
    isLoading ||
    isPublishing ||
    isFigmaImporting;

  const updateFigmaImportUrl = useCallback((value: string) => {
    setFigmaImportUrl(value);
    setPendingFigmaImportConfirmation(null);
  }, []);

  const updateFigmaImportWithAssets = useCallback((value: boolean) => {
    setFigmaImportWithAssets(value);
    setPendingFigmaImportConfirmation(null);
  }, []);

  const providerValue = useMemo(
    () => ({
      templateId: templateId ?? null,
      source: dbSource,
      isLoading,
      renderConfig,
      setRenderConfig,
      figmaImport: {
        rootFigmaUrl: figmaImportUrl,
        setRootFigmaUrl: updateFigmaImportUrl,
        withAssets: figmaImportWithAssets,
        setWithAssets: updateFigmaImportWithAssets,
        isImporting: isFigmaImporting,
        canImport: !isFigmaImportDisabled,
        message: figmaImportMessage,
        pendingSettingChanges: pendingFigmaImportConfirmation?.changes ?? [],
        confirmPendingImport: confirmPendingFigmaImport,
        cancelPendingImport: cancelPendingFigmaImport,
        importToCurrentTemplate: () => {
          void handleFigmaImport();
        },
        reset: resetFigmaImport,
      },
    }),
    [
      dbSource,
      figmaImportMessage,
      figmaImportUrl,
      figmaImportWithAssets,
      cancelPendingFigmaImport,
      confirmPendingFigmaImport,
      handleFigmaImport,
      isFigmaImportDisabled,
      isFigmaImporting,
      isLoading,
      pendingFigmaImportConfirmation,
      renderConfig,
      resetFigmaImport,
      setRenderConfig,
      templateId,
      updateFigmaImportUrl,
      updateFigmaImportWithAssets,
    ]
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
