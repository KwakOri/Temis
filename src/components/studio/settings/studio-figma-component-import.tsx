"use client";

import React from "react";

import type { StudioBinding } from "@/types/template-studio";
import type {
  StudioFigmaGridCandidate,
  StudioFigmaNodeReview,
  StudioFigmaNodeReviewRole,
} from "@/types/template-studio-figma";

const ROLE_OPTIONS: Array<{ value: StudioFigmaNodeReviewRole; label: string }> = [
  { value: "main_title", label: "Main title" },
  { value: "sub_title", label: "Sub title" },
  { value: "time", label: "Time" },
  { value: "day_label", label: "Day" },
  { value: "date", label: "Date" },
  { value: "status_label", label: "Status" },
  { value: "unknown", label: "Unknown" },
  { value: "decoration", label: "Decoration" },
];

type ReviewPatch = Partial<Pick<StudioFigmaNodeReview, "suggestedRole" | "suggestedStudioType" | "suggestedBinding">>;

interface StudioFigmaComponentImportProps {
  candidates: StudioFigmaGridCandidate[];
  errorMessage: string | null;
  figmaUrl: string;
  isAnalyzing: boolean;
  isImporting: boolean;
  isRemoteSyncing: boolean;
  selectedCandidateId: string | null;
  statusMessage: string | null;
  onAnalyze: () => void;
  onBindingChange: (sourceNodeId: string) => void;
  onCancel: () => void;
  onCandidateSelect: (candidateId: string) => void;
  onReviewChange: (sourceNodeId: string, patch: ReviewPatch) => void;
  onUrlChange: (value: string) => void;
  onConfirm: () => void;
}

const bindingOption = (binding: StudioBinding) =>
  binding.kind === "builtinField" ? binding.fieldId : binding.kind;

const bindingFromOption = (value: string, current: StudioBinding): StudioBinding => {
  if (value === "staticText") {
    return current.kind === "staticText" ? current : { kind: "staticText", value: "" };
  }
  return { kind: "builtinField", fieldId: value as Extract<StudioBinding, { kind: "builtinField" }>['fieldId'] };
};

