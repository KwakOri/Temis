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
import {
  createStudioPersistenceGate,
  mergeStudioSyncedAssetsIntoLatestDocument,
} from "@/utils/template-studio/persistence-pipeline";
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

export type StudioPersistenceOperation =
  "load" | "save_draft" | "publish" | "preview" | "preview_image";
export type StudioPersistenceStage =
  | "loading"
  | "validating"
  | "creating"
  | "syncing-assets"
  | "saving"
  | "publishing"
  | "previewing";

export interface StudioPersistenceOperationState {
  operation: StudioPersistenceOperation;
  stage: StudioPersistenceStage;
}

export interface StudioPersistenceOperationResult {
  operation: StudioPersistenceOperation;
  ok: boolean;
  message: string;
}

export interface StudioPublishedPreviewInput {
  templateId: string;
  revisionNo: number;
  document: StudioTemplateDocument;
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
  /** 주소로 들어온 템플릿의 첫 query가 아직 끝나지 않았는지. */
  isRemoteTemplateLoading?: boolean;
  /** 주소로 들어온 템플릿 query가 실패했는지. */
  hasRemoteTemplateLoadError?: boolean;
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
  }) => Promise<{
    revisionNo: number;
    document: {
      document: StudioTemplateDocument;
      runtimeValues: StudioRuntimeValues;
    };
  }>;
  /** 발행된 문서를 clean 이미지로 렌더링해 저장한다. */
  createPublishedPreview?: (
    input: StudioPublishedPreviewInput,
  ) => Promise<void>;
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
  /** 저장·발행·미리보기 진행 상태를 화면 overlay에 전달한다. */
  onOperationStateChange?: (
    state: StudioPersistenceOperationState | null,
  ) => void;
  /** 작업이 끝났을 때 성공·실패 토스트를 만들 수 있게 한다. */
  onOperationResult?: (result: StudioPersistenceOperationResult) => void;
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
  saveDraft: () => Promise<boolean>;
  publish: () => Promise<boolean>;
  /** 마지막 발행 revision의 자동 미리보기를 다시 생성한다. */
  retryPublishedPreview: () => Promise<boolean>;
  /** 초안을 저장한 뒤 미리보기를 새 창으로 연다. */
  openDraftPreview: () => Promise<boolean>;
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
  isRemoteTemplateLoading = false,
  hasRemoteTemplateLoadError = false,
  getRemoteTemplate,
  refetchRemoteTemplate,
  createRemoteTemplate,
  saveRemoteDraft,
  publishRemoteDocument,
  syncRemoteAssets,
  recordRemoteSaveEvent,
  onReplaceDocument,
  onStatusMessage,
  onOperationStateChange,
  onOperationResult,
  onExportBlocked,
  createPublishedPreview,
  previewPathForTemplate = (nextTemplateId) =>
    `/admin/template-studio/${nextTemplateId}/preview`,
}: StudioTemplatePersistenceOptions): StudioTemplatePersistence {
  const createAttemptId = useCallback(() => globalThis.crypto.randomUUID(), []);
  const persistenceGateRef = useRef<ReturnType<
    typeof createStudioPersistenceGate
  > | null>(null);
  if (!persistenceGateRef.current) {
    persistenceGateRef.current = createStudioPersistenceGate();
  }
  const runExclusive = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
      if (persistenceGateRef.current?.isBusy()) {
        onStatusMessage("Another template operation is already in progress");
        return undefined;
      }
      return persistenceGateRef.current?.runExclusive(operation);
    },
    [onStatusMessage],
  );
  const lastPublishedPreviewInputRef =
    useRef<StudioPublishedPreviewInput | null>(null);
  const setOperationState = useCallback(
    (operation: StudioPersistenceOperation, stage: StudioPersistenceStage) => {
      onOperationStateChange?.({ operation, stage });
    },
    [onOperationStateChange],
  );
  const clearOperationState = useCallback(() => {
    onOperationStateChange?.(null);
  }, [onOperationStateChange]);
  const getFailureStatus = useCallback((prefix: string, error: unknown) => {
    if (!(error instanceof TemplateStudioApiError)) return `${prefix} failed`;
    const diagnostic = error.diagnostics[0];
    const reason = diagnostic?.title ?? error.message;
    const attemptLabel = error.attemptId
      ? ` · ref ${error.attemptId.slice(0, 8)}`
      : "";
    return `${prefix} failed: ${reason}${attemptLabel}`;
  }, []);
  const runPublishedPreview = useCallback(
    async (
      input: StudioPublishedPreviewInput,
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!createPublishedPreview) return { ok: true };

      setOperationState("preview_image", "previewing");
      try {
        await createPublishedPreview(input);
        onStatusMessage(`Preview image saved for revision ${input.revisionNo}`);
        return { ok: true };
      } catch (error) {
        console.error(
          "Template Studio preview image generation failed:",
          error,
        );
        const message = getFailureStatus("Preview image", error);
        onStatusMessage(message);
        return { ok: false, message };
      } finally {
        clearOperationState();
      }
    },
    [
      clearOperationState,
      createPublishedPreview,
      getFailureStatus,
      onStatusMessage,
      setOperationState,
    ],
  );
  const validateBeforePersistence = useCallback(
    async (
      attemptId: string,
      operation: TemplateStudioSaveOperation,
    ): Promise<{ ok: true } | { ok: false; message: string }> => {
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
      if (blockingDiagnostics.length === 0) return { ok: true };

      const firstError = blockingDiagnostics[0];
      const operationLabel =
        operation === "publish"
          ? "Publish"
          : operation === "preview"
            ? "Preview"
            : "Save";
      const message = `${operationLabel} blocked: ${blockingDiagnostics.length} error(s) · ${firstError?.title ?? "Check diagnostics"}`;
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

      return { ok: false, message };
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
      const syncedAssets = [...plan.patches];
      if (plan.uploads.length > 0) {
        onStatusMessage(`Syncing ${plan.uploads.length} asset(s)`);
        const synced = await syncRemoteAssets({
          templateId: nextTemplateId,
          assets: plan.uploads,
          context,
        });
        syncedAssets.push(...synced.assets);
      }
      const merged = mergeStudioSyncedAssetsIntoLatestDocument({
        latestDocument: getDocument(),
        patches: syncedAssets,
      });
      // 바뀐 것이 없으면 문서를 갈아끼우지 않는다. 저장할 때마다 같은 문서로
      // 갈아끼우면 편집 중인 화면이 한 번 더 그려진다.
      if (!merged.changed) return getDocument();
      setDocument(merged.document);
      if (plan.uploads.length > 0) {
        onStatusMessage(`Synced ${plan.uploads.length} asset(s)`);
      }
      return merged.document;
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
    await runExclusive(async () => {
      setOperationState("load", "loading");
      try {
        const result = await refetchRemoteTemplate();
        const remoteTemplate = result.data;
        if (!remoteTemplate) {
          const message = "Database template not found";
          onStatusMessage(message);
          onOperationResult?.({ operation: "load", ok: false, message });
          return;
        }
        const source = remoteTemplate.draft ?? remoteTemplate.document;
        if (!source) {
          const message = "Database template is empty";
          onStatusMessage(message);
          onOperationResult?.({ operation: "load", ok: false, message });
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
        const message = "Database load failed";
        onStatusMessage(message);
        onOperationResult?.({ operation: "load", ok: false, message });
      } finally {
        clearOperationState();
      }
    });
  }, [
    clearOperationState,
    onOperationResult,
    onReplaceDocument,
    onStatusMessage,
    refetchRemoteTemplate,
    runExclusive,
    setOperationState,
    templateId,
  ]);
  const saveDraft = useCallback(async () => {
    const result = await runExclusive(async () => {
      const attemptId = createAttemptId();
      setOperationState("save_draft", "validating");
      try {
        const validation = await validateBeforePersistence(
          attemptId,
          "save_draft",
        );
        if (!validation.ok) {
          onOperationResult?.({
            operation: "save_draft",
            ok: false,
            message: validation.message,
          });
          return false;
        }
        setOperationState("save_draft", "creating");
        const nextTemplateId = await ensureTemplateId();
        const latestRevisionNo = getRemoteTemplate()?.latestRevisionNo ?? null;
        setOperationState("save_draft", "syncing-assets");
        const nextDocument = await ensureAssetsSynced(nextTemplateId, {
          attemptId,
          operation: "save_draft",
        });
        setOperationState("save_draft", "saving");
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
        const message = "Draft saved to database";
        onStatusMessage(message);
        onOperationResult?.({ operation: "save_draft", ok: true, message });
        return true;
      } catch (error) {
        console.error("Template Studio database draft save failed:", error);
        const message = getFailureStatus("Database draft save", error);
        onStatusMessage(message);
        onOperationResult?.({ operation: "save_draft", ok: false, message });
        return false;
      } finally {
        clearOperationState();
      }
    });
    return result ?? false;
  }, [
    clearOperationState,
    createAttemptId,
    ensureAssetsSynced,
    ensureTemplateId,
    getFailureStatus,
    getRemoteTemplate,
    getRuntimeValues,
    onStatusMessage,
    onOperationResult,
    saveRemoteDraft,
    runExclusive,
    setOperationState,
    validateBeforePersistence,
  ]);
  const publish = useCallback(async () => {
    const result = await runExclusive(async () => {
      const attemptId = createAttemptId();
      setOperationState("publish", "validating");
      try {
        const validation = await validateBeforePersistence(
          attemptId,
          "publish",
        );
        if (!validation.ok) {
          onOperationResult?.({
            operation: "publish",
            ok: false,
            message: validation.message,
          });
          return false;
        }
        setOperationState("publish", "creating");
        const nextTemplateId = await ensureTemplateId();
        setOperationState("publish", "syncing-assets");
        const nextDocument = await ensureAssetsSynced(nextTemplateId, {
          attemptId,
          operation: "publish",
        });
        setOperationState("publish", "publishing");
        const published = await publishRemoteDocument({
          templateId: nextTemplateId,
          payload: {
            document: nextDocument,
            runtimeValues: getRuntimeValues(),
            attemptId,
            operation: "publish",
          },
        });
        const previewInput: StudioPublishedPreviewInput = {
          templateId: nextTemplateId,
          revisionNo: published.revisionNo,
          document: published.document.document,
        };
        lastPublishedPreviewInputRef.current = previewInput;
        const previewResult = createPublishedPreview
          ? await runPublishedPreview(previewInput)
          : { ok: true as const };
        const message = previewResult.ok
          ? `Published revision ${published.revisionNo}`
          : `Published revision ${published.revisionNo}; preview image needs retry`;
        onStatusMessage(message);
        onOperationResult?.({ operation: "publish", ok: true, message });
        return true;
      } catch (error) {
        console.error("Template Studio publish failed:", error);
        const message = getFailureStatus("Publish", error);
        onStatusMessage(message);
        onOperationResult?.({ operation: "publish", ok: false, message });
        return false;
      } finally {
        clearOperationState();
      }
    });
    return result ?? false;
  }, [
    clearOperationState,
    createAttemptId,
    createPublishedPreview,
    ensureAssetsSynced,
    ensureTemplateId,
    getRuntimeValues,
    getFailureStatus,
    onStatusMessage,
    onOperationResult,
    publishRemoteDocument,
    runPublishedPreview,
    runExclusive,
    setOperationState,
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
    const result = await runExclusive(async () => {
      const attemptId = createAttemptId();
      setOperationState("preview", "validating");
      try {
        const validation = await validateBeforePersistence(
          attemptId,
          "preview",
        );
        if (!validation.ok) {
          onOperationResult?.({
            operation: "preview",
            ok: false,
            message: validation.message,
          });
          return false;
        }
        setOperationState("preview", "creating");
        const nextTemplateId = await ensureTemplateId();
        setOperationState("preview", "syncing-assets");
        const syncedDocument = await ensureAssetsSynced(nextTemplateId, {
          attemptId,
          operation: "preview",
        });
        const latestRevisionNo = getRemoteTemplate()?.latestRevisionNo ?? null;
        // 미리보기는 저장해 둔 것을 읽는다. 저장하지 않고 열면 방금 고친 것이
        // 빠진 화면을 보게 된다.
        setOperationState("preview", "saving");
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
        setOperationState("preview", "previewing");
        openPreviewWindow(nextTemplateId);
        const message = "Saved draft preview";
        onStatusMessage(message);
        onOperationResult?.({ operation: "preview", ok: true, message });
        return true;
      } catch (error) {
        console.error("Template Studio preview open failed:", error);
        const message = getFailureStatus("Preview", error);
        onStatusMessage(message);
        onOperationResult?.({ operation: "preview", ok: false, message });
        return false;
      } finally {
        clearOperationState();
      }
    });
    return result ?? false;
  }, [
    clearOperationState,
    createAttemptId,
    ensureAssetsSynced,
    ensureTemplateId,
    getRemoteTemplate,
    getRuntimeValues,
    getFailureStatus,
    onStatusMessage,
    onOperationResult,
    openPreviewWindow,
    runExclusive,
    saveRemoteDraft,
    setOperationState,
    validateBeforePersistence,
  ]);
  const retryPublishedPreview = useCallback(async () => {
    if (!createPublishedPreview) {
      onStatusMessage("Preview image generation is not available");
      return false;
    }

    const remoteTemplate = getRemoteTemplate();
    const input =
      lastPublishedPreviewInputRef.current ??
      (templateId && remoteTemplate?.document && remoteTemplate.latestRevisionNo
        ? {
            templateId,
            revisionNo: remoteTemplate.latestRevisionNo,
            document: remoteTemplate.document.document,
          }
        : null);

    if (!input) {
      onStatusMessage(
        "Publish a thumbnail template before generating a preview image",
      );
      return false;
    }

    const result = await runExclusive(async () => {
      lastPublishedPreviewInputRef.current = input;
      const previewResult = await runPublishedPreview(input);
      const message = previewResult.ok
        ? `Preview image saved for revision ${input.revisionNo}`
        : `${previewResult.message}; please retry`;
      onOperationResult?.({
        operation: "preview_image",
        ok: previewResult.ok,
        message,
      });
      return previewResult.ok;
    });
    return result ?? false;
  }, [
    createPublishedPreview,
    getRemoteTemplate,
    onOperationResult,
    onStatusMessage,
    runPublishedPreview,
    runExclusive,
    templateId,
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
    if (isRemoteTemplateLoading) {
      setOperationState("load", "loading");
      return;
    }
    autoLoadedTemplateIdRef.current = initialTemplateId;
    const remoteTemplate = getRemoteTemplate();
    if (!remoteTemplate || hasRemoteTemplateLoadError) {
      const message = hasRemoteTemplateLoadError
        ? "Database load failed"
        : "Database template not found";
      clearOperationState();
      onStatusMessage(message);
      onOperationResult?.({ operation: "load", ok: false, message });
      return;
    }
    const source = remoteTemplate.draft ?? remoteTemplate.document;
    if (!source) {
      const message = "Database template is empty";
      clearOperationState();
      onStatusMessage(message);
      onOperationResult?.({ operation: "load", ok: false, message });
      return;
    }
    onReplaceDocument(
      source.document,
      source.runtimeValues,
      remoteTemplate.draft
        ? "Loaded database draft"
        : "Loaded published document",
    );
    clearOperationState();
  }, [
    clearOperationState,
    getRemoteTemplate,
    hasRemoteTemplateLoadError,
    initialTemplateId,
    isRemoteTemplateLoading,
    onOperationResult,
    onReplaceDocument,
    onStatusMessage,
    setOperationState,
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
    retryPublishedPreview,
    openDraftPreview,
    openSavedPreview,
  };
}
