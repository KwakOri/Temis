import { TemplateStudioCreateClient } from "@/app/(root)/admin/template-studio/_components/template-studio-create-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default function TemplateStudioCreatePage() {
  return (
    <AdminProtectedRoute>
      <TemplateStudioCreateClient />
    </AdminProtectedRoute>
  );
}
