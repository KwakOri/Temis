"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";

import { TemplateStudioRuntimeShell } from "../_components/runtime/template-studio-runtime-shell";
import {
  readTemplateStudioPreviewStorage,
  type TemplateStudioPreviewStoragePayload,
} from "@/utils/template-studio/preview-storage";

function TemplateStudioDraftPreviewContent() {
  const searchParams = useSearchParams();
  const previewKey = searchParams.get("previewKey");
  const [payload, setPayload] =
    useState<TemplateStudioPreviewStoragePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!previewKey) {
      setPayload(null);
      setError("미리보기 키가 없습니다.");
      return;
    }

    const result = readTemplateStudioPreviewStorage(previewKey);
    if (!result) {
      setPayload(null);
      setError("미리보기 데이터를 찾을 수 없습니다.");
      return;
    }

    setPayload(result.payload);
    setError("");
  }, [previewKey]);

  if (error) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="grid max-w-sm gap-3 rounded-lg border border-slate-800 bg-slate-900 p-5 text-center">
          <h1 className="text-sm font-bold">Template Studio Preview</h1>
          <p className="text-sm font-semibold text-rose-300">{error}</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-slate-950 text-sm font-semibold text-slate-400">
        미리보기를 준비하는 중...
      </main>
    );
  }

  return (
    <TemplateStudioRuntimeShell
      key={`${previewKey}:${payload.createdAt}`}
      document={payload.document}
      initialRuntimeValues={payload.runtimeValues}
      source="draft"
      templateId={payload.templateId ?? null}
      templateName={payload.templateName}
      updatedAt={new Date(payload.createdAt).toISOString()}
    />
  );
}

export default function TemplateStudioDraftPreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-screen w-full items-center justify-center bg-slate-950 text-sm font-semibold text-slate-400">
          미리보기를 준비하는 중...
        </main>
      }
    >
      <TemplateStudioDraftPreviewContent />
    </Suspense>
  );
}
