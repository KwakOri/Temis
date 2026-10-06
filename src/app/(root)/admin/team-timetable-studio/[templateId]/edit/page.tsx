import { TemplateStudioClient } from "@/app/(root)/template-studio/_components/template-studio-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";
import { StudioDesktopOnly } from "@/components/studio/editor-shell/studio-desktop-only";

export const dynamic = "force-dynamic";

export default async function TeamTimetableStudioEditPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  return (
    <AdminProtectedRoute>
      <StudioDesktopOnly backHref="/admin/team-timetable-studio">
        <TemplateStudioClient
          initialRemoteTemplateId={templateId}
          initialTemplateMode="team"
        />
      </StudioDesktopOnly>
    </AdminProtectedRoute>
  );
}
