"use client";

import { cva } from "class-variance-authority";
import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  StudioImageInputDefinition,
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  deleteStudioRuntimeImage,
  getStudioRuntimeImage,
  putStudioRuntimeImage,
} from "@/services/browser/templateStudioRuntimeImageStorage";
import {
  convertStudioRuntimeImageFileToPngBlob,
  getStudioRuntimeImageBlobSize,
} from "@/utils/template-studio/runtime-image-blob";
import {
  ALLOWED_RUNTIME_IMAGE_SOURCE_MIME_TYPES,
  MAX_RUNTIME_IMAGE_SOURCE_BYTES,
} from "@/utils/template-studio/runtime-image-storage-constants";
import {
  getStudioRuntimeInputValue,
  setStudioRuntimeInputValue,
} from "@/utils/template-studio/input-values";
import {
  getThumbnailStudioInputGroups,
  getThumbnailStudioInputDefinitions,
} from "@/utils/thumbnail-studio/input-order";
import { getStudioImageInputPolicy } from "@/utils/thumbnail-studio/image-input-policy";
import { StudioRuntimeFormShell } from "@/components/studio/runtime/studio-runtime-form-shell";
import { StudioRuntimeActionButton } from "@/components/studio/runtime/ui/studio-runtime-action-button";
import { StudioRuntimeCard } from "@/components/studio/runtime/ui/studio-runtime-card";
import { StudioRuntimeField } from "@/components/studio/runtime/ui/studio-runtime-field";
import { StudioRuntimeSegmentedControl } from "@/components/studio/runtime/ui/studio-runtime-segmented-control";
import { ThumbnailAddonImages } from "./thumbnail-addon-images";
import {
  isThumbnailUserImagesInput,
  type ThumbnailAddonImage,
} from "@/utils/thumbnail-studio/user-images";

import {
  createThumbnailRuntimeImageOverrides,
  getThumbnailRuntimeImagePlacementMode,
  getThumbnailRuntimeImageNodes,
  type StudioRuntimeImageOverrides,
} from "@/utils/thumbnail-studio/runtime-image-transform";

const uploadOverlayVariants = cva(
  "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-xs font-semibold transition-opacity",
  {
    variants: {
      hasImage: {
        true: "bg-[var(--runtime-input-bg)]/85 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
        false: "text-[var(--runtime-fg-muted)]",
      },
    },
  },
);

interface ThumbnailRuntimeFormProps {
  document: StudioTemplateDocument;
  initialRuntimeValues: StudioRuntimeValues;
  runtimeValues: StudioRuntimeValues;
  setRuntimeValues: React.Dispatch<React.SetStateAction<StudioRuntimeValues>>;
  runtimeImageOverrides: StudioRuntimeImageOverrides;
  setRuntimeImageOverrides: React.Dispatch<
    React.SetStateAction<StudioRuntimeImageOverrides>
  >;
  activeImage?: { inputId: string; nodeId: string } | null;
  onAdjustImage?: (target: { inputId: string; nodeId: string } | null) => void;
  onResetImageAdjustment?: (
    inputId: string,
    preserveIntrinsicSize?: boolean,
  ) => void;
  addonImages?: ThumbnailAddonImage[];
  setAddonImages?: React.Dispatch<React.SetStateAction<ThumbnailAddonImage[]>>;
  addonsLoaded?: boolean;
  imageStorageError?: string | null;
  templateId: string;
  storageOwnerId: string;
  templateName: string;
  revisionNo: number;
  exportDisabled: boolean;
  isExporting: boolean;
  readinessMessage?: string;
  onExport: () => void;
  onReset: () => void;
}

const imageContext = { scope: "global" as const };

