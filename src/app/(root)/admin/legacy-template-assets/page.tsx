import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LegacyAssetList } from "@/components/admin/legacy-template-assets/LegacyAssetList";
export default function Page() {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <LegacyAssetList />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
