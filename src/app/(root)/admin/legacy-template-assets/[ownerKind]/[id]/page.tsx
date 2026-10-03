import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LegacyAssetEditor } from "@/components/admin/legacy-template-assets/LegacyAssetEditor";
import { parseLegacyAssetOwner } from "@/utils/legacy-template-assets/contracts";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ ownerKind: string; id: string }>;
}) {
  const { ownerKind, id } = await params;
  let owner;
  try {
    owner = parseLegacyAssetOwner(ownerKind, id);
  } catch {
    notFound();
  }
  return (
    <ProtectedRoute>
      <AdminDashboardShell>
        <LegacyAssetEditor owner={owner} />
      </AdminDashboardShell>
    </ProtectedRoute>
  );
}
