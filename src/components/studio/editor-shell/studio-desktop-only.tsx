"use client";

import Link from "next/link";
import React, { useEffect, useState, type ReactNode } from "react";

/** Check the device, so phones/tablets remain blocked in landscape or desktop-site mode. */
function isMobileDevice(): boolean {
  return (
    /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(
      window.navigator.userAgent,
    ) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1) ||
    // Android desktop-site mode can identify itself as Linux instead of Android.
    (/Linux/i.test(window.navigator.userAgent) &&
      window.navigator.maxTouchPoints > 0 &&
      window.matchMedia("(pointer: coarse)").matches)
  );
}

export function StudioDesktopOnly({
  children,
  backHref,
}: {
  children: ReactNode;
  backHref: string;
}) {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    setMobile(isMobileDevice());
  }, []);

  // Do not mount the editor or start its document queries before checking the device.
  if (mobile === null)
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        편집기를 준비하는 중…
      </main>
    );
  if (!mobile) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-bold">데스크톱에서 편집해 주세요</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          템플릿 에디터는 데스크톱 전용입니다. PC 또는 Mac에서 접속해 주세요.
        </p>
        <Link
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          href={backHref}
        >
          템플릿 목록으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
