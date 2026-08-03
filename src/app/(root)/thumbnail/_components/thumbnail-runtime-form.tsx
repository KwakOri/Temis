"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  StudioImageFit,
  StudioImageInputDefinition,
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  deleteStudioRuntimeImage,
  getStudioRuntimeImage,
  putStudioRuntimeImage,
} from "@/services/browser/templateStudioRuntimeImageStorage";
import { convertStudioRuntimeImageFileToPngBlob } from "@/utils/template-studio/runtime-image-blob";
import {
  ALLOWED_RUNTIME_IMAGE_SOURCE_MIME_TYPES,
  MAX_RUNTIME_IMAGE_SOURCE_BYTES,
} from "@/utils/template-studio/runtime-image-storage-constants";
import {
  getStudioInputDefaultValue,
  getStudioRuntimeInputValue,
  setStudioRuntimeInputValue,
} from "@/utils/template-studio/input-values";
import {
  formatStudioImageObjectPosition,
  getStudioImageObjectPosition,
  parseStudioImageObjectPosition,
} from "@/utils/thumbnail-studio/image-object-position";
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
import { StudioRuntimeImageCropModal } from "@/app/(root)/template-studio/_components/runtime/ui/studio-runtime-image-crop-modal";

interface ThumbnailRuntimeImageOverride {
  fit?: StudioImageFit;
  objectPosition?: string;
}

interface PendingCrop {
  input: StudioImageInputDefinition;
  imageSrc: string;
  width: number;
  height: number;
}

