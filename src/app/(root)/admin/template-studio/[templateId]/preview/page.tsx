import { TemplateStudioPublishedPreviewClient } from "@/app/(root)/admin/template-studio/_components/template-studio-published-preview-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default async function TemplateStudioPublishedPreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <AdminProtectedRoute>
      <TemplateStudioPublishedPreviewClient templateId={templateId} />
    </AdminProtectedRoute>
  );
}
