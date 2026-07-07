"use client";

import { useTemplateStudioTemplates } from "@/hooks/query/useTemplateStudio";
import { cn } from "@/lib/utils";
import type { TemplateStudioTemplateRecord } from "@/services/server/templateStudioPersistenceService";
import {
  ArrowUpRight,
  Eye,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabels: Record<TemplateStudioTemplateRecord["status"], string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function TemplateStudioAdminListClient() {
  const templatesQuery = useTemplateStudioTemplates();
  const templates = templatesQuery.data?.templates ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Template Studio
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              시간표 템플릿을 만들고 draft, publish, runtime preview 상태를 확인합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={templatesQuery.isFetching}
              type="button"
              onClick={() => {
                void templatesQuery.refetch();
              }}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  templatesQuery.isFetching && "animate-spin",
                )}
              />
              새로고침
            </button>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-bold text-white transition hover:bg-blue-400"
              href="/admin/template-studio/create"
            >
              <Plus className="h-4 w-4" />새 템플릿
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-bold">템플릿 목록</h2>
          </div>

          {templatesQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-400">
              템플릿 목록을 불러오는 중...
            </div>
          ) : templatesQuery.isError ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-rose-300">
                {templatesQuery.error instanceof Error
                  ? templatesQuery.error.message
                  : "템플릿 목록을 불러오지 못했습니다."}
              </p>
            </div>
          ) : templates.length === 0 ? (
            <div className="grid gap-3 px-4 py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">
                아직 생성된 Template Studio 템플릿이 없습니다.
              </p>
              <Link
                className="mx-auto inline-flex h-9 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-bold text-white transition hover:bg-blue-400"
                href="/admin/template-studio/create"
              >
                <Plus className="h-4 w-4" />첫 템플릿 만들기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {templates.map((template) => (
                <article
                  className="grid gap-4 px-4 py-4 transition hover:bg-slate-800/50 md:grid-cols-[1fr_auto]"
                  key={template.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-white">
                        {template.name}
                      </h3>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                          template.status === "published"
                            ? "bg-emerald-400/15 text-emerald-300"
                            : template.status === "archived"
                              ? "bg-slate-700 text-slate-300"
                              : "bg-blue-400/15 text-blue-300",
                        )}
                      >
                        {statusLabels[template.status]}
                      </span>
                    </div>
                    {template.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {template.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {template.id} · 업데이트 {formatDateTime(template.updatedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Link
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-white"
                      href={`/admin/template-studio/${template.id}/edit`}
                    >
                      <Pencil className="h-4 w-4" />
                      편집
                    </Link>
                    <Link
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
                        template.status === "published"
                          ? "border-slate-700 text-slate-200 hover:border-blue-400 hover:text-white"
                          : "pointer-events-none border-slate-800 text-slate-600",
                      )}
                      href={`/admin/template-studio/${template.id}/preview`}
                      aria-disabled={template.status !== "published"}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Link>
                    <Link
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-blue-400 hover:text-white"
                      href={`/admin/template-studio/${template.id}/edit`}
                      title="새 화면에서 열기"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