export function ThumbnailRuntimeForm({
  document,
  initialRuntimeValues,
  runtimeValues,
  setRuntimeValues,
  runtimeImageOverrides,
  setRuntimeImageOverrides,
  activeImage,
  onAdjustImage,
  onResetImageAdjustment,
  addonImages = [],
  setAddonImages,
  addonsLoaded = true,
  imageStorageError,
  templateId,
  storageOwnerId,
  templateName,
  revisionNo,
  exportDisabled,
  isExporting,
  readinessMessage,
  onExport,
  onReset,
}: ThumbnailRuntimeFormProps) {
  const imageInputs = useMemo(
    () =>
      getThumbnailStudioInputDefinitions(document).filter(
        (input): input is StudioImageInputDefinition => input.type === "image",
      ),
    [document],
  );
  const groups = useMemo(
    () =>
      getThumbnailStudioInputGroups(document)
        .map((group) => ({
          ...group,
          inputs: group.inputs.filter(
            (input) => !isThumbnailUserImagesInput(input),
          ),
        }))
        .filter((group) => group.inputs.length > 0),
    [document],
  );
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const imageFileInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const replaceObjectUrl = useCallback(
    (inputId: string, nextUrl: string | null) => {
      const previousUrl = objectUrlsRef.current.get(inputId);
      if (previousUrl && previousUrl !== nextUrl)
        URL.revokeObjectURL(previousUrl);
      if (nextUrl) objectUrlsRef.current.set(inputId, nextUrl);
      else objectUrlsRef.current.delete(inputId);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      imageInputs.map(async (input) => {
        try {
          const record = await getStudioRuntimeImage({
            userId: storageOwnerId,
            templateId,
            inputId: input.id,
            context: imageContext,
          });
          if (!record || cancelled) return;
          const intrinsicSize = await getStudioRuntimeImageBlobSize(
            record.blob,
          );
          if (cancelled) return;
          const url = URL.createObjectURL(record.blob);
          replaceObjectUrl(input.id, url);
          setRuntimeValues((current) =>
            setStudioRuntimeInputValue(document, current, input.id, url),
          );
          setRuntimeImageOverrides((current) => ({
            ...current,
            [input.id]: {
              ...createThumbnailRuntimeImageOverrides(document)[input.id],
              ...current[input.id],
              intrinsicSize,
            },
          }));
        } catch {
          // A missing or unavailable local image falls back to the document default.
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [
    document,
    imageInputs,
    replaceObjectUrl,
    setRuntimeValues,
    setRuntimeImageOverrides,
    storageOwnerId,
    templateId,
  ]);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    [],
  );

  const updateValue = (input: StudioInputDefinition, value: string) => {
    setRuntimeValues((current) =>
      setStudioRuntimeInputValue(document, current, input.id, value),
    );
  };

  const commitImage = async (input: StudioImageInputDefinition, blob: Blob) => {
    const intrinsicSize = await getStudioRuntimeImageBlobSize(blob);
    await putStudioRuntimeImage(
      {
        userId: storageOwnerId,
        templateId,
        inputId: input.id,
        context: imageContext,
      },
      blob,
    );
    const url = URL.createObjectURL(blob);
    replaceObjectUrl(input.id, url);
    updateValue(input, url);
    onResetImageAdjustment?.(input.id, false);
    setRuntimeImageOverrides((current) => ({
      ...current,
      [input.id]: {
        ...createThumbnailRuntimeImageOverrides(document)[input.id],
        intrinsicSize,
      },
    }));
  };

  const fillImage = (input: StudioImageInputDefinition) => {
    onResetImageAdjustment?.(input.id);
    setRuntimeImageOverrides((current) => ({
      ...current,
      [input.id]: {
        ...createThumbnailRuntimeImageOverrides(document)[input.id],
        intrinsicSize: current[input.id]?.intrinsicSize,
      },
    }));
  };

  const uploadImage = async (input: StudioImageInputDefinition, file: File) => {
    setError(null);
    const policy = getStudioImageInputPolicy(input.policy);
    if (!policy.allowReplace) return;
    if (!ALLOWED_RUNTIME_IMAGE_SOURCE_MIME_TYPES.has(file.type)) {
      setError("PNG, JPEG, WebP 또는 GIF 이미지만 사용할 수 있습니다.");
      return;
    }
    if (file.size > MAX_RUNTIME_IMAGE_SOURCE_BYTES) {
      setError("이미지 파일은 20MB 이하만 사용할 수 있습니다.");
      return;
    }

    try {
      const blob = await convertStudioRuntimeImageFileToPngBlob(file);
      await commitImage(input, blob);
    } catch (uploadError) {
      console.error("Thumbnail runtime image upload failed", uploadError);
      setError("이미지를 준비하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const removeImage = async (input: StudioImageInputDefinition) => {
    if (!getStudioImageInputPolicy(input.policy).allowReplace) return;
    setError(null);
    try {
      await deleteStudioRuntimeImage({
        userId: storageOwnerId,
        templateId,
        inputId: input.id,
        context: imageContext,
      });
    } catch {
      setError("이미지를 제거하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    replaceObjectUrl(input.id, null);
    updateValue(input, "");
    onResetImageAdjustment?.(input.id, false);
    setRuntimeImageOverrides((current) => {
      const next = { ...current };
      if (isThumbnailUserImagesInput(input)) next[input.id] = { removed: true };
      else delete next[input.id];
      return next;
    });
  };

  const resetAll = () => {
    imageInputs.forEach((input) => {
      void deleteStudioRuntimeImage({
        userId: storageOwnerId,
        templateId,
        inputId: input.id,
        context: imageContext,
      }).catch(() => undefined);
      replaceObjectUrl(input.id, null);
    });
    setAddonImages?.([]);
    setRuntimeValues(initialRuntimeValues);
    setRuntimeImageOverrides(createThumbnailRuntimeImageOverrides(document));
    onAdjustImage?.(null);
    setError(null);
    onReset();
  };

  const renderImageInput = (input: StudioImageInputDefinition) => {
    const value = runtimeImageOverrides[input.id]?.removed
      ? ""
      : getStudioRuntimeInputValue(input, runtimeValues);
    const policy = getStudioImageInputPolicy(input.policy);
    const imageNodes = getThumbnailRuntimeImageNodes(document, input.id);
    const isAdjusting = activeImage?.inputId === input.id;
    const placementMode = getThumbnailRuntimeImagePlacementMode(
      runtimeImageOverrides[input.id],
    );
    const canAdjust = Boolean(
      onAdjustImage &&
      imageNodes.length > 0 &&
      (policy.allowFitChange || policy.allowFocusChange),
    );

    return (
      <div className="grid gap-3" key={input.id}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[var(--runtime-fg)]">
              {input.label}
              {input.required ? (
                <span className="ml-1 text-rose-500">*</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {input.required && !value.trim() ? (
              <span className="text-[10px] font-bold text-rose-500">필수</span>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <StudioRuntimeActionButton
            fullWidth
            aria-label={`${input.label} 이미지 선택`}
            className="group relative h-36 overflow-hidden rounded-xl border-dashed border-[var(--runtime-border-strong)] bg-[var(--runtime-input-bg)] p-0 enabled:cursor-pointer enabled:hover:border-[var(--runtime-primary)] focus-visible:border-[var(--runtime-primary)]"
            disabled={!policy.allowReplace}
            variant="secondary"
            onClick={() => imageFileInputsRef.current.get(input.id)?.click()}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element -- Runtime image values are local blob URLs or document asset URLs.
              <img
                alt=""
                className="h-full w-full object-contain"
                src={value}
              />
            ) : null}
            {policy.allowReplace ? (
              <span
                className={uploadOverlayVariants({ hasImage: Boolean(value) })}
              >
                <Upload size={16} aria-hidden="true" /> 이미지 선택
              </span>
            ) : !value ? (
              <span className="text-xs text-[var(--runtime-fg-muted)]">
                이미지가 없습니다.
              </span>
            ) : null}
          </StudioRuntimeActionButton>
          {value && policy.allowReplace ? (
            <StudioRuntimeActionButton
              aria-label={`${input.label} 이미지 제거`}
              className="absolute right-2 top-2"
              size="icon"
              variant="secondary"
              onClick={() => void removeImage(input)}
            >
              <Trash2 size={14} aria-hidden="true" />
            </StudioRuntimeActionButton>
          ) : null}
          <input
            ref={(element) => {
              if (element) imageFileInputsRef.current.set(input.id, element);
              else imageFileInputsRef.current.delete(input.id);
            }}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={!policy.allowReplace}
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void uploadImage(input, file);
            }}
          />
        </div>

        {value ? (
          <div className="grid grid-cols-[minmax(0,1fr)_32px] items-center gap-2">
            {isAdjusting && canAdjust ? (
              <StudioRuntimeActionButton
                fullWidth
                variant="primary"
                aria-label={`${input.label} 변경 완료`}
                onClick={() => onAdjustImage?.(null)}
              >
                변경 완료
              </StudioRuntimeActionButton>
            ) : (
              <StudioRuntimeSegmentedControl
                ariaLabel={`${input.label} 배치 방식`}
                className="min-w-0"
                size="compact"
                value={placementMode}
                options={[
                  {
                    id: "cover",
                    label: "채우기",
                    ariaLabel: `${input.label} 채우기`,
                    disabled: !policy.allowFitChange || !imageNodes.length,
                  },
                  {
                    id: "manual",
                    label: "위치 조정",
                    ariaLabel: `${input.label} 위치 조정`,
                    disabled: !canAdjust,
                  },
                ]}
                onValueChange={(mode) => {
                  if (mode === "cover") fillImage(input);
                  else {
                    setRuntimeImageOverrides((current) => ({
                      ...current,
                      [input.id]: {
                        ...current[input.id],
                        placementMode: "manual",
                      },
                    }));
                    onAdjustImage?.({
                      inputId: input.id,
                      nodeId: imageNodes[0].id,
                    });
                  }
                }}
              />
            )}
            <StudioRuntimeActionButton
              size="icon"
              className="h-10"
              variant="secondary"
              aria-label={`${input.label} 배치 재설정`}
              title="배치 재설정"
              disabled={!policy.allowFitChange && !canAdjust}
              onClick={() => fillImage(input)}
            >
              <RotateCcw size={14} aria-hidden="true" />
            </StudioRuntimeActionButton>
          </div>
        ) : null}

        {value &&
        isAdjusting &&
        canAdjust &&
        onAdjustImage &&
        imageNodes.length > 1 ? (
          <label className="grid gap-1 text-[11px] font-bold text-[var(--runtime-fg-muted)]">
            조정할 레이어
            <select
              aria-label={`${input.label} 조정할 레이어`}
              className="rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] p-2 text-[var(--runtime-fg)]"
              value={activeImage.nodeId}
              onChange={(event) =>
                onAdjustImage({
                  inputId: input.id,
                  nodeId: event.currentTarget.value,
                })
              }
            >
              {imageNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    );
  };

  const renderInput = (input: StudioInputDefinition) => {
    if (input.type === "image") return renderImageInput(input);

    const value = getStudioRuntimeInputValue(input, runtimeValues);
    const errorMessage =
      input.required && !value.trim() ? "필수 입력입니다." : undefined;
    if (input.type === "text") {
      if (input.presentation?.control === "date") {
        return (
          <StudioRuntimeField
            control="input"
            description={input.presentation.helpText ?? input.description}
            error={errorMessage}
            label={input.label}
            maxLength={input.maxLength}
            placeholder={input.placeholder}
            required={input.required}
            type="date"
            value={value}
            onValueChange={(next) => updateValue(input, next)}
          />
        );
      }
      return (
        <StudioRuntimeField
          control={input.multiline ? "textarea" : "input"}
          description={input.presentation?.helpText ?? input.description}
          error={errorMessage}
          label={input.label}
          maxLength={input.maxLength}
          placeholder={input.placeholder}
          required={input.required}
          rows={input.minRows ?? 4}
          value={value}
          onValueChange={(next) => updateValue(input, next)}
        />
      );
    }

    return (
      <StudioRuntimeField
        control="select"
        description={input.presentation?.helpText ?? input.description}
        error={errorMessage}
        label={input.label}
        options={input.options}
        required={input.required}
        value={value}
        onValueChange={(next) => updateValue(input, next)}
      />
    );
  };

  return (
    <StudioRuntimeFormShell
      eyebrow="Thumbnail Editor"
      meta={`${templateName} · revision ${revisionNo}`}
      testId="thumbnail-runtime-form"
      footer={
        <div className="grid gap-2">
          {readinessMessage ? (
            <p
              className={
                readinessMessage === "리소스 준비 중…"
                  ? "text-[11px] font-semibold text-[var(--runtime-fg-muted)]"
                  : "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700"
              }
            >
              {readinessMessage}
            </p>
          ) : null}
          <div className="flex gap-2">
            <StudioRuntimeActionButton
              className="shrink-0 px-3"
              size="default"
              variant="secondary"
              onClick={resetAll}
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline">초기화</span>
            </StudioRuntimeActionButton>
            <StudioRuntimeActionButton
              fullWidth
              disabled={exportDisabled}
              size="default"
              onClick={onExport}
            >
              <Download size={15} />
              {isExporting ? "생성 중…" : "PNG 저장"}
            </StudioRuntimeActionButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        {groups.map((group) => (
          <StudioRuntimeCard
            className="grid gap-4"
            key={group.groupId ?? "ungrouped"}
          >
            <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--runtime-fg-muted)]">
              {group.groupId ?? "입력"}
            </h3>
            <div className="grid gap-4">
              {group.inputs.map((input) => (
                <React.Fragment key={input.id}>
                  {renderInput(input)}
                </React.Fragment>
              ))}
            </div>
          </StudioRuntimeCard>
        ))}
        {imageInputs.filter(isThumbnailUserImagesInput).map((input) => (
          <StudioRuntimeCard className="grid gap-4" key={`preset:${input.id}`}>
            <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-[var(--runtime-fg-muted)]">
              이미지
            </h3>
            {setAddonImages ? (
              <ThumbnailAddonImages
                input={input}
                document={document}
                images={addonImages}
                setImages={setAddonImages}
                setOverrides={setRuntimeImageOverrides}
                activeImage={activeImage}
                onAdjustImage={onAdjustImage}
                loaded={addonsLoaded}
              >
                {renderImageInput(input)}
              </ThumbnailAddonImages>
            ) : (
              renderImageInput(input)
            )}
          </StudioRuntimeCard>
        ))}
        {groups.length === 0 && imageInputs.length === 0 ? (
          <StudioRuntimeCard className="text-sm font-semibold text-[var(--runtime-fg-muted)]">
            공개된 입력 필드가 없습니다.
          </StudioRuntimeCard>
        ) : null}
        {imageStorageError ? (
          <p role="alert" className="text-xs font-bold text-rose-500">
            {imageStorageError}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </StudioRuntimeFormShell>
  );
}
