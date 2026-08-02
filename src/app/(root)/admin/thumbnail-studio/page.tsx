import { TemplateStudioAdminListClient } from "../template-studio/_components/template-studio-admin-list-client";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const metadata = {
  title: "Thumbnail Studio",
};

/**
 * 썸네일 Template Studio 템플릿 목록.
 */
export default function ThumbnailStudioPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <TemplateStudioAdminListClient templateKind="thumbnail" />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
