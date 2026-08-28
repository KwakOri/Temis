"use client";

import React from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type {
  StudioPersistenceOperation,
  StudioPersistenceOperationState,
  StudioPersistenceStage,
} from "@/hooks/studio/use-studio-template-persistence";

export interface StudioOperationToast {
  tone: "success" | "error";
  message: string;
}

const operationLabel: Record<StudioPersistenceOperation, string> = {
  save_draft: "초안 저장",
  publish: "템플릿 발행",
  preview: "미리보기 준비",
};

const stageLabel: Record<StudioPersistenceStage, string> = {
  validating: "문서와 입력값을 확인하는 중…",
  creating: "원격 템플릿을 준비하는 중…",
  "syncing-assets": "이미지 리소스를 동기화하는 중…",
  saving: "변경사항을 저장하는 중…",
  publishing: "새 revision을 발행하는 중…",
  previewing: "미리보기를 여는 중…",
};

interface StudioOperationFeedbackProps {
  operation: StudioPersistenceOperationState | null;
  toast: StudioOperationToast | null;
  onDismissToast: () => void;
}

/** 저장·발행·미리보기의 진행과 결과를 공통 overlay로 표시한다. */
export function StudioOperationFeedback({
  operation,
  toast,
  onDismissToast,
}: StudioOperationFeedbackProps) {
  return (
    <>
      {operation ? (
        <div
          aria-label={`${operationLabel[operation.operation]} 진행 중`}
          aria-live="polite"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
          role="dialog"
        >
          <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl border border-[var(--field-border)] bg-[var(--panel)] px-4 py-4 shadow-2xl">
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 shrink-0 animate-spin text-[var(--accent)]"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--fg)]">
                {operationLabel[operation.operation]}
              </p>
              <p className="mt-1 text-xs text-[var(--fg2)]">
                {stageLabel[operation.stage]}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
          className={`fixed bottom-4 right-4 z-[90] flex max-w-[min(24rem,calc(100vw-2rem))] items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold shadow-xl ${
            toast.tone === "error"
              ? "border-rose-400/40 bg-rose-950/95 text-rose-100"
              : "border-emerald-400/40 bg-emerald-950/95 text-emerald-100"
          }`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.tone === "error" ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1 break-words">{toast.message}</span>
          <button
            aria-label="알림 닫기"
            className="shrink-0 rounded px-1 text-current/70 hover:bg-white/10 hover:text-current"
            type="button"
            onClick={onDismissToast}
          >
            닫기
          </button>
        </div>
      ) : null}
    </>
  );
}
