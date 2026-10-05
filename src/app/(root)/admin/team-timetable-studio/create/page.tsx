import { TemplateStudioCreateClient } from "../../template-studio/_components/template-studio-create-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export const dynamic = "force-dynamic";

export default function TeamTimetableStudioCreatePage() {
  return (
    <AdminProtectedRoute>
      <TemplateStudioCreateClient templateMode="team" />
    </AdminProtectedRoute>
  );
}
