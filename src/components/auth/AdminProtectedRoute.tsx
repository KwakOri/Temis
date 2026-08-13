"use client";

import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface AdminProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function AdminProtectedRoute({
  children,
  fallback,
}: AdminProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user) return;

    const returnUrl =
      typeof window === "undefined"
        ? pathname
        : `${window.location.pathname}${window.location.search}`;
    router.replace(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      fallback ?? (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-blue-300" />
            관리자 세션을 확인하는 중...
          </div>
        </main>
      )
    );
  }

  if (!user) {
    return null;
  }

  if (!user.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="grid max-w-sm gap-4 rounded-lg border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="grid gap-1">
            <h1 className="text-base font-bold">관리자 권한이 필요합니다.</h1>
            <p className="text-sm text-slate-400">
              Template Studio는 관리자 페이지에서만 접근할 수 있습니다.
            </p>
          </div>
          <Link
            className="mx-auto h-9 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
            href="/"
          >
            홈으로 이동
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
