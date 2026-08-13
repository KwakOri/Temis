import { ThumbnailStudioPreviewClient } from "@/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-preview-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default async function ThumbnailStudioPreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <AdminProtectedRoute>
      <ThumbnailStudioPreviewClient templateId={templateId} />
    </AdminProtectedRoute>
  );
}