interface ThumbnailRuntimeFormProps {
  document: StudioTemplateDocument;
  initialRuntimeValues: StudioRuntimeValues;
  runtimeValues: StudioRuntimeValues;
  setRuntimeValues: React.Dispatch<React.SetStateAction<StudioRuntimeValues>>;
  runtimeImageOverrides: Record<string, ThumbnailRuntimeImageOverride>;
  setRuntimeImageOverrides: React.Dispatch<
    React.SetStateAction<Record<string, ThumbnailRuntimeImageOverride>>
  >;
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

const getImageNodeStyle = (
  document: StudioTemplateDocument,
  inputId: string,
): StudioStyleRecord | undefined => {
  const node = Object.values(document.graph.nodes).find(
    (candidate) =>
      candidate.type === "image" &&
      candidate.binding?.kind === "inputImage" &&
      candidate.binding.inputId === inputId,
  );
  return node?.styleId ? document.styles[node.styleId] : undefined;
};

const getCropSize = (
  document: StudioTemplateDocument,
  inputId: string,
): { width: number; height: number } => {
  const style = getImageNodeStyle(document, inputId);
  const width = typeof style?.width === "number" ? style.width : 400;
  const height = typeof style?.height === "number" ? style.height : 400;
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
};

const getDefaultImageOverride = (
  document: StudioTemplateDocument,
  inputId: string,
): ThumbnailRuntimeImageOverride => {
  const node = Object.values(document.graph.nodes).find(
    (candidate) =>
      candidate.type === "image" &&
      candidate.binding?.kind === "inputImage" &&
      candidate.binding.inputId === inputId,
  );
  const style = node?.styleId ? document.styles[node.styleId] : undefined;
  return {
    fit: node?.fit ?? "cover",
    objectPosition: formatStudioImageObjectPosition(
      getStudioImageObjectPosition(style),
    ),
  };
};

export function ThumbnailRuntimeForm({
  document,
  initialRuntimeValues,
  runtimeValues,
  setRuntimeValues,
  runtimeImageOverrides,
  setRuntimeImageOverrides,
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
    () => getThumbnailStudioInputGroups(document),
    [document],
  );
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);
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
          const url = URL.createObjectURL(record.blob);
          replaceObjectUrl(input.id, url);
          setRuntimeValues((current) =>
            setStudioRuntimeInputValue(document, current, input.id, url),
          );
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
    } catch (uploadError) {
      console.error("Thumbnail runtime image upload failed", uploadError);
      setError("이미지를 준비하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const resetImage = async (input: StudioImageInputDefinition) => {
    try {
      await deleteStudioRuntimeImage({
        userId: storageOwnerId,
        templateId,
        inputId: input.id,
        context: imageContext,
      });
    } catch {
      // The default value is still restored in runtime state.
    }
    replaceObjectUrl(input.id, null);
    updateValue(input, getStudioInputDefaultValue(input));
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
    setRuntimeValues(initialRuntimeValues);
    setRuntimeImageOverrides({});
    setError(null);
    onReset();
  };

  const renderImageInput = (input: StudioImageInputDefinition) => {
    const value = getStudioRuntimeInputValue(input, runtimeValues);
    const policy = getStudioImageInputPolicy(input.policy);
    const currentOverride =
      runtimeImageOverrides[input.id] ??
      getDefaultImageOverride(document, input.id);
    const position = parseStudioImageObjectPosition(
      currentOverride.objectPosition,
    );
    const cropSize = getCropSize(document, input.id);

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
            {input.presentation?.helpText ? (
              <p className="mt-1 text-[11px] font-medium text-[var(--runtime-fg-muted)]">
                {input.presentation.helpText}
              </p>
            ) : null}
          </div>
          {input.required && !value.trim() ? (
            <span className="text-[10px] font-bold text-rose-500">필수</span>
          ) : null}
        </div>

        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- Runtime image values are local blob URLs or document asset URLs.
          <img
            alt=""
            className="max-h-36 w-full rounded-xl border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] object-contain"
            src={value}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--runtime-border-strong)] px-3 py-6 text-center text-xs font-semibold text-[var(--runtime-fg-muted)]">
            이미지가 없습니다.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] text-xs font-bold hover:border-[var(--runtime-border-strong)]">
            <Upload size={14} /> 이미지 선택
            <input
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
          </label>
          <StudioRuntimeActionButton
            disabled={!value || value === getStudioInputDefaultValue(input)}
            size="compact"
            variant="secondary"
            onClick={() => void resetImage(input)}
          >
            기본값 복원
          </StudioRuntimeActionButton>
        </div>

        {policy.allowFitChange ? (
          <div className="grid gap-1.5">
            <p className="text-[11px] font-bold text-[var(--runtime-fg-muted)]">
              맞춤
            </p>
            <StudioRuntimeSegmentedControl
              ariaLabel={`${input.label} 맞춤`}
              options={[
                { id: "cover" as const, label: "채우기" },
                { id: "contain" as const, label: "맞춰 넣기" },
                { id: "fill" as const, label: "늘이기" },
              ]}
              value={currentOverride.fit ?? "cover"}
              onValueChange={(fit) =>
                setRuntimeImageOverrides((current) => ({
                  ...current,
                  [input.id]: { ...currentOverride, fit },
                }))
              }
            />
          </div>
        ) : null}

        {policy.allowFocusChange ? (
          <div className="grid gap-2 rounded-xl border border-[var(--runtime-border)] p-3">
            <p className="text-[11px] font-bold text-[var(--runtime-fg-muted)]">
              초점
            </p>
            {(["x", "y"] as const).map((axis) => (
              <label
                className="grid grid-cols-[32px_1fr_40px] items-center gap-2 text-[10px] font-bold text-[var(--runtime-fg-muted)]"
                key={axis}
              >
                <span>{axis.toUpperCase()}</span>
                <input
                  aria-label={`${input.label} ${axis} 초점`}
                  className="accent-[var(--runtime-primary)]"
                  max={100}
                  min={0}
                  type="range"
                  value={position[axis]}
                  onChange={(event) => {
                    const next = {
                      ...position,
                      [axis]: Number(event.currentTarget.value),
                    };
                    setRuntimeImageOverrides((current) => ({
                      ...current,
                      [input.id]: {
                        ...currentOverride,
                        objectPosition: formatStudioImageObjectPosition(next),
                      },
                    }));
                  }}
                />
                <span className="text-right tabular-nums">
                  {Math.round(position[axis])}%
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {policy.allowCrop && value ? (
          <StudioRuntimeActionButton
            fullWidth
            size="compact"
            variant="secondary"
            onClick={() =>
              setPendingCrop({
                input,
                imageSrc: value,
                width: cropSize.width,
                height: cropSize.height,
              })
            }
          >
            자르기 ({cropSize.width} × {cropSize.height})
          </StudioRuntimeActionButton>
        ) : null}

        {policy.recommendedAspectRatio ? (
          <p className="text-[10px] font-medium text-[var(--runtime-fg-subtle)]">
            권장 비율 {policy.recommendedAspectRatio.toFixed(3)}:1
          </p>
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
      title="내용 입력"
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
        {groups.length === 0 ? (
          <StudioRuntimeCard className="text-sm font-semibold text-[var(--runtime-fg-muted)]">
            공개된 입력 필드가 없습니다.
          </StudioRuntimeCard>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
      {pendingCrop ? (
        <StudioRuntimeImageCropModal
          imageSrc={pendingCrop.imageSrc}
          locale="ko"
          targetHeight={pendingCrop.height}
          targetWidth={pendingCrop.width}
          onApply={(blob) => {
            const input = pendingCrop.input;
            void putStudioRuntimeImage(
              {
                userId: storageOwnerId,
                templateId,
                inputId: input.id,
                context: imageContext,
              },
              blob,
            )
              .then(() => {
                const url = URL.createObjectURL(blob);
                replaceObjectUrl(input.id, url);
                updateValue(input, url);
                setPendingCrop(null);
              })
              .catch(() => setError("자른 이미지를 저장하지 못했습니다."));
          }}
          onCancel={() => setPendingCrop(null)}
        />
      ) : null}
    </StudioRuntimeFormShell>
  );
}