export function StudioFigmaComponentImport({
  candidates,
  errorMessage,
  figmaUrl,
  isAnalyzing,
  isImporting,
  isRemoteSyncing,
  selectedCandidateId,
  statusMessage,
  onAnalyze,
  onCancel,
  onCandidateSelect,
  onReviewChange,
  onUrlChange,
  onConfirm,
  onBindingChange,
}: StudioFigmaComponentImportProps) {
  const selectedCandidate = candidates.find(
    (candidate) => candidate.candidateId === selectedCandidateId,
  );
  const isBusy = isAnalyzing || isImporting || isRemoteSyncing;

  return (
    <section className="grid gap-3 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3" data-studio-figma-component-import>
      <div className="grid gap-1">
        <h4 className="text-xs font-bold text-[var(--fg)]">GRID Figma 컴포넌트 가져오기</h4>
        <p className="text-[10px] font-semibold leading-relaxed text-[var(--fg3)]">
          링크는 이 화면에서만 사용되며 문서에 저장되지 않습니다.
        </p>
      </div>
      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
        <span>컴포넌트 카드 링크</span>
        <input
          aria-label="컴포넌트 카드 링크"
          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-[11px] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          disabled={isBusy}
          placeholder="https://www.figma.com/design/...?...node-id=..."
          type="url"
          value={figmaUrl}
          onChange={(event) => onUrlChange(event.currentTarget.value)}
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          className="h-8 rounded-lg bg-[var(--accent)] px-3 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isBusy || !figmaUrl.trim()}
          type="button"
          onClick={onAnalyze}
        >
          {isAnalyzing ? "분석 중…" : "분석"}
        </button>
        <button
          className="h-8 rounded-lg border border-[var(--field-border)] px-3 text-[11px] font-bold text-[var(--fg2)] disabled:opacity-50"
          disabled={isBusy}
          type="button"
          onClick={onCancel}
        >
          취소
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1.5 text-[10px] font-semibold text-red-200" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1.5 text-[10px] font-semibold text-emerald-200" role="status">
          {statusMessage}
        </p>
      ) : null}

      {candidates.length > 0 ? (
        <div className="grid gap-2" data-candidate-selection>
          <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
            후보 선택
          </div>
          {candidates.map((candidate) => (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--field-border)] px-2 py-2" key={candidate.candidateId}>
              <input
                aria-label={`후보 ${candidate.label}`}
                checked={candidate.candidateId === selectedCandidateId}
                disabled={isBusy}
                name="studio-figma-candidate"
                type="radio"
                value={candidate.candidateId}
                onChange={() => onCandidateSelect(candidate.candidateId)}
              />
              <span className="grid gap-0.5">
                <span className="text-[11px] font-bold text-[var(--fg)]">{candidate.label}</span>
                <span className="text-[9px] text-[var(--fg3)]">{candidate.frame.width} × {candidate.frame.height}</span>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {selectedCandidate ? (
        <div className="grid gap-2" data-review-rows>
          {selectedCandidate.warnings.map((warning) => (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[10px] font-semibold text-amber-100" key={warning}>
              {warning}
            </p>
          ))}
          <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">텍스트 매핑 검토</div>
          {selectedCandidate.reviews.map((review) => (
            <div className="grid gap-2 rounded-lg border border-[var(--field-border)] p-2" key={review.sourceNodeId}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-bold text-[var(--fg)]">{review.label}</span>
                <span className="text-[9px] font-semibold text-[var(--fg3)]">confidence {Math.round(review.confidence * 100)}% · source {review.source}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[9px] font-semibold text-[var(--fg3)]">
                  역할
                  <select
                    className="h-7 rounded border border-[var(--field-border)] bg-[var(--field)] px-1 text-[10px] text-[var(--fg)]"
                    disabled={isBusy}
                    value={review.suggestedRole}
                    onChange={(event) => onReviewChange(review.sourceNodeId, { suggestedRole: event.currentTarget.value as StudioFigmaNodeReviewRole })}
                  >
                    {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-[9px] font-semibold text-[var(--fg3)]">
                  타입
                  <select
                    aria-label={`${review.label} text type`}
                    className="h-7 rounded border border-[var(--field-border)] bg-[var(--field)] px-1 text-[10px] text-[var(--fg)]"
                    disabled={isBusy}
                    value={review.suggestedStudioType}
                    onChange={(event) => onReviewChange(review.sourceNodeId, { suggestedStudioType: event.currentTarget.value as StudioFigmaNodeReview["suggestedStudioType"] })}
                  >
                    <option value="text">Text</option>
                    <option value="flexibleText">Auto Text</option>
                    <option value="image">Image</option>
                    <option value="shape">Shape</option>
                    <option value="group">Group</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-[9px] font-semibold text-[var(--fg3)]">
                binding
                <select
                  className="h-7 rounded border border-[var(--field-border)] bg-[var(--field)] px-1 text-[10px] text-[var(--fg)]"
                  disabled={isBusy}
                  value={bindingOption(review.suggestedBinding)}
                  onChange={(event) => {
                    onBindingChange(review.sourceNodeId);
                    onReviewChange(review.sourceNodeId, { suggestedBinding: bindingFromOption(event.currentTarget.value, review.suggestedBinding) });
                  }}
                >
                  <option value="staticText">staticText</option>
                  <option value="entry.main_title">entry.main_title</option>
                  <option value="entry.sub_title">entry.sub_title</option>
                  <option value="entry.time">entry.time</option>
                  <option value="day.short_label">day.short_label</option>
                  <option value="day.date">day.date</option>
                  <option value="entry.status_label">entry.status_label</option>
                </select>
                <span className="text-[9px] font-normal">{review.reason}</span>
              </label>
            </div>
          ))}
          <button
            className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isBusy || !selectedCandidateId}
            type="button"
            onClick={onConfirm}
          >
            {isImporting ? "추가 중…" : "새 컴포넌트 세트로 추가"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export type { ReviewPatch };
