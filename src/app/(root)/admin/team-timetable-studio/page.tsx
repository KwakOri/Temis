import StudioTemplateManagement from "@/components/admin/StudioTemplateManagement";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default function TeamTimetableStudioPage() {
  return (
    <AdminProtectedRoute>
      <AdminDashboardShell>
        <StudioTemplateManagement initialSection="team" />
      </AdminDashboardShell>
    </AdminProtectedRoute>
  );
}
