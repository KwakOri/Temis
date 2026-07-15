import { TemplateStudioAdminListClient } from "@/app/(root)/admin/template-studio/_components/template-studio-admin-list-client";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const dynamic = "force-dynamic";

export default function TemplateStudioAdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <TemplateStudioAdminListClient />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
