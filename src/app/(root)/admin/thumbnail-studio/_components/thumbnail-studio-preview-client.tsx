"use client";

import { useTemplateStudioTemplate } from "@/hooks/query/useTemplateStudio";
import { getStudioTemplateKind } from "@/utils/template-studio/template-kind";

import { ThumbnailRuntimeShell } from "@/app/(root)/thumbnail/_components/thumbnail-runtime-shell";

interface ThumbnailStudioPreviewClientProps {
  templateId: string;
}

export function ThumbnailStudioPreviewClient({
  templateId,
}: ThumbnailStudioPreviewClientProps) {
  const { data, error, isError, isLoading, refetch } =
    useTemplateStudioTemplate(templateId);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">
        초안 미리보기를 불러오는 중...
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="grid max-w-sm gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <h1 className="text-base font-black">미리보기를 열 수 없습니다</h1>
          <p className="text-sm font-semibold text-rose-300">
            {error instanceof Error
              ? error.message
              : "Template Studio 문서를 불러오지 못했습니다."}
          </p>
          <button
            className="mx-auto h-9 rounded-lg border border-slate-700 px-4 text-xs font-bold text-slate-200 transition hover:border-blue-400"
            type="button"
            onClick={() => void refetch()}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  const source = data.draft ?? data.document;
  if (!source || getStudioTemplateKind(source.document) !== "thumbnail") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm font-semibold text-slate-300">
          썸네일 문서가 없거나 문서 종류가 올바르지 않습니다.
        </div>
      </main>
    );
  }

  return (
    <ThumbnailRuntimeShell
      backHref={`/admin/thumbnail-studio/${templateId}/edit`}
      document={source.document}
      initialRuntimeValues={source.runtimeValues}
      revisionNo={data.document?.publishedRevisionNo ?? 0}
      storageOwnerId={`admin-preview:${templateId}`}
      templateId={templateId}
      templateName={data.template.name}
    />
  );
}
