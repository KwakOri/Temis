"use client";

import type { StudioTemplateInfoInput } from "@/services/admin/studioTemplateInfoService";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

export function TemplateStudioTemplateInfoDialog({
  template,
  isSubmitting,
  error,
  restoreFocusElement,
  onClose,
  onSubmit,
  details,
  onSubmitInfo,
}: {
  template: { id: string; name: string | null } | null;
  isSubmitting: boolean;
  error: string | null;
  restoreFocusElement?: HTMLElement | null;
  onClose: () => void;
  onSubmit?: (name: string) => void;
  details?: {
    isPublic: boolean;
    thumbnailUrl: string | null;
    studioPreviewUrl: string | null;
  };
  onSubmitInfo?: (input: StudioTemplateInfoInput) => void;
}) {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!template) {
      setCoverFile(null);
      return;
    }

    restoreFocusRef.current =
      restoreFocusElement ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setName(template.name ?? "");
    setIsPublic(details?.isPublic ?? false);
    setCoverFile(null);
    setRemoveCover(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setValidationError(null);

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [restoreFocusElement, template, details?.isPublic]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  if (!template) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setValidationError("템플릿 이름을 입력해 주세요.");
      inputRef.current?.focus();
      return;
    }

    setValidationError(null);
    if (details && onSubmitInfo) {
      onSubmitInfo({ name: normalizedName, isPublic, coverFile, removeCover });
    } else onSubmit?.(normalizedName);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isSubmitting) onClose();
      return;
    }

    if (event.key !== "Tab") return;
    if (isSubmitting) {
      event.preventDefault();
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ) ?? [],
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const displayedError = validationError ?? error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        aria-describedby="template-studio-template-info-description"
        aria-labelledby="template-studio-template-info-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        role="dialog"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-lg font-semibold text-gray-900"
              id="template-studio-template-info-title"
            >
              정보 수정
            </h2>
            <p
              className="mt-1 text-sm text-gray-500"
              id="template-studio-template-info-description"
            >
              {details
                ? "템플릿 이름, 대표 이미지와 종류를 수정합니다."
                : "목록에 표시되는 템플릿 이름을 수정합니다."}
            </p>
          </div>
          <button
            aria-label="정보 수정 닫기"
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-5 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label
              className="text-sm font-semibold text-gray-700"
              htmlFor="template-studio-template-name"
            >
              템플릿 이름 <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              aria-invalid={Boolean(displayedError)}
              className="h-11 rounded-md border border-gray-300 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              disabled={isSubmitting}
              id="template-studio-template-name"
              required
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value);
                setValidationError(null);
              }}
            />
          </div>

          {details ? (
            <>
              <fieldset disabled={isSubmitting} className="grid gap-2">
                <legend className="mb-2 text-sm font-semibold text-gray-700">
                  템플릿 종류
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: false, label: "개인 템플릿" },
                      { value: true, label: "일반 템플릿" },
                    ] as const
                  ).map(({ value, label }) => (
                    <label
                      key={label}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 p-3 text-sm text-gray-700 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                    >
                      <input
                        type="radio"
                        name="template-sales-type"
                        value={value ? "general" : "custom"}
                        checked={isPublic === value}
                        onChange={() => setIsPublic(value)}
                        className="accent-blue-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={isSubmitting} className="grid gap-3">
                <legend className="mb-2 text-sm font-semibold text-gray-700">
                  대표 이미지
                </legend>
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {coverPreviewUrl ||
                  (!removeCover && details.thumbnailUrl) ||
                  details.studioPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Preview selected file or stored catalog image.
                    <img
                      src={
                        coverPreviewUrl ||
                        (!removeCover ? details.thumbnailUrl : null) ||
                        details.studioPreviewUrl ||
                        ""
                      }
                      alt="대표 이미지 미리보기"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageIcon
                      className="h-8 w-8 text-gray-300"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <label className="grid gap-2 text-sm text-gray-700">
                  대표 이미지 파일
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="w-full min-w-0 rounded-md border border-gray-300 p-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-blue-700"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (!file) return;
                      if (
                        !["image/png", "image/jpeg", "image/webp"].includes(
                          file.type,
                        ) ||
                        file.size <= 0 ||
                        file.size > 10 * 1000 * 1000
                      ) {
                        setValidationError(
                          "대표 이미지는 PNG, JPEG, WebP 형식의 10MB 이하 파일만 업로드할 수 있습니다.",
                        );
                        event.currentTarget.value = "";
                        return;
                      }
                      setCoverFile(file);
                      setRemoveCover(false);
                      setValidationError(null);
                    }}
                  />
                </label>
                <p className="text-xs text-gray-500">
                  PNG, JPEG, WebP · 최대 10MB. 대표 이미지가 없으면 기존
                  미리보기를 사용합니다.
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  {coverFile ? (
                    <button
                      type="button"
                      className="font-medium text-gray-600 hover:underline"
                      onClick={() => {
                        setCoverFile(null);
                        setValidationError(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      파일 선택 취소
                    </button>
                  ) : null}
                  {details.thumbnailUrl && !removeCover ? (
                    <button
                      type="button"
                      className="font-medium text-red-600 hover:underline"
                      onClick={() => {
                        setCoverFile(null);
                        setRemoveCover(true);
                        setValidationError(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      대표 이미지 제거
                    </button>
                  ) : null}
                  {removeCover ? (
                    <>
                      <span className="text-gray-500">
                        저장하면 대표 이미지가 제거됩니다.
                      </span>
                      <button
                        type="button"
                        className="font-medium text-gray-600 hover:underline"
                        onClick={() => setRemoveCover(false)}
                      >
                        제거 취소
                      </button>
                    </>
                  ) : null}
                </div>
              </fieldset>
            </>
          ) : null}
          {displayedError ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {displayedError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              className="inline-flex h-10 items-center rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="button"
              onClick={onClose}
            >
              취소
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
