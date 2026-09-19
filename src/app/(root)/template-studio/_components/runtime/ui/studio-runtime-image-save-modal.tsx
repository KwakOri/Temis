"use client";

import { ImageDown, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  getStudioRuntimeCopy,
  type StudioRuntimeLocale,
} from "@/utils/template-studio/runtime-i18n";
import { StudioRuntimeActionButton } from "./studio-runtime-action-button";

export interface StudioRuntimeImageSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (width: number, height: number) => Promise<void>;
  templateSize: { width: number; height: number };
  locale: StudioRuntimeLocale;
}

interface ImageSizeOption {
  width: number;
  height: number;
  label: string;
  key: string;
}

const getOriginalOption = (options: ImageSizeOption[]) =>
  options.find((option) => option.key === "original") ?? options[0];

const StudioRuntimeImageSaveModal: React.FC<
  StudioRuntimeImageSaveModalProps
> = ({ isOpen, onClose, onSave, templateSize, locale }) => {
  const copy = getStudioRuntimeCopy(locale);
  const originalWidth = Math.max(1, Math.round(templateSize.width));
  const originalHeight = Math.max(1, Math.round(templateSize.height));

  const sizeOptions = useMemo((): ImageSizeOption[] => {
    const aspectRatio = originalWidth / originalHeight;
    const options: ImageSizeOption[] = [];
    const presets = [
      { height: 720, label: copy.imageSizeHd, key: "720" },
      { height: 1080, label: copy.imageSizeFullHd, key: "1080" },
      { height: 2160, label: copy.imageSize4k, key: "2160" },
    ];

    presets.forEach(({ height, label, key }) => {
      if (originalHeight <= height) return;
      options.push({
        width: Math.max(1, Math.round(height * aspectRatio)),
        height,
        label,
        key,
      });
    });

    if (
      !options.some(
        (option) =>
          option.width === originalWidth && option.height === originalHeight,
      )
    ) {
      options.push({
        width: originalWidth,
        height: originalHeight,
        label: copy.imageSizeOriginal,
        key: "original",
      });
    }

    return options.length > 0
      ? options
      : [
          {
            width: originalWidth,
            height: originalHeight,
            label: copy.imageSizeOriginal,
            key: "original",
          },
        ];
  }, [copy, originalHeight, originalWidth]);

  const [selectedOption, setSelectedOption] = useState<ImageSizeOption>(() =>
    getOriginalOption(sizeOptions),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedOption(getOriginalOption(sizeOptions));
    setIsSaving(false);
  }, [isOpen, sizeOptions]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSave(selectedOption.width, selectedOption.height);
      onClose();
    } catch (error) {
      console.error("Template Studio image save failed", error);
      window.alert(copy.saveImageFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  return (
    <div
      aria-hidden={!isOpen}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        aria-describedby="studio-runtime-image-save-description"
        aria-labelledby="studio-runtime-image-save-title"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--runtime-border-strong)] bg-[var(--runtime-form-bg)] text-[var(--runtime-fg)] shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--runtime-border)] px-5 py-4 sm:px-6">
          <h2
            className="text-xl font-black tracking-[-0.04em]"
            id="studio-runtime-image-save-title"
          >
            {copy.imageSaveTitle}
          </h2>
          <button
            aria-label={copy.cancel}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--runtime-fg-muted)] transition hover:bg-[var(--runtime-input-hover)] hover:text-[var(--runtime-fg)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving}
            type="button"
            onClick={handleClose}
          >
            <X size={24} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <section className="grid gap-2">
            <div className="flex items-center gap-2 text-[var(--runtime-primary-hover)]">
              <ImageDown size={24} strokeWidth={2.5} />
              <h3 className="text-base font-bold">
                {copy.imageSaveSectionTitle}
              </h3>
            </div>
            <p
              className="text-sm font-medium leading-relaxed text-[var(--runtime-fg-muted)]"
              id="studio-runtime-image-save-description"
            >
              {copy.imageSaveDescription}
            </p>
          </section>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sizeOptions.map((option) => {
              const isSelected = selectedOption.key === option.key;
              return (
                <button
                  aria-pressed={isSelected}
                  className={`w-full rounded-xl border-2 p-4 text-left transition ${
                    isSelected
                      ? "border-[var(--runtime-primary)] bg-[var(--runtime-primary-soft)] text-[var(--runtime-primary-hover)]"
                      : "border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] text-[var(--runtime-fg)] hover:border-[var(--runtime-border-strong)]"
                  }`}
                  disabled={isSaving}
                  key={`${option.key}-${option.width}x${option.height}`}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                >
                  <span className="block text-lg font-black tracking-[-0.04em]">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[var(--runtime-fg-muted)]">
                    {option.width}×{option.height}px
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-2 rounded-xl border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--runtime-fg-muted)]">
                {copy.selectedImageSize}
              </span>
              <span className="font-bold">{selectedOption.label}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--runtime-fg-muted)]">
                {copy.imageResolution}
              </span>
              <span className="font-bold">
                {selectedOption.width}×{selectedOption.height}px
              </span>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] p-5 sm:p-6">
          <StudioRuntimeActionButton
            disabled={isSaving}
            variant="secondary"
            onClick={handleClose}
          >
            {copy.cancel}
          </StudioRuntimeActionButton>
          <StudioRuntimeActionButton disabled={isSaving} onClick={handleSave}>
            {isSaving ? copy.savingImage : copy.saveImageAction}
          </StudioRuntimeActionButton>
        </footer>
      </div>
    </div>
  );
};

export default StudioRuntimeImageSaveModal;
