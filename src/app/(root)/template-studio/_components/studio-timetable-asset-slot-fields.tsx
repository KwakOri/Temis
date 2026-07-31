"use client";

import { Plus, Upload } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import type {
  StudioAsset,
  StudioImageFit,
  StudioInputDefinition,
} from "@/types/template-studio";

export type StudioAssetSlotSource = "asset" | "input";

export interface StudioTimetableAssetSlotFieldsProps {
  /** 이 자리의 이름. 예: `Background Asset` */
  label: string;
  /** 지금 고른 템플릿 에셋. */
  assetId?: string | null;
  /** 지금 묶인 사용자 이미지 입력. */
  inputId?: string | null;
  fit?: StudioImageFit;
  defaultFit?: StudioImageFit;
  /**
   * 출처를 고정한다.
   *
   * 고정하면 출처 선택을 감춘다. 프리셋이 출처를 정해 둔 자리에 쓴다.
   */
  sourceLocked?: StudioAssetSlotSource;
  /** 고를 수 있는 템플릿 에셋 목록. */
  assets: StudioAsset[];
  /** 묶인 입력. 없거나 이미지 입력이 아니면 끊어진 것으로 본다. */
  boundInput: StudioInputDefinition | null;
  /** 고른 에셋이 문서에 있는지. 없으면 끊어진 것으로 보여준다. */
  hasAsset: boolean;
  /** 사용자 입력으로 바꿀 수 있는 자리인지. 없으면 출처 선택을 감춘다. */
  canUseInput: boolean;
  onSelectAsset: (assetId: string | null) => void;
  onSelectFit: (fit: StudioImageFit) => void;
  /** 사용자 이미지 입력을 만들어 이 자리에 묶는다. */
  onUseInputSource: () => void;
  onUploadFile: (file: File) => void;
  /** 묶인 입력의 편집 UI. 입력 패널과 같은 것을 쓰도록 받아서 놓는다. */
  renderInputSourceSlot: (input: StudioInputDefinition) => React.ReactNode;
}

/**
 * 시간표 객체의 이미지 자리 편집.
 *
 * 한 자리는 템플릿 에셋이나 사용자 이미지 입력 중 하나를 출처로 쓴다. 출처를
 * 정하지 않으면 묶인 입력이 있는지로 판단한다.
 *
 * Fit은 출처가 있을 때만 바꿀 수 있다. 출처가 없는 상태에서 Fit만 저장하면
 * 문서에 쓰이지 않는 값이 남는다.
 */
export function StudioTimetableAssetSlotFields({
  label,
  assetId,
  inputId,
  fit,
  defaultFit = "cover",
  sourceLocked,
  assets,
  boundInput,
  hasAsset,
  canUseInput,
  onSelectAsset,
  onSelectFit,
  onUseInputSource,
  onUploadFile,
  renderInputSourceSlot,
}: StudioTimetableAssetSlotFieldsProps) {
  const source: StudioAssetSlotSource =
    sourceLocked ?? (inputId ? "input" : "asset");
  const hasMissingAsset = Boolean(assetId && !hasAsset);
  const hasMissingInput = Boolean(
    inputId && (!boundInput || boundInput.type !== "image"),
  );
  const hasSource = Boolean(assetId || inputId);

  return (
    <>
      {canUseInput && !sourceLocked ? (
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>{label} Source</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            value={source}
            onChange={(event) => {
              if (event.currentTarget.value === "input") {
                onUseInputSource();
                return;
              }

              onSelectAsset(assetId ?? null);
            }}
          >
            <option value="asset">Template Asset</option>
            <option value="input">User Input</option>
          </select>
        </label>
      ) : null}
      {source === "asset" ? (
        <div className="grid gap-2">
          <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>{label}</span>
            <select
              className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
              disabled={assets.length === 0 && !assetId}
              value={assetId ?? ""}
              onChange={(event) =>
                onSelectAsset(event.currentTarget.value || null)
              }
            >
              <option value="">None</option>
              {hasMissingAsset ? (
                <option value={assetId ?? ""}>Missing asset</option>
              ) : null}
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]">
            <Upload size={13} />
            Upload Asset
            <input
              accept="image/*"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                // 같은 파일을 다시 골라도 변경으로 잡히게 값을 비운다.
                event.currentTarget.value = "";
                if (!file) return;
                onUploadFile(file);
              }}
            />
          </label>
        </div>
      ) : boundInput && boundInput.type === "image" ? (
        renderInputSourceSlot(boundInput)
      ) : hasMissingInput ? (
        <div className="rounded-md border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
          Missing image input: {inputId}
        </div>
      ) : source === "input" && canUseInput ? (
        <button
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
          type="button"
          onClick={onUseInputSource}
        >
          <Plus size={12} />
          Create user image input
        </button>
      ) : null}
      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
        <span>Fit</span>
        <select
          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
          disabled={!hasSource}
          value={fit ?? defaultFit}
          onChange={(event) =>
            onSelectFit(event.currentTarget.value as StudioImageFit)
          }
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </label>
    </>
  );
}
