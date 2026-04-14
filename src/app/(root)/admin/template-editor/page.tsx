'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type V2TemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

const v2_isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const v2_extractApiErrorMessage = (value: unknown): string | null => {
  if (!v2_isRecord(value)) return null;
  return typeof value.error === 'string' ? value.error : null;
};

const v2_toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
};

const v2_parseTemplateList = (value: unknown): V2TemplateListItem[] => {
  if (!v2_isRecord(value)) return [];
  const templates = value.templates;
  if (!Array.isArray(templates)) return [];

  return templates
    .filter(v2_isRecord)
    .map((template) => {
      const id = typeof template.id === 'string' ? template.id : '';
      const name = typeof template.name === 'string' ? template.name : '';
      const description =
        typeof template.description === 'string' ? template.description : null;
      const createdAt =
        typeof template.created_at === 'string' ? template.created_at : '';

      if (!id || !name || !createdAt) return null;

      return {
        id,
        name,
        description,
        createdAt,
      };
    })
    .filter((template): template is V2TemplateListItem => template !== null);
};

const v2_formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return '-';
  }
};

const TemplateEditorHomePage = () => {
  const [list, setList] = useState<V2TemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplateList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/v2/templates?limit=100&offset=0', {
        method: 'GET',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(
          v2_extractApiErrorMessage(result) || '템플릿 목록 조회에 실패했습니다.'
        );
      }

      setList(v2_parseTemplateList(result));
    } catch (fetchError) {
      setError(v2_toErrorMessage(fetchError, '템플릿 목록 조회 중 오류가 발생했습니다.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplateList();
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Template Editor</h1>
          <p className="mt-2 text-sm text-slate-500">
            V2 템플릿 목록입니다. 새 템플릿은 생성 페이지에서 만듭니다.
          </p>
        </div>
        <Link
          href="/admin/template-editor/create"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          새 템플릿 만들기
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">V2 템플릿 목록</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-slate-500">목록을 불러오는 중입니다...</p>
          ) : error ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-500">생성된 V2 템플릿이 없습니다.</p>
          ) : (
            list.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.id} · {v2_formatDateTime(item.createdAt)}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                  ) : null}
                </div>
                <Link
                  href={`/admin/template-editor/${item.id}/edit`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                >
                  편집 열기
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default TemplateEditorHomePage;
