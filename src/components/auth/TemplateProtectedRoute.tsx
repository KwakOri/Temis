'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useTemplateAccess } from '@/hooks/useTemplateAccess';

interface TemplateProtectedRouteProps {
  children: React.ReactNode;
  templateId: string;
  fallback?: React.ReactNode;
}

export default function TemplateProtectedRoute({ 
  children, 
  templateId, 
  fallback 
}: TemplateProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: accessLoading, error } = useTemplateAccess({ templateId });
  const router = useRouter();
  const pathname = usePathname();

  // 디버그 로깅
  console.log('🔒 TemplateProtectedRoute Debug:', {
    templateId,
    user: user ? { email: user.email, isAdmin: user.isAdmin } : null,
    authLoading,
    accessLoading,
    hasAccess,
    error
  });

  useEffect(() => {
    if (!authLoading && !user) {
      // 인증되지 않은 경우 로그인 페이지로 리다이렉트
      const returnUrl = encodeURIComponent(pathname);
      router.push(`/auth?returnUrl=${returnUrl}`);
    }
  }, [user, authLoading, router, pathname]);

  useEffect(() => {
    // 모든 로딩이 완료되고, 사용자가 인증되었지만, 접근 권한이 명시적으로 false일 때만 리다이렉트
    // 중요: hasAccess가 null이 아닌 false여야 함 (API 응답 완료 후)
    if (!authLoading && !accessLoading && user && hasAccess === false && !error) {
      console.log('🚫 Access denied, redirecting to access-denied page');
      router.push(`/access-denied?templateId=${encodeURIComponent(templateId)}`);
    }
  }, [user, authLoading, accessLoading, hasAccess, error, router, templateId]);

  // 로딩 중일 때
  if (authLoading || accessLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">권한 확인 중...</p>
          </div>
        </div>
      )
    );
  }

  // 에러가 발생한 경우
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">권한 확인 오류</h1>
          <p className="text-gray-600 mb-4">템플릿 접근 권한을 확인하는 중 오류가 발생했습니다.</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/my-page')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            내 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 인증되지 않았을 때 (리다이렉트 처리 후)
  if (!user) {
    return null;
  }

  // 템플릿 접근 권한이 없을 때 (리다이렉트 처리 후)
  if (hasAccess === false) {
    return null;
  }

  // 아직 권한 확인이 완료되지 않았을 때 (hasAccess === null)
  if (hasAccess === null) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">권한 확인 중...</p>
          </div>
        </div>
      )
    );
  }

  // 모든 조건을 만족할 때만 children 렌더링 (hasAccess === true)
  return <>{children}</>;
}