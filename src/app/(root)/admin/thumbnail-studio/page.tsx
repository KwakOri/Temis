import { ThumbnailStudioClient } from "./_components/thumbnail-studio-client";

export const metadata = {
  title: "Thumbnail Studio",
};

/**
 * 새 썸네일 문서 편집 화면.
 *
 * 빈 문서로 시작한다. 원격 저장은 Phase 6에서 오므로 아직 어디에도 저장하지 않는다.
 * 저장한 문서를 여는 경로는 `[templateId]/edit`다.
 */
export default function ThumbnailStudioPage() {
  return <ThumbnailStudioClient />;
}
