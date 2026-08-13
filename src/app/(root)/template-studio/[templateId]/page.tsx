import { TemplateStudioRunClient } from "@/app/(root)/template-studio/_components/template-studio-run-client";
import TemplateProtectedRoute from "@/components/auth/TemplateProtectedRoute";

export const dynamic = "force-dynamic";

export default async function TemplateStudioRunPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <TemplateProtectedRoute templateId={templateId}>
      <TemplateStudioRunClient templateId={templateId} />
    </TemplateProtectedRoute>
  );
}
