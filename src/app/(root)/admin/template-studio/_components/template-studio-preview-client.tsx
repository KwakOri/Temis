"use client";

import { TemplateStudioRuntimeShell } from "@/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell";
import { useTemplateStudioTemplate } from "@/hooks/query/useTemplateStudio";

interface TemplateStudioPreviewClientProps {
  templateId: string;
}

export function TemplateStudioPreviewClient({
  templateId,
}: TemplateStudioPreviewClientProps) {
  const { data, isLoading, isError, error, refetch } =
    useTemplateStudioTemplate(templateId);

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

  const previewSource = data.draft
    ? {
        document: data.draft.document,
        runtimeValues: data.draft.runtimeValues,
        source: "draft" as const,
        updatedAt: data.draft.updatedAt,
      }
    : data.document
      ? {
          document: data.document.document,
          runtimeValues: data.document.runtimeValues,
          source: "published" as const,
          updatedAt: data.document.updatedAt,
        }
      : null;

  if (!previewSource) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="grid max-w-sm gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-center">
          <h1 className="text-sm font-bold">Template Studio Preview</h1>
          <p className="text-sm font-semibold text-slate-300">
            저장된 draft 또는 published 문서가 없습니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <TemplateStudioRuntimeShell
      key={`${templateId}:${previewSource.source}:${previewSource.updatedAt}`}
      document={previewSource.document}
      initialRuntimeValues={previewSource.runtimeValues}
      source={previewSource.source}
      templateId={templateId}
      templateName={data.template.name}
      updatedAt={previewSource.updatedAt}
    />
  );
}
