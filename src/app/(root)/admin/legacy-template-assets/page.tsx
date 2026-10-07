import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LegacyManagement from "@/components/admin/LegacyManagement";
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <LegacyManagement initialSection="assets" />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
