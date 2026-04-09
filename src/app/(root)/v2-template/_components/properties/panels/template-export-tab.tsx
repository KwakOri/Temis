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
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">내보내기</h3>
      <button
        onClick={onCopyJson}
        className="w-full bg-timetable-primary text-white py-2 rounded text-sm font-semibold hover:bg-timetable-primary-hover transition"
      >
        renderConfig JSON 복사
      </button>
      {copyState === "success" ? (
        <p className="text-xs text-green-600">JSON이 클립보드에 복사됐습니다.</p>
      ) : null}
      {copyState === "error" ? (
        <p className="text-xs text-red-600">복사에 실패했습니다. 콘솔을 확인해 주세요.</p>
      ) : null}

      <button
        onClick={onDownloadPreview}
        className="w-full bg-gray-700 text-white py-2 rounded text-sm font-semibold hover:bg-gray-800 transition"
      >
        프리뷰 PNG 저장
      </button>
      <button
        onClick={onResetData}
        className="w-full bg-red-500 text-white py-2 rounded text-sm font-semibold hover:bg-red-600 transition"
      >
        샘플 데이터 리셋
      </button>
    </div>
  );
};

export default TemplateExportTab;
