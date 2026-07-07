"use client";

import { useCreateTemplateStudioTemplate } from "@/hooks/query/useTemplateStudio";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function TemplateStudioCreateClient() {
  const router = useRouter();
  const createTemplateMutation = useCreateTemplateStudioTemplate();
  const [name, setName] = useState("Untitled Template");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const created = await createTemplateMutation.mutateAsync({
        name: name.trim() || "Untitled Template",
        description: description.trim(),
      });
      router.replace(`/admin/template-studio/${created.template.id}/edit`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "템플릿 생성에 실패했습니다.",
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
          href="/admin/template-studio"
        >
          <ArrowLeft className="h-4 w-4" />
          Template Studio 목록
        </Link>

        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            Create
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            새 Template Studio 템플릿
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            기본 정보를 만든 뒤 editor에서 캔버스와 입력값을 구성합니다.
          </p>
        </header>

        <form
          className="grid gap-5 rounded-lg border border-slate-800 bg-slate-900 p-5"
          onSubmit={handleSubmit}
        >
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-300">이름</span>
            <input
              className="h-11 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
              value={name}
              placeholder="예: Weekly Timetable"
              onChange={(event) => setName(event.currentTarget.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-300">설명</span>
            <textarea
              className="min-h-28 resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
              value={description}
              placeholder="관리자용 메모 또는 템플릿 설명"
              onChange={(event) => setDescription(event.currentTarget.value)}
            />
          </label>

          {error ? (
            <p className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-md border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              href="/admin/template-studio"
            >
              취소
            </Link>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={createTemplateMutation.isPending}
              type="submit"
            >
              {createTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              생성 후 편집
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
