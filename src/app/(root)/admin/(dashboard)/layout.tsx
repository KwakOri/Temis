import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

export default function AdminDashboardLayout({
  children,
}: AdminDashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <AdminDashboardShell>{children}</AdminDashboardShell>
    </ProtectedRoute>
  );
}
