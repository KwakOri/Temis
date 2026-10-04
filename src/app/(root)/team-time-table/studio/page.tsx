import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { TeamStudioRunClient } from "@/app/(root)/template-studio/_components/team-studio-run-client";
export default function TeamStudioRunPage() {
  return (
    <ProtectedRoute>
      <TeamStudioRunClient />
    </ProtectedRoute>
  );
}
