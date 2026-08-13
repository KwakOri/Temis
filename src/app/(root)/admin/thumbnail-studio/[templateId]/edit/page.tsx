import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

import { ThumbnailStudioClient } from "../../_components/thumbnail-studio-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thumbnail Studio",
};

/**
 * 저장된 썸네일 문서의 편집 화면.
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
