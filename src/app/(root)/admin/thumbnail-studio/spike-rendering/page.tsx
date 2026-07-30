import { RenderingSpikeClient } from "@/app/(root)/admin/thumbnail-studio/spike-rendering/_components/rendering-spike-client";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export const dynamic = "force-dynamic";

/**
 * Phase 0A 렌더링 스파이크 페이지.
 *
 * 일회용이다. PNG 라이브러리와 텍스트 효과 렌더링 방식을 결정한 뒤
 * `spike-rendering` 폴더 전체를 제거한다.
 */
export default function ThumbnailStudioRenderingSpikePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950">
        <RenderingSpikeClient />
      </div>
    </ProtectedRoute>
  );
}
