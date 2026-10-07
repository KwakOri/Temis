"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/** Initial loading replaces the editor entirely, so stored samples never flash. */
export function StudioInitialLoading({ error }: { error?: string | null }) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200"
      data-studio-initial-loading
    >
      {error ? (
        <div className="grid max-w-sm gap-3 p-6 text-center" role="alert">
          <p className="text-sm">{error}</p>
          <button
            type="button"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            onClick={() => window.location.reload()}
          >
            다시 불러오기
          </button>
        </div>
      ) : (
        <div
          role="status"
          aria-label="에디터 데이터를 불러오는 중"
          aria-live="polite"
        >
          <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin" />
          <span className="sr-only">에디터 데이터를 불러오는 중</span>
        </div>
      )}
    </div>
  );
}
