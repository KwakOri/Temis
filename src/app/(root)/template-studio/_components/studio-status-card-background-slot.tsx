"use client";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";
import type {
  StudioAsset,
  StudioImageFit,
  StudioTimetableAssetSlot,
} from "@/types/template-studio";
import { StudioTimetableAssetSlotFields } from "./studio-timetable-asset-slot-fields";

export interface StudioStatusCardBackgroundSlotProps {
  /** 지금 편집 중인 상태의 이름. 예: `Online` */
  statusLabel: string;
  /** 이 상태에 붙은 배경 자리. 아직 없으면 비운다. */
  slot: StudioTimetableAssetSlot | null | undefined;
  assets: StudioAsset[];
  /** 고른 에셋이 문서에 있는지. 없으면 끊어진 것으로 보여준다. */
  hasAsset: boolean;
  onSelectAsset: (assetId: string | null, fit: StudioImageFit) => void;
  onSelectFit: (fit: StudioImageFit) => void;
  onUploadFile: (file: File) => void;
}

/**
 * 상태별 카드 배경 자리 편집.
 *
 * 카드는 상태마다 배경이 다르다. 그래서 지금 어느 상태를 편집하는 중인지 자리
 * 위에 적어 둔다. 그 표시가 없으면 온라인 배경을 고치려다 오프라인 배경을 바꾼다.
 *
 * 자리 편집 자체는 시간표 이미지 자리와 같은 규칙이므로 공통 칸을 쓴다. 예전에는
 * 같은 칸을 각각 그렸고, 그래서 한쪽만 고쳐지는 일이 있었다. 다만 카드 배경은
 * 사용자 입력을 출처로 쓸 수 없다. 사용자가 바꿀 수 있는 것은 일정 내용이고,
 * 배경은 템플릿이 정한다.
 */
export function StudioStatusCardBackgroundSlot({
  statusLabel,
  slot,
  assets,
  hasAsset,
  onSelectAsset,
  onSelectFit,
  onUploadFile,
}: StudioStatusCardBackgroundSlotProps) {
  const assetId = slot?.assetId ?? "";
  const fit = slot?.fit ?? "cover";

  return (
    <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] p-2">
      <div className="text-[11px] font-bold text-[var(--fg)]">
        {statusLabel} layout
      </div>
      <StudioTimetableAssetSlotFields
        assetId={assetId}
        assets={assets}
        boundInput={null}
        canUseInput={false}
        fit={fit}
        hasAsset={hasAsset}
        label="Asset"
        onSelectAsset={(nextAssetId) => onSelectAsset(nextAssetId, fit)}
        onSelectFit={onSelectFit}
        onUploadFile={onUploadFile}
        // 사용자 입력을 쓸 수 없는 자리라 출처를 바꾸는 길이 없다.
        onUseInputSource={() => {}}
      />
    </div>
  );
}
