import { ThumbnailStudioClient } from "./_components/thumbnail-studio-client";

export const metadata = {
  title: "Thumbnail Studio",
};

/**
 * Thumbnail Studio 최소 화면.
 *
 * Phase 1에서는 빈 문서로 시작하고 저장하지 않는다. 문서를 불러오는
 * `[templateId]/edit` 경로는 저장 경로가 생기는 단계에서 추가한다.
 */
export default function ThumbnailStudioPage() {
  return <ThumbnailStudioClient />;
}
