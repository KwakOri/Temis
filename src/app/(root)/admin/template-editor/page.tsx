'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { v2_createFigmaTimeTableNode1075_5624RenderConfigResponse } from '@/app/(root)/v2-template/_data/figma-time-table-node-1075-5624-response';
import type {
  V2TemplateGraphNode,
  V2TemplateNodeGraph,
  V2TemplateRenderConfig,
  V2TemplateStreamingTimeFormat,
  V2TemplateWeekDateFormat,
} from '@/types/time-table/template-render-config';
import {
  v2_createDefaultTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from '@/utils/time-table/template-render-config';

type V2AdminTemplateListItem = {
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

const v2_parseTemplateList = (value: unknown): V2AdminTemplateListItem[] => {
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
    .filter((template): template is V2AdminTemplateListItem => template !== null);
};

type V2TemplateLocalePreset = 'kr' | 'en' | 'jp';
type V2TemplateTimePreset = 'h12Prefix' | 'h12Suffix' | 'h24';
type V2TemplateWeekDatePreset = 'locale' | 'ymdSlash' | 'mdySlash' | 'dmyDot';
type V2TemplateStartMode = 'figmaPreset' | 'empty';

const v2_createTemplateBaseConfig = (): V2TemplateRenderConfig => {
  const base =
    v2_createFigmaTimeTableNode1075_5624RenderConfigResponse().renderConfig ??
    v2_createDefaultTemplateRenderConfig();
  return v2_normalizeTemplateRenderConfig(base);
};

const v2_resolveThemeOptions = (config: V2TemplateRenderConfig): string[] => {
  const baseThemes =
    config.themes?.length && Array.isArray(config.themes)
      ? config.themes
      : [config.defaultTheme || 'first'];
  if (!baseThemes.includes(config.defaultTheme)) {
    return [...baseThemes, config.defaultTheme];
  }
  return baseThemes;
};

const v2_applyTimePreset = (
  base: V2TemplateStreamingTimeFormat,
  preset: V2TemplateTimePreset
): V2TemplateStreamingTimeFormat => {
  if (preset === 'h24') {
    return {
      ...base,
      hourCycle: 'h24',
      padHour: true,
      showMeridiem: false,
      meridiemPosition: 'suffix',
      meridiemStyle: 'upper',
      meridiemSeparator: '',
      timeSeparator: base.timeSeparator || ':',
    };
  }

  if (preset === 'h12Suffix') {
    return {
      ...base,
      hourCycle: 'h12',
      padHour: true,
      showMeridiem: true,
      meridiemPosition: 'suffix',
      meridiemStyle: 'upper',
      meridiemSeparator: base.meridiemSeparator || ' ',
      timeSeparator: base.timeSeparator || ':',
    };
  }

  return {
    ...base,
    hourCycle: 'h12',
    padHour: true,
    showMeridiem: true,
    meridiemPosition: 'prefix',
    meridiemStyle: 'upper',
    meridiemSeparator: base.meridiemSeparator || ' ',
    timeSeparator: base.timeSeparator || ':',
  };
};

const v2_applyWeekDatePreset = (
  base: V2TemplateWeekDateFormat,
  preset: V2TemplateWeekDatePreset
): V2TemplateWeekDateFormat => {
  if (preset === 'ymdSlash') {
    return {
      ...base,
      dateOrder: 'ymd',
      monthStyle: 'numeric',
      dateStyle: 'numeric',
      dateSeparator: '/',
      monthDateSeparator: '/',
      rangeSeparator: ' - ',
    };
  }

  if (preset === 'mdySlash') {
    return {
      ...base,
      dateOrder: 'mdy',
      monthStyle: 'numeric',
      dateStyle: 'numeric',
      dateSeparator: '/',
      monthDateSeparator: '/',
      rangeSeparator: ' - ',
    };
  }

  if (preset === 'dmyDot') {
    return {
      ...base,
      dateOrder: 'dmy',
      monthStyle: '2-digit',
      dateStyle: '2-digit',
      dateSeparator: '.',
      monthDateSeparator: '.',
      rangeSeparator: ' - ',
    };
  }

  return base;
};

const v2_OPTIONAL_SCENE_ROOT_IDS = {
  artist: ['scene-artist'],
  profile: ['scene-profile'],
  memo: ['scene-memo-object', 'scene-memo-text'],
} as const;

const v2_OPTIONAL_SCENE_ROOT_ID_SET = new Set<string>(
  Object.values(v2_OPTIONAL_SCENE_ROOT_IDS).flat()
);

const v2_cloneGraphNode = (node: V2TemplateGraphNode): V2TemplateGraphNode => ({
  ...node,
  childIds: [...node.childIds],
  ...(node.order ? { order: { ...node.order } } : {}),
  ...(node.styles ? { styles: { ...node.styles } } : {}),
  ...(node.meta ? { meta: { ...node.meta } } : {}),
  ...(node.binding ? { binding: { ...node.binding } } : {}),
});

const v2_collectSubtreeNodeIds = ({
  graph,
  startNodeId,
  bucket,
}: {
  graph: V2TemplateNodeGraph;
  startNodeId: string;
  bucket: Set<string>;
}) => {
  const queue = [startNodeId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;
    if (bucket.has(currentId)) continue;

    const currentNode = graph.nodes[currentId];
    if (!currentNode) continue;

    bucket.add(currentId);
    queue.push(...currentNode.childIds);
  }
};

const v2_collectReferencedComponentIds = ({
  graph,
  nodeIds,
}: {
  graph: V2TemplateNodeGraph;
  nodeIds: Set<string>;
}) => {
  const componentIds = new Set<string>();
  nodeIds.forEach((nodeId) => {
    const node = graph.nodes[nodeId];
    if (!node) return;
    const componentId = node.meta?.componentId;
    if (typeof componentId === 'string' && componentId.trim().length > 0) {
      componentIds.add(componentId);
    }
  });
  return componentIds;
};

const v2_buildGraphForTemplateCreate = ({
  sourceGraph,
  includeArtist,
  includeProfile,
  includeMemo,
}: {
  sourceGraph: V2TemplateNodeGraph;
  includeArtist: boolean;
  includeProfile: boolean;
  includeMemo: boolean;
}): V2TemplateNodeGraph => {
  const selectedOptionalRootIds = new Set<string>();
  if (includeArtist) {
    v2_OPTIONAL_SCENE_ROOT_IDS.artist.forEach((rootId) =>
      selectedOptionalRootIds.add(rootId)
    );
  }
  if (includeProfile) {
    v2_OPTIONAL_SCENE_ROOT_IDS.profile.forEach((rootId) =>
      selectedOptionalRootIds.add(rootId)
    );
  }
  if (includeMemo) {
    v2_OPTIONAL_SCENE_ROOT_IDS.memo.forEach((rootId) =>
      selectedOptionalRootIds.add(rootId)
    );
  }

  const nextRootNodeIds = sourceGraph.rootNodeIds.filter((rootId) => {
    if (!v2_OPTIONAL_SCENE_ROOT_ID_SET.has(rootId)) return true;
    return selectedOptionalRootIds.has(rootId);
  });

  const nodeIdsToKeep = new Set<string>();
  nextRootNodeIds.forEach((rootId) => {
    v2_collectSubtreeNodeIds({ graph: sourceGraph, startNodeId: rootId, bucket: nodeIdsToKeep });
  });

  const nextComponentDefinitions: V2TemplateNodeGraph['componentDefinitions'] = {};
  const queuedComponentIds = Array.from(
    v2_collectReferencedComponentIds({
      graph: sourceGraph,
      nodeIds: nodeIdsToKeep,
    })
  );

  while (queuedComponentIds.length > 0) {
    const componentId = queuedComponentIds.shift();
    if (!componentId) continue;
    if (nextComponentDefinitions[componentId]) continue;

    const definition = sourceGraph.componentDefinitions[componentId];
    if (!definition) continue;
    nextComponentDefinitions[componentId] = {
      ...definition,
      ...(definition.instanceTransforms
        ? { instanceTransforms: { ...definition.instanceTransforms } }
        : {}),
    };
    v2_collectSubtreeNodeIds({
      graph: sourceGraph,
      startNodeId: definition.rootNodeId,
      bucket: nodeIdsToKeep,
    });

    const nestedRefs = v2_collectReferencedComponentIds({
      graph: sourceGraph,
      nodeIds: nodeIdsToKeep,
    });
    nestedRefs.forEach((nestedComponentId) => {
      if (!nextComponentDefinitions[nestedComponentId]) {
        queuedComponentIds.push(nestedComponentId);
      }
    });
  }

  const nextNodes: V2TemplateNodeGraph['nodes'] = {};
  nodeIdsToKeep.forEach((nodeId) => {
    const sourceNode = sourceGraph.nodes[nodeId];
    if (!sourceNode) return;
    nextNodes[nodeId] = v2_cloneGraphNode(sourceNode);
  });

  Object.values(nextNodes).forEach((node) => {
    node.childIds = node.childIds.filter((childId) => Boolean(nextNodes[childId]));
    if (node.parentId && !nextNodes[node.parentId]) {
      node.parentId = null;
    }
  });

  const sanitizedRootNodeIds = nextRootNodeIds.filter((rootId) => Boolean(nextNodes[rootId]));

  return {
    rootNodeIds: sanitizedRootNodeIds,
    nodes: nextNodes,
    componentDefinitions: nextComponentDefinitions,
  };
};

const v2_createEmptyTemplateGraph = (): V2TemplateNodeGraph => ({
  rootNodeIds: [],
  nodes: {},
  componentDefinitions: {},
});

const v2_formatDateTime = (value: string | number | null | undefined) => {
  try {
    if (typeof value === 'number') {
      return new Date(value).toLocaleString('ko-KR');
    }
    if (typeof value === 'string') {
      return new Date(value).toLocaleString('ko-KR');
    }
    return '-';
  } catch {
    return '-';
  }
};

const TemplateEditorMainPage = () => {
  const router = useRouter();
  const baseConfig = useMemo(() => v2_createTemplateBaseConfig(), []);
  const baseThemeOptions = useMemo(
    () => v2_resolveThemeOptions(baseConfig),
    [baseConfig]
  );

  const [templateName, setTemplateName] = useState('새 템플릿');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isArtist, setIsArtist] = useState(true);
  const [isProfile, setIsProfile] = useState(true);
  const [isMemo, setIsMemo] = useState(true);
  const [isMultiple, setIsMultiple] = useState(true);
  const [maxStreamingTimeByDay, setMaxStreamingTimeByDay] = useState(2);
  const [templateWidth, setTemplateWidth] = useState(baseConfig.templateSize.width);
  const [templateHeight, setTemplateHeight] = useState(baseConfig.templateSize.height);
  const [localePreset, setLocalePreset] = useState<V2TemplateLocalePreset>('en');
  const [timePreset, setTimePreset] = useState<V2TemplateTimePreset>('h12Prefix');
  const [weekDatePreset, setWeekDatePreset] =
    useState<V2TemplateWeekDatePreset>('mdySlash');
  const [startMode, setStartMode] = useState<V2TemplateStartMode>('figmaPreset');
  const [defaultTheme, setDefaultTheme] = useState(baseConfig.defaultTheme);
  const [profileTextPlaceholder, setProfileTextPlaceholder] = useState(
    baseConfig.profileTextPlaceholder
  );
  const [list, setList] = useState<V2AdminTemplateListItem[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadTemplateList = async () => {
    setIsListLoading(true);
    setListError(null);
    try {
      const response = await fetch('/api/admin/templates?limit=100&offset=0', {
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
    } catch (error) {
      setListError(v2_toErrorMessage(error, '템플릿 목록 조회 중 오류가 발생했습니다.'));
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplateList();
  }, []);

  const canCreate = useMemo(() => {
    const maxSlotValid = Number.isFinite(maxStreamingTimeByDay) && maxStreamingTimeByDay >= 1;
    const widthValid = Number.isFinite(templateWidth) && templateWidth >= 1;
    const heightValid = Number.isFinite(templateHeight) && templateHeight >= 1;
    const themeValid = baseThemeOptions.includes(defaultTheme);
    return maxSlotValid && widthValid && heightValid && themeValid;
  }, [baseThemeOptions, defaultTheme, maxStreamingTimeByDay, templateHeight, templateWidth]);

  const handleCreateTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) return;
    setCreateError(null);
    setIsCreating(true);

    try {
      const normalized = v2_createTemplateBaseConfig();
      const fallbackNameSuffix = Math.random().toString(36).slice(2, 10);
      const finalName = templateName.trim() || `template_${fallbackNameSuffix}`;
      const finalDescription =
        templateDescription.trim() || `${finalName} (admin template)`;
      const normalizedMaxSlot = isMultiple
        ? maxStreamingTimeByDay >= 2
          ? 2
          : 1
        : 1;
      const width = Math.max(1, Math.round(templateWidth));
      const height = Math.max(1, Math.round(templateHeight));
      const resolvedDefaultTheme = baseThemeOptions.includes(defaultTheme)
        ? defaultTheme
        : baseThemeOptions[0];
      const nextThemeOptions = resolvedDefaultTheme
        ? baseThemeOptions.includes(resolvedDefaultTheme)
          ? baseThemeOptions
          : [...baseThemeOptions, resolvedDefaultTheme]
        : baseThemeOptions;
      const nextProfileTextPlaceholder =
        profileTextPlaceholder.trim() || normalized.profileTextPlaceholder;
      const nextGraph =
        startMode === 'empty'
          ? v2_createEmptyTemplateGraph()
          : v2_buildGraphForTemplateCreate({
              sourceGraph: normalized.graph,
              includeArtist: isArtist,
              includeProfile: isProfile,
              includeMemo: isMemo,
            });
      const nextConfig = v2_normalizeTemplateRenderConfig({
        ...normalized,
        metadata: {
          ...normalized.metadata,
          name: finalName,
          description: finalDescription,
        },
        templateSize: {
          width,
          height,
        },
        weekdayOption: localePreset,
        dayLabelFormat: {
          mode: 'preset',
          preset: localePreset,
          custom: {},
        },
        monthOption: localePreset,
        streamingDayFormat: {
          ...normalized.streamingDayFormat,
          locale: localePreset,
          custom: {},
        },
        streamingTimeFormat: v2_applyTimePreset(
          normalized.streamingTimeFormat,
          timePreset
        ),
        weekDateFormat: v2_applyWeekDatePreset(
          {
            ...normalized.weekDateFormat,
            locale: localePreset,
          },
          weekDatePreset
        ),
        themes: nextThemeOptions,
        defaultTheme: resolvedDefaultTheme || normalized.defaultTheme,
        buttonThemes: nextThemeOptions.map((theme) => ({ value: theme, label: theme })),
        profileTextPlaceholder: nextProfileTextPlaceholder,
        formSchema: {
          ...normalized.formSchema,
          fields: normalized.formSchema.fields.filter((field) => {
            if (!isMemo && field.scope === 'global' && field.key === 'memoText') {
              return false;
            }
            if (!isArtist && field.scope === 'global' && field.key === 'profileText') {
              return false;
            }
            return true;
          }),
        },
        cardSizes: {
          ...normalized.cardSizes,
          frame: {
            ...normalized.cardSizes.frame,
            width,
            height,
          },
        },
        layout: {
          ...normalized.layout,
          topObjectContainer: {
            ...normalized.layout.topObjectContainer,
            width,
            height,
          },
        },
        graph: nextGraph,
        editorOptions: {
          ...normalized.editorOptions,
          isArtist,
          isMultiple,
          maxStreamingTimeByDay: normalizedMaxSlot,
        },
      });

      const createTemplateResponse = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: finalName,
          description: finalDescription,
          is_public: false,
        }),
      });
      const createTemplateResult = (await createTemplateResponse
        .json()
        .catch(() => null)) as unknown;
      if (!createTemplateResponse.ok) {
        throw new Error(
          v2_extractApiErrorMessage(createTemplateResult) ||
            '템플릿 생성에 실패했습니다.'
        );
      }

      const templateId =
        v2_isRecord(createTemplateResult) &&
        v2_isRecord(createTemplateResult.template) &&
        typeof createTemplateResult.template.id === 'string'
          ? createTemplateResult.template.id
          : null;
      if (!templateId) {
        throw new Error('생성된 템플릿 ID를 확인할 수 없습니다.');
      }

      const saveRenderConfigResponse = await fetch(
        `/api/admin/v2/templates/${templateId}/render-config`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            configVersion: nextConfig.version,
            renderConfig: nextConfig,
          }),
        }
      );
      const saveRenderConfigResult = (await saveRenderConfigResponse
        .json()
        .catch(() => null)) as unknown;
      if (!saveRenderConfigResponse.ok) {
        throw new Error(
          v2_extractApiErrorMessage(saveRenderConfigResult) ||
            '템플릿 render-config 저장에 실패했습니다.'
        );
      }

      await loadTemplateList();

      router.push(`/admin/template-editor/${templateId}/edit`);
    } catch (error) {
      console.error('template create failed', error);
      setCreateError(v2_toErrorMessage(error, '템플릿 생성 중 오류가 발생했습니다.'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Template Editor</h1>
      <p className="mt-2 text-sm text-slate-500">
        새 템플릿을 DB에 생성하고 바로 편집 페이지로 이동합니다.
      </p>

      <form
        onSubmit={handleCreateTemplate}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      >
        <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <h2 className="text-sm font-semibold text-slate-900">필수 설정</h2>

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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="template-description">
              템플릿 설명
            </label>
            <textarea
              id="template-description"
              rows={2}
              value={templateDescription}
              onChange={(event) => setTemplateDescription(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="예: 팬카페 주간 업로드용 기본 템플릿"
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
              checked={isProfile}
              onChange={(event) => setIsProfile(event.target.checked)}
            />
            프로필 영역 사용
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isMemo}
              onChange={(event) => setIsMemo(event.target.checked)}
            />
            메모 영역 사용
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
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="start-mode">
              시작 구조
            </label>
            <select
              id="start-mode"
              value={startMode}
              onChange={(event) => setStartMode(event.target.value as V2TemplateStartMode)}
              className="w-60 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="figmaPreset">기본 프리셋으로 시작</option>
              <option value="empty">빈 구조로 시작</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              빈 구조를 선택하면 루트 노드 없이 생성되며, 이후 에디터에서 노드를 직접 추가합니다.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="max-time">
              요일별 최대 시간 슬롯 수
            </label>
            <select
              id="max-time"
              value={isMultiple ? maxStreamingTimeByDay : 1}
              onChange={(event) =>
                setMaxStreamingTimeByDay(Number.parseInt(event.target.value, 10) >= 2 ? 2 : 1)
              }
              disabled={!isMultiple}
              className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={1}>1회차</option>
              <option value={2}>2회차</option>
            </select>
          </div>
        </section>

        <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            고급 설정
          </summary>

          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="template-width">
                  캔버스 가로
                </label>
                <input
                  id="template-width"
                  type="number"
                  min={1}
                  step={1}
                  value={templateWidth}
                  onChange={(event) =>
                    setTemplateWidth(Number.parseInt(event.target.value, 10) || 1)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="template-height">
                  캔버스 세로
                </label>
                <input
                  id="template-height"
                  type="number"
                  min={1}
                  step={1}
                  value={templateHeight}
                  onChange={(event) =>
                    setTemplateHeight(Number.parseInt(event.target.value, 10) || 1)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="locale-preset">
                  언어 프리셋
                </label>
                <select
                  id="locale-preset"
                  value={localePreset}
                  onChange={(event) =>
                    setLocalePreset(event.target.value as V2TemplateLocalePreset)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="kr">한국어 (kr)</option>
                  <option value="en">영어 (en)</option>
                  <option value="jp">일본어 (jp)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="default-theme">
                  기본 테마
                </label>
                <select
                  id="default-theme"
                  value={defaultTheme}
                  onChange={(event) => setDefaultTheme(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {baseThemeOptions.map((theme) => (
                    <option key={`create-theme-${theme}`} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="time-preset">
                  시간 포맷 프리셋
                </label>
                <select
                  id="time-preset"
                  value={timePreset}
                  onChange={(event) =>
                    setTimePreset(event.target.value as V2TemplateTimePreset)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="h12Prefix">12시간제 (AM/PM 앞)</option>
                  <option value="h12Suffix">12시간제 (AM/PM 뒤)</option>
                  <option value="h24">24시간제</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="week-date-preset">
                  주간 날짜 포맷 프리셋
                </label>
                <select
                  id="week-date-preset"
                  value={weekDatePreset}
                  onChange={(event) =>
                    setWeekDatePreset(event.target.value as V2TemplateWeekDatePreset)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="locale">기본(locale)</option>
                  <option value="ymdSlash">Y/M/D</option>
                  <option value="mdySlash">M/D/Y</option>
                  <option value="dmyDot">D.M.Y</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="artist-placeholder">
                아티스트 기본 문구
              </label>
              <input
                id="artist-placeholder"
                value={profileTextPlaceholder}
                onChange={(event) => setProfileTextPlaceholder(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="예: 아티스트 명"
              />
            </div>
          </div>
        </details>

        {createError ? (
          <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {createError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canCreate || isCreating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isCreating ? '생성 중...' : '새 템플릿 만들기'}
        </button>
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">템플릿 목록</h2>
        <div className="mt-3 space-y-2">
          {isListLoading ? (
            <p className="text-sm text-slate-500">목록을 불러오는 중입니다...</p>
          ) : listError ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {listError}
            </p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-500">생성된 템플릿이 없습니다.</p>
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

export default TemplateEditorMainPage;
