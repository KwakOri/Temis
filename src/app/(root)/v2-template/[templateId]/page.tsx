"use client";

import V2RuntimeShell from "@/app/(root)/v2-template/_components/runtime/runtime-shell";
import { useV2TemplateRenderConfig } from "@/hooks/query/useV2TemplateRenderConfig";
import { v2_normalizeTemplateRenderConfig } from "@/utils/v2/template-render-config";
import { useParams } from "next/navigation";
import React from "react";
import "../_styles/index.css";

const V2TemplateByIdPage = () => {
  const params = useParams<{ templateId?: string }>();
  const templateId =
    typeof params?.templateId === "string" ? params.templateId : undefined;
  const { data, isLoading, isError, error, refetch } =
    useV2TemplateRenderConfig(templateId);

  if (!templateId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d1117] text-slate-200">
        유효한 templateId가 필요합니다.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d1117] text-slate-200">
        v2 template 로딩 중...
      </div>
    );
  }

  if (isError || !data) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "템플릿 설정을 불러오지 못했습니다.";
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-[#0d1117] px-4 text-slate-200">
        <p className="text-center text-sm text-rose-300">{errorMessage}</p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="rounded border border-slate-500 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const renderConfig = v2_normalizeTemplateRenderConfig(data.renderConfig);

  return (
    <V2RuntimeShell
      key={`${templateId}:${data.updatedAt ?? data.createdAt ?? "empty"}`}
      templateId={templateId}
      source={data.source}
      renderConfig={renderConfig}
    />
  );
};

export default V2TemplateByIdPage;
