"use client";

import { useTemplateStudioTemplate } from "@/hooks/query/useTemplateStudio";
import { StudioRuntimeStateScreen } from "@/components/studio/runtime/studio-runtime-state-screen";
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
    return <StudioRuntimeStateScreen title="초안 미리보기를 불러오는 중…" />;
  }

  if (isError || !data) {
    return (
      <StudioRuntimeStateScreen
        actionLabel="다시 시도"
        message={
          error instanceof Error
            ? error.message
            : "Template Studio 문서를 불러오지 못했습니다."
        }
        title="미리보기를 열 수 없습니다"
        onAction={() => void refetch()}
      />
    );
  }

  const source = data.draft ?? data.document;
  if (!source || getStudioTemplateKind(source.document) !== "thumbnail") {
    return (
      <StudioRuntimeStateScreen
        message="썸네일 문서가 없거나 문서 종류가 올바르지 않습니다."
        title="미리보기를 열 수 없습니다"
      />
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
