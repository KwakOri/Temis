import { TemplateStudioClient } from "@/app/(root)/template-studio/_components/template-studio-client";
import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

export default function TeamTimetableStudioPage() {
  return (
    <AdminProtectedRoute>
      <TemplateStudioClient initialTemplateMode="team" />
    </AdminProtectedRoute>
  );
}
