import { TemplateStudioAdminListClient } from "../template-studio/_components/template-studio-admin-list-client";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export default function TeamTimetableStudioPage() {
  return (
    <AdminProtectedRoute>
      <AdminDashboardShell>
        <TemplateStudioAdminListClient templateMode="team" />
      </AdminDashboardShell>
    </AdminProtectedRoute>
  );
}
