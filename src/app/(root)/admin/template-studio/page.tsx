import StudioTemplateManagement from "@/components/admin/StudioTemplateManagement";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const dynamic = "force-dynamic";

export default function TemplateStudioAdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <StudioTemplateManagement initialSection="timetable" />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
