import AdminProtectedRoute from "@/components/auth/AdminProtectedRoute";

import { TemplateStudioCreateClient } from "../../template-studio/_components/template-studio-create-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Thumbnail Studio Template",
};

export default function ThumbnailStudioCreatePage() {
  return (
    <AdminProtectedRoute>
      <TemplateStudioCreateClient templateKind="thumbnail" />
    </AdminProtectedRoute>
  );
}
