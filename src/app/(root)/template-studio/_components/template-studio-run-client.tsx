"use client";

import Link from "next/link";

import { TemplateStudioRuntimeShell } from "@/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell";
import {
  useSaveTemplateStudioRuntime,
  useTemplateStudioRuntime,
} from "@/hooks/query/useTemplateStudio";

interface TemplateStudioRunClientProps {
  templateId: string;
}

export function TemplateStudioRunClient({
  templateId,
}: TemplateStudioRunClientProps) {
  const { data, isLoading, isError, error, refetch } =
    useTemplateStudioRuntime(templateId);
  const saveRuntime = useSaveTemplateStudioRuntime();

  if (isLoading) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 text-sm font-semibold text-slate-400">
        불러오는 중...
      </main>
    );
  }

  if (isError || !data) {
    const errorMessage =
      error instanceof Error ? error.message : "불러오지 못했습니다.";

    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="grid max-w-sm gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-center">
          <h1 className="text-sm font-bold">템플릿을 실행할 수 없습니다</h1>
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
          <Link
            href="/my-page"
            className="mx-auto text-xs font-semibold text-slate-400 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            마이페이지로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <TemplateStudioRuntimeShell
      key={`${templateId}:${data.storageOwnerId}:${data.baseRevisionNo ?? "none"}`}
      backHref="/my-page"
      document={data.document}
      initialRuntimeValues={data.runtimeValues}
      source="published"
      storageOwnerId={data.storageOwnerId}
      templateId={templateId}
      templateName={data.template.name}
      onSaveValues={async (runtimeValues) => {
        await saveRuntime.mutateAsync({ templateId, runtimeValues });
      }}
    />
  );
}
