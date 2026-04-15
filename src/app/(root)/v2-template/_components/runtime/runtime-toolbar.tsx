"use client";

import Link from "next/link";
import React from "react";

interface V2RuntimeToolbarProps {
  templateId: string;
  source: "db" | "empty";
  onReset: () => void;
}

const V2RuntimeToolbar = ({
  templateId,
  source,
  onReset,
}: V2RuntimeToolbarProps) => {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-[#0b0f14] px-3 text-slate-200 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/v2-template"
          className="rounded border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-800"
        >
          목록
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">v2 template runtime</p>
          <p className="truncate text-[11px] text-slate-400">
            {templateId} · source: {source}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded border border-slate-500 bg-slate-800 px-2.5 py-1 text-xs text-slate-100 hover:bg-slate-700"
      >
        입력 초기화
      </button>
    </header>
  );
};

export default V2RuntimeToolbar;
