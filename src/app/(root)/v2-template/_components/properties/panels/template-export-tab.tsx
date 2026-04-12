"use client";

import React from "react";

interface TemplateExportTabProps {
  copyState: "idle" | "success" | "error";
  onCopyJson: () => void;
  onDownloadPreview: () => void;
  onResetData: () => void;
}

const TemplateExportTab: React.FC<TemplateExportTabProps> = ({
  copyState,
  onCopyJson,
  onDownloadPreview,
  onResetData,
}) => {
  return (
    <div className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100">
      <h3 className="font-bold text-base text-gray-100">내보내기</h3>
      <p className="text-xs text-gray-400">
        설정 JSON 내보내기와 프리뷰 이미지 저장, 샘플 데이터 초기화를 수행합니다.
      </p>

      <section className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
          Export
        </h4>
        <button
          type="button"
          onClick={onCopyJson}
          className="w-full rounded border border-[#4f8cff] bg-[#1f355f] py-2 text-sm font-semibold text-[#d6e6ff] hover:bg-[#27457a]"
        >
          renderConfig JSON 복사
        </button>
        {copyState === "success" ? (
          <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
            JSON이 클립보드에 복사됐습니다.
          </p>
        ) : null}
        {copyState === "error" ? (
          <p className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
            복사에 실패했습니다. 콘솔을 확인해 주세요.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onDownloadPreview}
          className="w-full rounded border border-[#3a3d44] bg-[#2a2d33] py-2 text-sm font-semibold text-gray-100 hover:bg-[#323640]"
        >
          프리뷰 PNG 저장
        </button>
      </section>

      <section className="space-y-2 rounded border border-red-500/30 bg-red-500/10 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-red-200">
          Danger Zone
        </h4>
        <p className="text-[11px] text-red-200/85">
          월요일 기준 샘플 입력값(entry/card/global)을 초기 상태로 되돌립니다.
        </p>
        <button
          type="button"
          onClick={onResetData}
          className="w-full rounded border border-red-400/50 bg-red-500/20 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/30"
        >
          샘플 데이터 리셋
        </button>
      </section>
    </div>
  );
};

export default TemplateExportTab;
