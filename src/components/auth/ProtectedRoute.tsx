"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      // 현재 경로를 returnUrl로 설정하여 로그인 페이지로 리다이렉트 (히스토리 대체)
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/auth?returnUrl=${returnUrl}`);
    }
  }, [user, loading, router, pathname]);

  // 로딩 중일 때
  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      )
    );
  }

  // 인증되지 않았을 때 (리다이렉트 처리 후)
  if (!user) {
    return null;
  }

  // 인증된 사용자에게만 children 렌더링
  return <>{children}</>;
}
