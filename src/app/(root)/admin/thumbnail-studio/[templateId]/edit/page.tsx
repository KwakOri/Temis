import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

import { ThumbnailStudioClient } from "../../_components/thumbnail-studio-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thumbnail Studio",
};

/**
 * 썸네일 문서 편집 화면.
 *
 * 원격 저장 API는 Phase 6에서 온다. 그때까지는 빈 로컬 문서로 화면이 돌아간다. 저장이
 * 없다는 이유로 편집 기능 개발이 막히면 안 되고, 저장 실패가 편집을 멈춰서도 안 된다.
 * 그래서 여기서는 id를 화면에 알려주는 데만 쓰고 문서를 불러오지 않는다.
 */
export default async function ThumbnailStudioEditPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <AdminProtectedRoute>
      <ThumbnailStudioClient templateId={templateId} />
    </AdminProtectedRoute>
  );
}
