import { ThumbnailRuntimeClient } from "@/app/(root)/thumbnail/_components/thumbnail-runtime-client";
import TemplateProtectedRoute from "@/components/auth/TemplateProtectedRoute";

export const dynamic = "force-dynamic";

export default async function ThumbnailRuntimePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <TemplateProtectedRoute templateId={templateId}>
      <ThumbnailRuntimeClient templateId={templateId} />
    </TemplateProtectedRoute>
  );
}
