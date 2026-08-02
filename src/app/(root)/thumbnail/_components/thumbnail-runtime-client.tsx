"use client";

import { useThumbnailStudioRuntime } from "@/hooks/query/useTemplateStudio";

import { ThumbnailRuntimeShell } from "./thumbnail-runtime-shell";

interface ThumbnailRuntimeClientProps {
  templateId: string;
}

export function ThumbnailRuntimeClient({
  templateId,
}: ThumbnailRuntimeClientProps) {
  const { data, error, isError, isLoading, refetch } =
    useThumbnailStudioRuntime(templateId);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">
        썸네일 템플릿을 불러오는 중...
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="grid max-w-sm gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <h1 className="text-base font-black">썸네일을 열 수 없습니다</h1>
          <p className="text-sm font-semibold text-rose-300">
            {error instanceof Error
              ? error.message
              : "발행된 썸네일 템플릿을 찾을 수 없습니다."}
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

  return (
    <ThumbnailRuntimeShell
      document={data.document}
      initialRuntimeValues={data.runtimeValues}
      revisionNo={data.revisionNo}
      storageOwnerId={data.storageOwnerId}
      templateId={templateId}
      templateName={data.template.name}
    />
  );
}
