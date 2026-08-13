import { TemplateStudioClient } from "@/app/(root)/template-studio/_components/template-studio-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default async function TemplateStudioEditPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <AdminProtectedRoute>
      <TemplateStudioClient initialRemoteTemplateId={templateId} />
    </AdminProtectedRoute>
  );
}
