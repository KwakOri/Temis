"use client";

import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { StudioRuntimeActionButton } from "@/components/studio/runtime/ui/studio-runtime-action-button";
import { ThumbnailImageActionsMenu } from "./thumbnail-image-actions-menu";

interface Props {
  value: string;
  isAdjusting: boolean;
  canAdjust: boolean;
  allowReplace: boolean;
  allowReset: boolean;
  required: boolean;
  onUpload: (file: File) => void;
  onAdjust: () => void;
  onReset: () => void;
  onRemove: () => void;
}

export function ThumbnailBackgroundImageRow({
  value,
  isAdjusting,
  canAdjust,
  allowReplace,
  allowReset,
  required,
  onUpload,
  onAdjust,
  onReset,
  onRemove,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const selectImage = () => fileInput.current?.click();
  return (
    <div className="grid gap-2" data-thumbnail-background-row>
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--runtime-border)] p-2">
        <StudioRuntimeActionButton
          variant="secondary"
          className="size-10 shrink-0 overflow-hidden rounded-lg bg-[var(--runtime-input-bg)] p-0"
          aria-label={value ? "배경 이미지 변경" : "배경 이미지 파일 선택"}
          title={value ? "배경 이미지 변경" : "배경 이미지 선택"}
          disabled={!allowReplace}
          onClick={selectImage}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- Browser-local image preview.
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <Upload size={16} aria-hidden="true" />
          )}
        </StudioRuntimeActionButton>
        <StudioRuntimeActionButton
          fullWidth
          variant={isAdjusting ? "primary" : "secondary"}
          aria-label={
            !value
              ? "배경 이미지 선택"
              : isAdjusting
                ? "배경 이미지 변경 완료"
                : "배경 이미지 위치 조정"
          }
          disabled={value ? !canAdjust : !allowReplace}
          onClick={value ? onAdjust : selectImage}
        >
          {!value ? "이미지 선택" : isAdjusting ? "변경 완료" : "위치 조정"}
        </StudioRuntimeActionButton>
        {value ? (
          <ThumbnailImageActionsMenu
            name="배경 이미지"
            allowReset={allowReset}
            allowRemove={allowReplace}
            onReset={onReset}
            onRemove={onRemove}
          />
        ) : null}
      </div>
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={!allowReplace}
        aria-label="배경 이미지 파일"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onUpload(file);
        }}
      />
      {required && !value.trim() ? (
        <span className="text-[10px] font-bold text-rose-500">필수</span>
      ) : null}
    </div>
  );
}
