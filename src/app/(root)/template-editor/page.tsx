'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { v2_createFigmaTimeTableNode1075_5624RenderConfigResponse } from '@/app/(root)/v2-template/_data/figma-time-table-node-1075-5624-response';
import {
  v2_createDefaultTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from '@/utils/time-table/template-render-config';
import { v2_RENDER_CONFIG_STORAGE_PREFIX } from './_components/template-editor-client';

const v2_TEMPLATE_LIST_STORAGE_KEY = 'template-editor:templates';

type V2TemplateEditorListItem = {
  id: string;
  name: string;
  createdAt: number;
  isArtist: boolean;
  isMultiple: boolean;
  maxStreamingTimeByDay: number;
};

const v2_isListItem = (value: unknown): value is V2TemplateEditorListItem => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<V2TemplateEditorListItem>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.isArtist === 'boolean' &&
    typeof candidate.isMultiple === 'boolean' &&
    typeof candidate.maxStreamingTimeByDay === 'number'
  );
};

const v2_readTemplateList = (): V2TemplateEditorListItem[] => {
  try {
    const raw = window.localStorage.getItem(v2_TEMPLATE_LIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(v2_isListItem);
  } catch {
    return [];
  }
};

const v2_writeTemplateList = (list: V2TemplateEditorListItem[]) => {
  window.localStorage.setItem(v2_TEMPLATE_LIST_STORAGE_KEY, JSON.stringify(list));
};

const v2_buildStorageKey = (templateId: string) =>
  `${v2_RENDER_CONFIG_STORAGE_PREFIX}:${templateId}`;

const v2_formatDateTime = (timestamp: number) => {
  try {
    return new Date(timestamp).toLocaleString('ko-KR');
  } catch {
    return '-';
  }
};

const TemplateEditorMainPage = () => {
  const router = useRouter();
  const [templateName, setTemplateName] = useState('새 템플릿');
  const [isArtist, setIsArtist] = useState(true);
  const [isMultiple, setIsMultiple] = useState(true);
  const [maxStreamingTimeByDay, setMaxStreamingTimeByDay] = useState(3);
  const [list, setList] = useState<V2TemplateEditorListItem[]>([]);

  useEffect(() => {
    setList(v2_readTemplateList());
  }, []);

  const canCreate = useMemo(() => {
    return Number.isFinite(maxStreamingTimeByDay) && maxStreamingTimeByDay >= 1;
  }, [maxStreamingTimeByDay]);

  const handleCreateTemplate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) return;

    try {
      const templateId = crypto.randomUUID();
      const now = Date.now();
      const base =
        v2_createFigmaTimeTableNode1075_5624RenderConfigResponse().renderConfig ??
        v2_createDefaultTemplateRenderConfig();
      const normalized = v2_normalizeTemplateRenderConfig(base);
      const finalName = templateName.trim() || `template_${templateId.slice(0, 8)}`;
      const nextConfig = v2_normalizeTemplateRenderConfig({
        ...normalized,
        metadata: {
          ...normalized.metadata,
          name: finalName,
          description: `${finalName} (local draft)`,
        },
        editorOptions: {
          ...normalized.editorOptions,
          isArtist,
          isMultiple,
          maxStreamingTimeByDay: Math.max(1, Math.floor(maxStreamingTimeByDay)),
        },
      });

      window.localStorage.setItem(
        v2_buildStorageKey(templateId),
        JSON.stringify(nextConfig)
      );

      const nextItem: V2TemplateEditorListItem = {
        id: templateId,
        name: finalName,
        createdAt: now,
        isArtist,
        isMultiple,
        maxStreamingTimeByDay: Math.max(1, Math.floor(maxStreamingTimeByDay)),
      };
      const currentList = v2_readTemplateList().filter((item) => item.id !== templateId);
      const nextList = [nextItem, ...currentList];
      v2_writeTemplateList(nextList);
      setList(nextList);

      router.push(`/template-editor/${templateId}/edit`);
    } catch (error) {
      console.error('template create failed', error);
      alert('템플릿 생성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Template Editor</h1>
      <p className="mt-2 text-sm text-slate-500">
        새 템플릿을 만들고 바로 편집 페이지로 이동합니다. 현재는 localStorage 기반입니다.
      </p>

      <form
        onSubmit={handleCreateTemplate}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="template-name">
            템플릿 이름
          </label>
          <input
            id="template-name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="예: temis_basic"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isArtist}
            onChange={(event) => setIsArtist(event.target.checked)}
          />
          아티스트 영역 사용
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isMultiple}
            onChange={(event) => setIsMultiple(event.target.checked)}
          />
          다회차 시간표 사용
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="max-time">
            요일별 최대 시간 슬롯 수
          </label>
          <input
            id="max-time"
            type="number"
            min={1}
            step={1}
            value={maxStreamingTimeByDay}
            onChange={(event) =>
              setMaxStreamingTimeByDay(Number.parseInt(event.target.value, 10) || 1)
            }
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!canCreate}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          새 템플릿 만들기
        </button>
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">로컬 템플릿</h2>
        <div className="mt-3 space-y-2">
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">아직 생성된 템플릿이 없습니다.</p>
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
                </div>
                <Link
                  href={`/template-editor/${item.id}/edit`}
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

export default TemplateEditorMainPage;
