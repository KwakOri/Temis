"use client";

import { useThumbnailStudioRuntime } from "@/hooks/query/useTemplateStudio";
import { StudioRuntimeStateScreen } from "@/components/studio/runtime/studio-runtime-state-screen";

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
    return <StudioRuntimeStateScreen title="썸네일 템플릿을 불러오는 중…" />;
  }

  if (isError || !data) {
    return (
      <StudioRuntimeStateScreen
        actionLabel="다시 시도"
        backHref="/my-page"
        message={
          error instanceof Error
            ? error.message
            : "발행된 썸네일 템플릿을 찾을 수 없습니다."
        }
        title="썸네일을 열 수 없습니다"
        onAction={() => void refetch()}
      />
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
