"use client";

import React, { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import type {
  StudioImageInputDefinition,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { StudioRuntimeActionButton } from "@/components/studio/runtime/ui/studio-runtime-action-button";
import {
  convertStudioRuntimeImageFileToPngBlob,
  getStudioRuntimeImageBlobSize,
} from "@/utils/template-studio/runtime-image-blob";
import {
  ALLOWED_RUNTIME_IMAGE_SOURCE_MIME_TYPES,
  MAX_RUNTIME_IMAGE_SOURCE_BYTES,
} from "@/utils/template-studio/runtime-image-storage-constants";
import {
  getThumbnailRuntimeImageNodes,
  type StudioRuntimeImageOverrides,
} from "@/utils/thumbnail-studio/runtime-image-transform";
import {
  moveThumbnailAddonImage,
  type ThumbnailAddonImage,
} from "@/utils/thumbnail-studio/user-images";

interface Props {
  input: StudioImageInputDefinition;
  document: StudioTemplateDocument;
  images: ThumbnailAddonImage[];
  setImages: Dispatch<SetStateAction<ThumbnailAddonImage[]>>;
  setOverrides: Dispatch<SetStateAction<StudioRuntimeImageOverrides>>;
  activeImage?: { inputId: string; nodeId: string } | null;
  onAdjustImage?: (target: { inputId: string; nodeId: string } | null) => void;
  onScaleImage?: (factor: number) => void;
  loaded: boolean;
  children: React.ReactNode;
}

export function ThumbnailAddonImages({
  input,
  document,
  images,
  setImages,
  setOverrides,
  activeImage,
  onAdjustImage,
  onScaleImage,
  loaded,
  children,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const siblings = images.filter((image) => image.inputId === input.id);
  const imageNodes = getThumbnailRuntimeImageNodes(document, input.id);
  const upload = async (file: File) => {
    setError(null);
    if (
      !ALLOWED_RUNTIME_IMAGE_SOURCE_MIME_TYPES.has(file.type) ||
      file.size > MAX_RUNTIME_IMAGE_SOURCE_BYTES
    ) {
      setError("20MB 이하의 PNG, JPEG, WebP 또는 GIF 이미지를 선택해 주세요.");
      return;
    }
    setUploading(true);
    try {
      const blob = await convertStudioRuntimeImageFileToPngBlob(file);
      const intrinsicSize = await getStudioRuntimeImageBlobSize(blob);
      const id = `addon_${crypto.randomUUID()}`;
      const src = URL.createObjectURL(blob);
      setImages((current) => [
        ...current,
        { id, inputId: input.id, src, blob, intrinsicSize },
      ]);
      setOverrides((current) => ({
        ...current,
        [id]: { placementMode: "manual", intrinsicSize },
      }));
    } catch {
      setError("이미지를 추가하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
    }
  };
  const remove = (id: string) => {
    if (activeImage?.inputId === id) onAdjustImage?.(null);
    setImages((current) => current.filter((image) => image.id !== id));
    setOverrides((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  return (
    <div className="grid gap-4" data-thumbnail-user-images={input.id}>
      <StudioRuntimeActionButton
        fullWidth
        variant="secondary"
        aria-label={`${input.label} 이미지 추가`}
        disabled={!loaded || uploading || !imageNodes.length}
        onClick={() => fileInput.current?.click()}
      >
        <Plus size={20} /> {uploading ? "이미지 추가 중…" : "이미지 추가"}
      </StudioRuntimeActionButton>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
      />
      {[...siblings].reverse().map((image, panelIndex) => (
        <div
          key={image.id}
          className="grid gap-2 rounded-xl border border-[var(--runtime-border)] p-3"
          data-thumbnail-addon={image.id}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold">
              애드온 이미지 {siblings.length - panelIndex}
            </p>
            <div className="flex gap-1">
              <StudioRuntimeActionButton
                variant="secondary"
                size="icon"
                aria-label="애드온 이미지 앞으로"
                disabled={panelIndex === 0}
                onClick={() =>
                  setImages((current) =>
                    moveThumbnailAddonImage(current, image.id, 1),
                  )
                }
              >
                <ArrowUp size={14} />
              </StudioRuntimeActionButton>
              <StudioRuntimeActionButton
                variant="secondary"
                size="icon"
                aria-label="애드온 이미지 뒤로"
                disabled={panelIndex === siblings.length - 1}
                onClick={() =>
                  setImages((current) =>
                    moveThumbnailAddonImage(current, image.id, -1),
                  )
                }
              >
                <ArrowDown size={14} />
              </StudioRuntimeActionButton>
              <StudioRuntimeActionButton
                variant="secondary"
                size="icon"
                aria-label="애드온 이미지 제거"
                onClick={() => remove(image.id)}
              >
                <Trash2 size={14} />
              </StudioRuntimeActionButton>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Browser-local image preview. */}
          <img
            src={image.src}
            alt="애드온 이미지"
            className="h-28 w-full rounded-lg bg-[var(--runtime-input-bg)] object-contain"
          />
          <div className="flex gap-2">
            <StudioRuntimeActionButton
              fullWidth
              variant={
                activeImage?.inputId === image.id ? "primary" : "secondary"
              }
              aria-label={
                activeImage?.inputId === image.id
                  ? "애드온 이미지 변경 완료"
                  : "애드온 이미지 직접 배치"
              }
              onClick={() =>
                onAdjustImage?.(
                  activeImage?.inputId === image.id
                    ? null
                    : {
                        inputId: image.id,
                        nodeId: `${imageNodes[0].id}:${image.id}`,
                      },
                )
              }
            >
              {activeImage?.inputId === image.id ? "변경 완료" : "직접 배치"}
            </StudioRuntimeActionButton>
            <StudioRuntimeActionButton
              variant="secondary"
              size="icon"
              aria-label="애드온 이미지 배치 재설정"
              onClick={() =>
                setOverrides((current) => ({
                  ...current,
                  [image.id]: {
                    placementMode: "manual",
                    intrinsicSize: image.intrinsicSize,
                  },
                }))
              }
            >
              <RotateCcw size={14} />
            </StudioRuntimeActionButton>
          </div>
          {activeImage?.inputId === image.id ? (
            <div className="grid gap-2">
              {imageNodes.length > 1 ? (
                <select
                  aria-label="애드온 이미지 조정할 레이어"
                  value={activeImage.nodeId}
                  className="rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] p-2 text-xs"
                  onChange={(event) =>
                    onAdjustImage?.({
                      inputId: image.id,
                      nodeId: event.currentTarget.value,
                    })
                  }
                >
                  {imageNodes.map((node) => (
                    <option key={node.id} value={`${node.id}:${image.id}`}>
                      {node.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <StudioRuntimeActionButton
                  size="compact"
                  variant="secondary"
                  onClick={() => onScaleImage?.(0.9)}
                >
                  작게 −
                </StudioRuntimeActionButton>
                <StudioRuntimeActionButton
                  size="compact"
                  variant="secondary"
                  onClick={() => onScaleImage?.(1.1)}
                >
                  크게 +
                </StudioRuntimeActionButton>
              </div>
            </div>
          ) : null}
        </div>
      ))}
      <div className="grid gap-2" data-thumbnail-background>
        <p className="text-xs font-black text-[var(--runtime-fg-muted)]">
          배경 이미지
        </p>
        {children}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
