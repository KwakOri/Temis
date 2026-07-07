import { TemplateStudioDraftPreviewClient } from "@/app/(root)/admin/template-studio/_components/template-studio-draft-preview-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default function TemplateStudioDraftPreviewPage() {
  return (
    <AdminProtectedRoute>
      <TemplateStudioDraftPreviewClient />
    </AdminProtectedRoute>
  );
}
