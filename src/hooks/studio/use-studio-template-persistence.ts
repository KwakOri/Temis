"use client";
import { useCallback, useEffect, useRef } from "react";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTemplateKind,
} from "@/types/template-studio";
import { TemplateStudioApiError } from "@/services/templateStudioService";
import type {
  TemplateStudioAssetSyncContext,
  TemplateStudioPublishPayload,
  TemplateStudioSaveDraftPayload,
  TemplateStudioSaveEventPayload,
  TemplateStudioUploadAssetPayload,
  TemplateStudioUploadedAsset,
} from "@/services/templateStudioService";
import {
  applyStudioSyncedAssets,
  getStudioDataImageMetadata,
  isStudioDataImageSrc,
  planStudioAssetSync,
  type StudioDataImageMetadata,
  type StudioRemoteAssetSnapshot,
} from "@/utils/template-studio/asset-sync";
import {
  createStudioTemplateExportPayload,
  getStudioTemplateBlockingDiagnostics,
  getStudioTemplateDiagnosticsSummary,
  getStudioTemplateExportFilename,
  parseStudioTemplateExportJson,
} from "@/utils/template-studio/serialization";
import { validateStudioRuntimeValuesForDocument } from "@/utils/template-studio/timetable-runtime";
import { getStudioTemplateKind } from "@/utils/template-studio/template-kind";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import {
  createTemplateStudioDocumentSummary,
  type TemplateStudioSaveOperation,
} from "@/utils/template-studio/save-audit";
/** 원격에 저장해 둔 문서 한 벌. 초안이 있으면 초안을 먼저 본다. */
export interface StudioRemoteTemplateSnapshot {
  draft?: {
    document: StudioTemplateDocument;
    runtimeValues: StudioRuntimeValues;
  } | null;
  document?: {
    document: StudioTemplateDocument;
    runtimeValues: StudioRuntimeValues;
  } | null;
  assets?: StudioRemoteAssetSnapshot[];
  latestRevisionNo?: number | null;
}
export interface StudioTemplatePersistenceOptions {
  /** 콜백 안에서 최신 문서를 읽는다. */
  getDocument: () => StudioTemplateDocument;
  getRuntimeValues: () => StudioRuntimeValues;
  /** 동기화한 문서를 그대로 앉힌다. 이력에는 남기지 않는다. */
  setDocument: (document: StudioTemplateDocument) => void;
  /** 지금 열어 둔 원격 템플릿. 아직 만들지 않았으면 없다. */
  templateId: string | null;
  onTemplateIdChange: (templateId: string) => void;
  /** 주소로 들어온 템플릿. 화면을 처음 열 때 한 번 불러온다. */
  initialTemplateId?: string | null;
  /** 편집기 종류에 맞는 관리자 미리보기 경로. */
  previewPathForTemplate?: (templateId: string) => string;
  getRemoteTemplate: () => StudioRemoteTemplateSnapshot | null | undefined;
  refetchRemoteTemplate: () => Promise<{
    data?: StudioRemoteTemplateSnapshot | null;
  }>;
  createRemoteTemplate: (input: {
    name: string;
    description: string;
    templateKind?: StudioTemplateKind;
  }) => Promise<{ template: { id: string } }>;
  saveRemoteDraft: (input: {
    templateId: string;
    payload: TemplateStudioSaveDraftPayload;
  }) => Promise<unknown>;
  publishRemoteDocument: (input: {
    templateId: string;
    payload: TemplateStudioPublishPayload;
  }) => Promise<{ revisionNo: number }>;
  syncRemoteAssets: (input: {
    templateId: string;
    assets: TemplateStudioUploadAssetPayload[];
    context: TemplateStudioAssetSyncContext;
  }) => Promise<{ assets: TemplateStudioUploadedAsset[] }>;
  recordRemoteSaveEvent?: (input: {
    templateId: string;
    payload: TemplateStudioSaveEventPayload;
  }) => Promise<unknown>;
  /**
   * 문서 한 벌을 갈아끼운다.
   *
   * 불러오기와 JSON 가져오기가 같은 함수를 쓴다. 무엇을 초기화해야 하는지는
   * 편집기가 알고 있으므로 여기서 정하지 않는다.
   */
  onReplaceDocument: (
    document: StudioTemplateDocument,
    runtimeValues: StudioRuntimeValues,
    message: string,
  ) => void;
  onStatusMessage: (message: string) => void;
  /** 내보내기가 막혔을 때. 보통 진단 절을 펼친다. */
  onExportBlocked: () => void;
}
export interface StudioTemplatePersistence {
  /** 파일로 내려받는다. 막는 진단이 있으면 내보내지 않는다. */
  exportJson: () => void;
  importJsonFile: (file: File) => Promise<void>;
  /** 원격 템플릿을 만들거나 이미 있는 것을 돌려준다. */
  ensureTemplateId: () => Promise<string>;
  /**
   * 문서에 담긴 사진을 원격으로 올린다.
   *
   * 저장·발행·미리보기가 모두 이 함수를 먼저 부른다. 빼먹으면 사진 내용이 담긴
   * 채로 저장되어 문서가 커지고, 열어 보는 쪽에서 사진이 나오지 않는다.
   */
  ensureAssetsSynced: (
    templateId: string,
    context: TemplateStudioAssetSyncContext,
  ) => Promise<StudioTemplateDocument>;
  loadRemoteTemplate: () => Promise<void>;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  /** 초안을 저장한 뒤 미리보기를 새 창으로 연다. */
  openDraftPreview: () => Promise<void>;
  /** 이미 저장해 둔 것을 그대로 본다. */
  openSavedPreview: () => void;
}
/**
 * 원격 문서 한 벌을 다루는 규칙.
 *
 * 저장, 발행, 미리보기는 모두 같은 순서를 지켜야 한다. 원격 템플릿을 확보하고,
 * 사진을 올려 문서에서 사진 내용을 걷어내고, 그 문서를 보낸다. 이 순서가 세 곳에
 * 흩어져 있으면 새 경로를 만들 때 사진 올리기를 빼먹는다. 빼먹은 것은 발행한 뒤에야
 * 드러난다.
 *
 * 어떤 사진을 다시 올릴지는 순수 함수가 정한다. 이 훅은 문서를 읽고 결과를
 * 앉히는 일만 한다.
 */
