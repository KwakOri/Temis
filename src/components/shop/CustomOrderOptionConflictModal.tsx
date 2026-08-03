"use client";

import { useEffect, useRef } from "react";

interface CustomOrderOptionConflictModalProps {
  requestedOptionLabel: string;
  conflictingOptionLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CustomOrderOptionConflictModal({
  requestedOptionLabel,
  conflictingOptionLabel,
  onCancel,
  onConfirm,
}: CustomOrderOptionConflictModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      previouslyFocusedElementRef.current = document.activeElement;
    }

    cancelButtonRef.current?.focus();

    return () => {
      const previouslyFocusedElement = previouslyFocusedElementRef.current;
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === "Tab") {
        const cancelEl = cancelButtonRef.current;
        const confirmEl = confirmButtonRef.current;
        if (!cancelEl || !confirmEl) return;

        if (e.shiftKey) {
          if (document.activeElement === cancelEl) {
            e.preventDefault();
            confirmEl.focus();
          }
        } else {
          if (document.activeElement === confirmEl) {
            e.preventDefault();
            cancelEl.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="option-conflict-modal-title"
        aria-describedby="option-conflict-modal-description"
        onClick={(e) => e.stopPropagation()}
        className="bg-timetable-form-bg rounded-2xl max-w-sm w-full p-6 shadow-xl"
      >
        <h2
          id="option-conflict-modal-title"
          className="text-lg font-bold text-dark-gray mb-3"
        >
          옵션 변경 확인
        </h2>
        <p
          id="option-conflict-modal-description"
          className="text-sm text-dark-gray space-y-1"
        >
          {`"${requestedOptionLabel}"를 선택하면 ${conflictingOptionLabel} 옵션은 선택할 수 없습니다.`}
          <br />
          {`"${conflictingOptionLabel}" 선택을 해제하고 변경하시겠습니까?`}
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="border border-tertiary px-4 py-2 rounded-lg hover:bg-tertiary font-medium text-dark-gray"
          >
            취소
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 font-medium"
          >
            변경하기
          </button>
        </div>
      </div>
    </div>
  );
}
