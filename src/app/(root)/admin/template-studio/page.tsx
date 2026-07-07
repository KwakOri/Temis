import { TemplateStudioAdminListClient } from "@/app/(root)/admin/template-studio/_components/template-studio-admin-list-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default function TemplateStudioAdminPage() {
  return (
    <AdminProtectedRoute>
      <TemplateStudioAdminListClient />
    </AdminProtectedRoute>
  );
}
