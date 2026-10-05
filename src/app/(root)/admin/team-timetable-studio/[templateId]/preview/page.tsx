import { TemplateStudioPreviewClient } from "../../../template-studio/_components/template-studio-preview-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default async function TeamTimetableStudioPreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <AdminProtectedRoute>
      <TemplateStudioPreviewClient templateId={templateId} />
    </AdminProtectedRoute>
  );
}
