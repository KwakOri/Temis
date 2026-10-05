"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { StudioTemplateDocument } from "@/types/template-studio";
import {
  getThumbnailUserImages,
  putThumbnailUserImages,
} from "@/services/browser/thumbnailUserImagesStorage";
import {
  isThumbnailUserImagesInput,
  type ThumbnailAddonImage,
} from "@/utils/thumbnail-studio/user-images";
import type { StudioRuntimeImageOverrides } from "@/utils/thumbnail-studio/runtime-image-transform";

export function useThumbnailUserImages(
  document: StudioTemplateDocument,
  ownerId: string,
  templateId: string,
  overrides: StudioRuntimeImageOverrides,
  setOverrides: Dispatch<SetStateAction<StudioRuntimeImageOverrides>>,
) {
  const [images, setImages] = useState<ThumbnailAddonImage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const canSave = useRef(false);
  const urls = useRef(new Set<string>());
  const writeQueue = useRef(Promise.resolve());
  const pendingSave = useRef<(() => void) | null>(null);
  useEffect(() => {
    let cancelled = false;
    pendingSave.current?.();
    setLoaded(false);
    canSave.current = false;
    setImages([]);
    if (!Object.values(document.inputs).some(isThumbnailUserImagesInput)) {
      setLoaded(true);
      return;
    }
    void getThumbnailUserImages(ownerId, templateId)
      .then((record) => {
        if (cancelled) return;
        const restored = (record?.images ?? [])
          .filter((image) =>
            isThumbnailUserImagesInput(
              document.inputs[image.inputId] ?? { type: "" },
            ),
          )
          .map((image, index) => {
            const src = URL.createObjectURL(image.blob);
            urls.current.add(src);
            return { ...image, name: image.name || `이미지 ${index + 1}`, src };
          });
        setImages(restored);
        if (record)
          setOverrides((current) => ({ ...current, ...record.overrides }));
        canSave.current = true;
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true);
          setStorageError(
            "저장된 이미지를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [document, ownerId, templateId, setOverrides]);
  useEffect(() => {
    if (!loaded || !canSave.current) return;
    // Background blobs use the existing image store; this record owns addon blobs and all placements.
    const value = {
      images: images.map((image) => ({
        id: image.id,
        inputId: image.inputId,
        name: image.name,
        blob: image.blob,
        intrinsicSize: image.intrinsicSize,
      })),
      overrides,
    };
    const save = () => {
      pendingSave.current = null;
      writeQueue.current = writeQueue.current
        .catch(() => undefined)
        .then(() => putThumbnailUserImages(ownerId, templateId, value))
        .then(() => setStorageError(null))
        .catch(() =>
          setStorageError(
            "이미지 변경사항을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.",
          ),
        );
    };
    pendingSave.current = save;
    const timer = window.setTimeout(save, 200);
    return () => window.clearTimeout(timer);
  }, [images, overrides, loaded, ownerId, templateId]);
  useEffect(() => {
    images.forEach((image) => urls.current.add(image.src));
    for (const url of urls.current) {
      if (!images.some((image) => image.src === url)) {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }
    }
  }, [images]);
  useEffect(() => {
    const objectUrls = urls.current;
    const flush = () => pendingSave.current?.();
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  return { images, setImages, loaded, storageError };
}
