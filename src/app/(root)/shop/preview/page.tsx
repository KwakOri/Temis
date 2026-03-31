"use client";

import BackButton from "@/components/BackButton";
import TemplateDetailContent from "@/components/shop/TemplateDetailContent";
import type { ShopTemplateWithPlans } from "@/types/templateDetail";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface PreviewStorageData {
  template?: ShopTemplateWithPlans;
  createdAt?: number;
}

function ShopPreviewContent() {
  const searchParams = useSearchParams();
  const previewKey = searchParams.get("previewKey");
  const [template, setTemplate] = useState<ShopTemplateWithPlans | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!previewKey) {
      setTemplate(null);
      setError("미리보기 키가 없습니다.");
      return;
    }

    try {
      const raw = localStorage.getItem(previewKey);
      if (!raw) {
        setTemplate(null);
        setError("미리보기 데이터를 찾을 수 없습니다.");
        return;
      }

      const parsed = JSON.parse(raw) as PreviewStorageData;
      if (!parsed?.template) {
        setTemplate(null);
        setError("미리보기 데이터 형식이 올바르지 않습니다.");
        return;
      }

      setTemplate(parsed.template);
      setError("");
    } catch (parseError) {
      console.error("미리보기 데이터 로드 실패:", parseError);
      setTemplate(null);
      setError("미리보기 데이터를 불러오지 못했습니다.");
    }
  }, [previewKey]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-light via-timetable-card-bg to-tertiary py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <BackButton className="mb-6" />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-gray">
              상점 상세 미리보기
            </h1>
            <p className="text-sm text-dark-gray/70 mt-1">
              관리자에서 입력한 최신 값으로 렌더링된 화면입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 text-sm text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            창 닫기
          </button>
        </div>

        {!template && !error && (
          <div className="bg-timetable-form-bg rounded-2xl shadow-xl p-8 backdrop-blur-sm border border-tertiary">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="ml-4 text-dark-gray/70">미리보기를 준비하는 중...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-timetable-form-bg rounded-2xl shadow-xl p-8 backdrop-blur-sm border border-tertiary">
            <div className="text-center">
              <p className="text-holiday mb-3">{error}</p>
              <p className="text-sm text-dark-gray/60">
                관리자 페이지에서 다시 미리보기 버튼을 눌러 새 창을 열어주세요.
              </p>
            </div>
          </div>
        )}

        {template && (
          <TemplateDetailContent
            template={template}
            showTransferNotice
            purchaseSection={
              <div className="text-center">
                <button
                  type="button"
                  disabled
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold opacity-70 cursor-not-allowed"
                >
                  구매 신청하기
                </button>
                <p className="text-sm text-dark-gray/60 mt-3">
                  미리보기에서는 구매가 진행되지 않습니다.
                </p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

export default function ShopPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-light via-timetable-card-bg to-tertiary py-6 md:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-timetable-form-bg rounded-2xl shadow-xl p-8 backdrop-blur-sm border border-tertiary">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="ml-4 text-dark-gray/70">
                  미리보기를 준비하는 중...
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ShopPreviewContent />
    </Suspense>
  );
}
