import StudioTemplateManagement from "@/components/admin/StudioTemplateManagement";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const metadata = {
  title: "Thumbnail Studio",
};

export const dynamic = "force-dynamic";

/**
 * 썸네일 Template Studio 템플릿 목록.
 */
export default function ThumbnailStudioPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <StudioTemplateManagement initialSection="thumbnail" />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
