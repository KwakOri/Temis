"use client";

import type { TemplateStudioTemplateRecord } from "@/services/server/templateStudioPersistenceService";
import { Loader2, X } from "lucide-react";
import {
  useEffect,
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
}: {
  template: TemplateStudioTemplateRecord | null;
  isSubmitting: boolean;
  error: string | null;
  restoreFocusElement?: HTMLElement | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!template) return;

    restoreFocusRef.current =
      restoreFocusElement ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setName(template.name);
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
  }, [restoreFocusElement, template]);

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
    onSubmit(normalizedName);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isSubmitting) onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
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
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
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
              Thumbnail Studio 목록과 상품에 표시되는 이름을 수정합니다.
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
            {displayedError ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {displayedError}
              </p>
            ) : null}
          </div>

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
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
