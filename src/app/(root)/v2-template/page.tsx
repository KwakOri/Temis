'use client';

import { useV2Templates } from '@/hooks/query/useV2Templates';
import Link from 'next/link';

const v2_formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return '-';
  }
};

const V2TemplateHomePage = () => {
  const { data, isLoading, isError, error, refetch } = useV2Templates({
    limit: 100,
    offset: 0,
  });

  const templates = data?.templates ?? [];

  const errorMessage =
    error instanceof Error
      ? error.message
      : 'v2 템플릿 목록 조회 중 오류가 발생했습니다.';

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">V2 Template</h1>
          <p className="mt-2 text-sm text-slate-500">
            v2 템플릿 목록입니다. 각 템플릿을 눌러 작성 페이지로 이동할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
        >
          새로고침
        </button>
      </div>

      <section className="mt-7 space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-500">목록을 불러오는 중입니다...</p>
        ) : isError ? (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-slate-500">v2 템플릿이 없습니다.</p>
        ) : (
          templates.map((template) => (
            <Link
              key={template.id}
              href={`/v2-template/${template.id}`}
              className="block rounded-md border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <p className="text-sm font-semibold text-slate-900">{template.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {template.id} · {v2_formatDateTime(template.created_at)}
              </p>
              {template.description ? (
                <p className="mt-1 text-xs text-slate-600">{template.description}</p>
              ) : null}
            </Link>
          ))
        )}
      </section>
    </div>
  );
};

export default V2TemplateHomePage;
