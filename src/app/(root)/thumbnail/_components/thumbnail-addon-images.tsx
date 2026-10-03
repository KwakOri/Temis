"use client";

import React, { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Plus } from "lucide-react";
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

import { ThumbnailAddonImageRow } from "./thumbnail-addon-image-row";
import { useThumbnailAddonReorder } from "./use-thumbnail-addon-reorder";

interface Props {
  input: StudioImageInputDefinition;
  document: StudioTemplateDocument;
  images: ThumbnailAddonImage[];
  setImages: Dispatch<SetStateAction<ThumbnailAddonImage[]>>;
  setOverrides: Dispatch<SetStateAction<StudioRuntimeImageOverrides>>;
  activeImage?: { inputId: string; nodeId: string } | null;
  onAdjustImage?: (target: { inputId: string; nodeId: string } | null) => void;
  onImageAssetsChange?: () => void;
  changeImagePlacement?: (
    action: (
      current: StudioRuntimeImageOverrides,
    ) => StudioRuntimeImageOverrides,
  ) => void;
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
  onImageAssetsChange,
  changeImagePlacement,
  loaded,
  children,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { draggingId, startReorder } = useThumbnailAddonReorder(
    listRef,
    setImages,
  );
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
      onImageAssetsChange?.();
      setImages((current) => [
        ...current,
        {
          id,
          inputId: input.id,
          name: file.name.slice(0, 100),
          src,
          blob,
          intrinsicSize,
        },
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
    onImageAssetsChange?.();
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
      <div ref={listRef} className="grid gap-2" aria-label="이미지 레이어 목록">
        {[...siblings].reverse().map((image, panelIndex) => (
          <ThumbnailAddonImageRow
            key={image.id}
            image={image}
            name={image.name || `이미지 ${siblings.length - panelIndex}`}
            imageNodes={imageNodes}
            activeImage={activeImage}
            dragging={draggingId === image.id}
            onRename={(name) =>
              setImages((current) =>
                current.map((item) =>
                  item.id === image.id ? { ...item, name } : item,
                ),
              )
            }
            onReorderStart={(event) => startReorder(event, image.id)}
            onMove={(delta) =>
              setImages((current) =>
                moveThumbnailAddonImage(current, image.id, delta),
              )
            }
            onAdjustImage={onAdjustImage}
            onReset={() =>
              (changeImagePlacement ?? setOverrides)((current) => ({
                ...current,
                [image.id]: {
                  placementMode: "manual",
                  intrinsicSize: image.intrinsicSize,
                },
              }))
            }
            onRemove={() => remove(image.id)}
          />
        ))}
      </div>
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
