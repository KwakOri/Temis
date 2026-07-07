"use client";

import { useParams } from "next/navigation";
import React from "react";

import { TemplateStudioRuntimeShell } from "../../_components/runtime/template-studio-runtime-shell";
import { useTemplateStudioPreview } from "@/hooks/query/useTemplateStudioPreview";

export default function TemplateStudioPublishedPreviewPage() {
  const params = useParams<{ templateId?: string }>();
  const templateId =
    typeof params?.templateId === "string" ? params.templateId : undefined;
  const { data, isLoading, isError, error, refetch } =
    useTemplateStudioPreview(templateId);

  if (!templateId) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 px-4 text-sm font-semibold text-slate-100">
        유효한 templateId가 필요합니다.
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 text-sm font-semibold text-slate-400">
        미리보기를 불러오는 중...
      </main>
    );
  }

  if (isError || !data) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "미리보기를 불러오지 못했습니다.";

    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="grid max-w-sm gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-center">
          <h1 className="text-sm font-bold">Template Studio Preview</h1>
          <p className="text-sm font-semibold text-rose-300">{errorMessage}</p>
          <button
            className="mx-auto h-8 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs font-bold text-slate-300 transition hover:border-blue-400 hover:text-white"
            type="button"
            onClick={() => {
              void refetch();
            }}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <TemplateStudioRuntimeShell
      key={`${templateId}:${data.updatedAt}`}
      document={data.document}
      initialRuntimeValues={data.runtimeValues}
      source="published"
      templateId={data.templateId}
      templateName={data.template.name}
      updatedAt={data.updatedAt}
    />
  );
}
