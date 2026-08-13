import { TemplateHubClient } from "@/app/(root)/admin/template-hub/_components/template-hub-client";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const dynamic = "force-dynamic";

export default function TemplateHubAdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <TemplateHubClient />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