export function useStudioTemplatePersistence({
  getDocument,
  getRuntimeValues,
  setDocument,
  templateId,
  onTemplateIdChange,
  initialTemplateId,
  getRemoteTemplate,
  refetchRemoteTemplate,
  createRemoteTemplate,
  saveRemoteDraft,
  publishRemoteDocument,
  syncRemoteAssets,
  recordRemoteSaveEvent,
  onReplaceDocument,
  onStatusMessage,
  onExportBlocked,
  previewPathForTemplate = (nextTemplateId) =>
    `/admin/template-studio/${nextTemplateId}/preview`,
}: StudioTemplatePersistenceOptions): StudioTemplatePersistence {
  const createAttemptId = useCallback(() => globalThis.crypto.randomUUID(), []);
  const getFailureStatus = useCallback((prefix: string, error: unknown) => {
    if (!(error instanceof TemplateStudioApiError)) return `${prefix} failed`;
    const diagnostic = error.diagnostics[0];
    const reason = diagnostic?.title ?? error.message;
    const attemptLabel = error.attemptId
      ? ` · ref ${error.attemptId.slice(0, 8)}`
      : "";
    return `${prefix} failed: ${reason}${attemptLabel}`;
  }, []);
  const validateBeforePersistence = useCallback(
    async (
      attemptId: string,
      operation: TemplateStudioSaveOperation,
    ): Promise<boolean> => {
      const currentDocument = getDocument();
      const currentRuntimeValues = getRuntimeValues();
      const diagnostics = [
        ...validateStudioDocument(currentDocument),
        ...validateStudioRuntimeValuesForDocument(
          currentDocument,
          currentRuntimeValues,
        ),
      ];
      const blockingDiagnostics =
        getStudioTemplateBlockingDiagnostics(diagnostics);
      if (blockingDiagnostics.length === 0) return true;

      const firstError = blockingDiagnostics[0];
      const message = `${operation === "publish" ? "Publish" : "Save"} blocked: ${blockingDiagnostics.length} error(s) · ${firstError?.title ?? "Check diagnostics"}`;
      onExportBlocked();
      onStatusMessage(message);

      if (templateId && recordRemoteSaveEvent) {
        try {
          await recordRemoteSaveEvent({
            templateId,
            payload: {
              attemptId,
              operation,
              errorMessage: message,
              diagnostics: blockingDiagnostics,
              documentSummary: createTemplateStudioDocumentSummary(
                currentDocument,
                currentRuntimeValues,
              ),
            },
          });
        } catch (error) {
          console.error(
            "Template Studio client validation audit failed:",
            error,
          );
        }
      }

      return false;
    },
    [
      getDocument,
      getRuntimeValues,
      onExportBlocked,
      onStatusMessage,
      recordRemoteSaveEvent,
      templateId,
    ],
  );
  const exportJson = useCallback(() => {
    const currentDocument = getDocument();
    const exportDiagnostics = [
      ...validateStudioDocument(currentDocument),
      ...validateStudioRuntimeValuesForDocument(
        currentDocument,
        getRuntimeValues(),
      ),
    ];
    const blockingDiagnostics =
      getStudioTemplateBlockingDiagnostics(exportDiagnostics);
    const diagnosticsSummary =
      getStudioTemplateDiagnosticsSummary(exportDiagnostics);
    // 막는 진단이 있는 문서를 내보내면 받는 쪽에서 열 수 없다. 무엇이 막았는지
    // 보여줘야 고칠 수 있으므로 진단을 펼친다.
    if (blockingDiagnostics.length > 0) {
      onExportBlocked();
      onStatusMessage(
        `Export blocked: ${diagnosticsSummary.errorCount} error(s) · ${diagnosticsSummary.firstError?.title ?? "Check diagnostics"}`,
      );
      return;
    }
    const payload = createStudioTemplateExportPayload(
      currentDocument,
      getRuntimeValues(),
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = getStudioTemplateExportFilename(currentDocument);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    onStatusMessage(
      diagnosticsSummary.warningCount > 0
        ? `Exported JSON with ${diagnosticsSummary.warningCount} warning(s)`
        : "Exported JSON",
    );
  }, [getDocument, getRuntimeValues, onExportBlocked, onStatusMessage]);
  const importJsonFile = useCallback(
    async (file: File) => {
      let source = "";
      try {
        source = await file.text();
      } catch {
        onStatusMessage("Import failed: could not read file");
        return;
      }
      const importResult = parseStudioTemplateExportJson(source);
      if (!importResult.ok) {
        onStatusMessage(`Import failed: ${importResult.message}`);
        return;
      }
      const warningCount = importResult.diagnostics.filter(
        (diagnostic) => diagnostic.severity === "warning",
      ).length;
      const migrationWarningCount = importResult.migrationWarnings.length;
      onReplaceDocument(
        importResult.document,
        importResult.runtimeValues,
        importResult.usedRuntimeFallback
          ? "Imported JSON with default runtime values"
          : migrationWarningCount > 0
            ? `Imported JSON with ${migrationWarningCount} migration note(s)`
            : warningCount > 0
              ? `Imported JSON with ${warningCount} warning(s)`
              : "Imported JSON",
      );
    },
    [onReplaceDocument, onStatusMessage],
  );
  const ensureTemplateId = useCallback(async (): Promise<string> => {
    if (templateId) return templateId;
    const currentDocument = getDocument();
    const created = await createRemoteTemplate({
      name: currentDocument.metadata.name.trim() || "Untitled Template",
      description: currentDocument.metadata.description ?? "",
      templateKind: getStudioTemplateKind(currentDocument) ?? "timetable",
    });
    onTemplateIdChange(created.template.id);
    return created.template.id;
  }, [createRemoteTemplate, getDocument, onTemplateIdChange, templateId]);
  const ensureAssetsSynced = useCallback(
    async (
      nextTemplateId: string,
      context: TemplateStudioAssetSyncContext,
    ): Promise<StudioTemplateDocument> => {
      const currentDocument = getDocument();
      const assets = Object.values(currentDocument.assets);
      // 내용이 담긴 사진만 지문을 읽는다. 주소만 있는 사진은 읽을 내용이 없다.
      const localMetadataEntries = await Promise.all(
        assets
          .filter((asset) => isStudioDataImageSrc(asset.src))
          .map(
            async (asset) =>
              [asset.id, await getStudioDataImageMetadata(asset.src)] as const,
          ),
      );
      const localMetadataByAssetId: Record<
        string,
        StudioDataImageMetadata | null
      > = Object.fromEntries(localMetadataEntries);
      const plan = planStudioAssetSync({
        assets,
        remoteAssets: getRemoteTemplate()?.assets ?? [],
        localMetadataByAssetId,
      });
      const nextDocument = JSON.parse(
        JSON.stringify(currentDocument),
      ) as StudioTemplateDocument;
      let changed = applyStudioSyncedAssets(nextDocument, plan.patches);
      if (plan.uploads.length > 0) {
        onStatusMessage(`Syncing ${plan.uploads.length} asset(s)`);
        const synced = await syncRemoteAssets({
          templateId: nextTemplateId,
          assets: plan.uploads,
          context,
        });
        changed =
          applyStudioSyncedAssets(nextDocument, synced.assets) || changed;
      }
      // 바뀐 것이 없으면 문서를 갈아끼우지 않는다. 저장할 때마다 같은 문서로
      // 갈아끼우면 편집 중인 화면이 한 번 더 그려진다.
      if (!changed) return currentDocument;
      setDocument(nextDocument);
      if (plan.uploads.length > 0) {
        onStatusMessage(`Synced ${plan.uploads.length} asset(s)`);
      }
      return nextDocument;
    },
    [
      getDocument,
      getRemoteTemplate,
      onStatusMessage,
      setDocument,
      syncRemoteAssets,
    ],
  );
  const loadRemoteTemplate = useCallback(async () => {
    if (!templateId) {
      onStatusMessage("Select a database template first");
      return;
    }
    try {
      const result = await refetchRemoteTemplate();
      const remoteTemplate = result.data;
      if (!remoteTemplate) {
        onStatusMessage("Database template not found");
        return;
      }
      const source = remoteTemplate.draft ?? remoteTemplate.document;
      if (!source) {
        onStatusMessage("Database template is empty");
        return;
      }
      onReplaceDocument(
        source.document,
        source.runtimeValues,
        remoteTemplate.draft
          ? "Loaded database draft"
          : "Loaded published document",
      );
    } catch (error) {
      console.error("Template Studio database load failed:", error);
      onStatusMessage("Database load failed");
    }
  }, [onReplaceDocument, onStatusMessage, refetchRemoteTemplate, templateId]);
  const saveDraft = useCallback(async () => {
    const attemptId = createAttemptId();
    try {
      if (!(await validateBeforePersistence(attemptId, "save_draft"))) return;
      const nextTemplateId = await ensureTemplateId();
      const latestRevisionNo = getRemoteTemplate()?.latestRevisionNo ?? null;
      const nextDocument = await ensureAssetsSynced(nextTemplateId, {
        attemptId,
        operation: "save_draft",
      });
      await saveRemoteDraft({
        templateId: nextTemplateId,
        payload: {
          document: nextDocument,
          runtimeValues: getRuntimeValues(),
          baseRevisionNo: latestRevisionNo,
          isAutosave: false,
          attemptId,
          operation: "save_draft",
        },
      });
      onStatusMessage("Draft saved to database");
    } catch (error) {
      console.error("Template Studio database draft save failed:", error);
      onStatusMessage(getFailureStatus("Database draft save", error));
    }
  }, [
    createAttemptId,
    ensureAssetsSynced,
    ensureTemplateId,
    getFailureStatus,
    getRemoteTemplate,
    getRuntimeValues,
    onStatusMessage,
    saveRemoteDraft,
    validateBeforePersistence,
  ]);
  const publish = useCallback(async () => {
    const attemptId = createAttemptId();
    try {
      if (!(await validateBeforePersistence(attemptId, "publish"))) return;
      const nextTemplateId = await ensureTemplateId();
      const nextDocument = await ensureAssetsSynced(nextTemplateId, {
        attemptId,
        operation: "publish",
      });
      const published = await publishRemoteDocument({
        templateId: nextTemplateId,
        payload: {
          document: nextDocument,
          runtimeValues: getRuntimeValues(),
          attemptId,
          operation: "publish",
        },
      });
      onStatusMessage(`Published revision ${published.revisionNo}`);
    } catch (error) {
      console.error("Template Studio publish failed:", error);
      onStatusMessage(getFailureStatus("Publish", error));
    }
  }, [
    createAttemptId,
    ensureAssetsSynced,
    ensureTemplateId,
    getRuntimeValues,
    getFailureStatus,
    onStatusMessage,
    publishRemoteDocument,
    validateBeforePersistence,
  ]);
  const openPreviewWindow = useCallback(
    (nextTemplateId: string) => {
      const previewUrl = previewPathForTemplate(nextTemplateId);
      const previewWindow = window.open(previewUrl, "_blank");
      // 새 창이 막혔으면 지금 창에서 연다. 아무 일도 일어나지 않는 것보다 낫다.
      if (!previewWindow) window.location.assign(previewUrl);
    },
    [previewPathForTemplate],
  );
  const openDraftPreview = useCallback(async () => {
    const attemptId = createAttemptId();
    try {
      if (!(await validateBeforePersistence(attemptId, "preview"))) return;
      const nextTemplateId = await ensureTemplateId();
      const syncedDocument = await ensureAssetsSynced(nextTemplateId, {
        attemptId,
        operation: "preview",
      });
      const latestRevisionNo = getRemoteTemplate()?.latestRevisionNo ?? null;
      // 미리보기는 저장해 둔 것을 읽는다. 저장하지 않고 열면 방금 고친 것이
      // 빠진 화면을 보게 된다.
      await saveRemoteDraft({
        templateId: nextTemplateId,
        payload: {
          document: syncedDocument,
          runtimeValues: getRuntimeValues(),
          baseRevisionNo: latestRevisionNo,
          isAutosave: false,
          attemptId,
          operation: "preview",
        },
      });
      openPreviewWindow(nextTemplateId);
      onStatusMessage("Saved draft preview");
    } catch (error) {
      console.error("Template Studio preview open failed:", error);
      onStatusMessage(getFailureStatus("Preview", error));
    }
  }, [
    createAttemptId,
    ensureAssetsSynced,
    ensureTemplateId,
    getRemoteTemplate,
    getRuntimeValues,
    getFailureStatus,
    onStatusMessage,
    openPreviewWindow,
    saveRemoteDraft,
    validateBeforePersistence,
  ]);
  const openSavedPreview = useCallback(() => {
    if (!templateId) {
      onStatusMessage("Save or publish a database template first");
      return;
    }
    openPreviewWindow(templateId);
  }, [onStatusMessage, openPreviewWindow, templateId]);
  /**
   * 주소로 들어온 템플릿을 한 번만 불러온다.
   *
   * 같은 템플릿을 두 번 불러오면 사용자가 고치던 것이 저장된 값으로 되돌아간다.
   */
  const autoLoadedTemplateIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialTemplateId) return;
    if (templateId !== initialTemplateId) return;
    if (autoLoadedTemplateIdRef.current === initialTemplateId) return;
    const remoteTemplate = getRemoteTemplate();
    if (!remoteTemplate) return;
    autoLoadedTemplateIdRef.current = initialTemplateId;
    const source = remoteTemplate.draft ?? remoteTemplate.document;
    if (!source) {
      onStatusMessage("Database template is empty");
      return;
    }
    onReplaceDocument(
      source.document,
      source.runtimeValues,
      remoteTemplate.draft
        ? "Loaded database draft"
        : "Loaded published document",
    );
  }, [
    getRemoteTemplate,
    initialTemplateId,
    onReplaceDocument,
    onStatusMessage,
    templateId,
  ]);
  useEffect(() => {
    // 다른 템플릿으로 옮겨 가면 자동 불러오기를 다시 할 수 있게 한다.
    autoLoadedTemplateIdRef.current = null;
  }, [initialTemplateId]);
  return {
    exportJson,
    importJsonFile,
    ensureTemplateId,
    ensureAssetsSynced,
    loadRemoteTemplate,
    saveDraft,
    publish,
    openDraftPreview,
    openSavedPreview,
  };
}
