'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import type {
  V2TemplateGraphNode,
  V2TemplateNodeGraph,
  V2TemplateRenderConfig,
  V2TemplateStreamingTimeFormat,
  V2TemplateWeekDateFormat,
} from '@/types/time-table/template-render-config';
import {
  v2_createEmptyTemplateNodeGraph,
  v2_createEmptyTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig
} from '@/utils/v2/template-render-config';

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

type V2TemplateLocalePreset = 'kr' | 'en' | 'jp';
type V2TemplateTimePreset = 'h12Prefix' | 'h12Suffix' | 'h24';
type V2TemplateWeekDatePreset = 'locale' | 'ymdSlash' | 'mdySlash' | 'dmyDot';
type V2DetectedLayoutMode = 'grid3x3' | 'flex4x2' | 'free';
type V2LayoutOverrideMode = 'auto' | V2DetectedLayoutMode;
type V2StatusSourceMode = 'none' | 'shared' | 'byDay';

type V2FigmaAnalyzeResponse = {
  mode: 'matrix' | 'shared-status' | 'mixed-status';
  canImport: boolean;
  detectedStatuses: string[];
  statusCounts: Record<string, number>;
  statusSourceModeByStatus: Record<string, V2StatusSourceMode>;
  warnings: string[];
  critical: string[];
  templateNameSuggestion: string;
  layoutModeCandidate: V2DetectedLayoutMode;
  cardComponentSetSource: 'input' | 'auto-detected';
  resolvedCardComponentSetUrl: string;
};

const v2_LAYOUT_MODE_LABEL: Record<V2LayoutOverrideMode, string> = {
  auto: 'Auto',
  grid3x3: '3 x 3 (Grid)',
  flex4x2: '4 x 2 (Flex)',
  free: 'Free',
};

const v2_createTemplateBaseConfig = (): V2TemplateRenderConfig => {
  return v2_createEmptyTemplateRenderConfig();
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
  const [enableThemeSelection, setEnableThemeSelection] = useState(false);
  const [maxStreamingTimeByDay, setMaxStreamingTimeByDay] = useState(2);
  const [templateWidth, setTemplateWidth] = useState(baseConfig.templateSize.width);
  const [templateHeight, setTemplateHeight] = useState(baseConfig.templateSize.height);
  const [localePreset, setLocalePreset] = useState<V2TemplateLocalePreset>('en');
  const [timePreset, setTimePreset] = useState<V2TemplateTimePreset>('h12Prefix');
  const [weekDatePreset, setWeekDatePreset] =
    useState<V2TemplateWeekDatePreset>('mdySlash');
  const [defaultTheme, setDefaultTheme] = useState(baseConfig.defaultTheme);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [rootFigmaUrl, setRootFigmaUrl] = useState('');
  const [cardComponentSetUrl, setCardComponentSetUrl] = useState('');
  const [figmaTemplateName, setFigmaTemplateName] = useState('새 템플릿');
  const [figmaTemplateDescription, setFigmaTemplateDescription] = useState('');
  const [figmaLayoutModeOverride, setFigmaLayoutModeOverride] =
    useState<V2LayoutOverrideMode>('auto');
  const [figmaWithAssets, setFigmaWithAssets] = useState(true);
  const [figmaAnalysis, setFigmaAnalysis] = useState<V2FigmaAnalyzeResponse | null>(null);
  const [figmaAnalyzeError, setFigmaAnalyzeError] = useState<string | null>(null);
  const [figmaImportError, setFigmaImportError] = useState<string | null>(null);
  const [isAnalyzingFigma, setIsAnalyzingFigma] = useState(false);
  const [isImportingFigma, setIsImportingFigma] = useState(false);

  const canCreate = useMemo(() => {
    const maxSlotValid = Number.isFinite(maxStreamingTimeByDay) && maxStreamingTimeByDay >= 1;
    const widthValid = Number.isFinite(templateWidth) && templateWidth >= 1;
    const heightValid = Number.isFinite(templateHeight) && templateHeight >= 1;
    const themeValid = baseThemeOptions.includes(defaultTheme);
    return maxSlotValid && widthValid && heightValid && themeValid;
  }, [baseThemeOptions, defaultTheme, maxStreamingTimeByDay, templateHeight, templateWidth]);
  const canAnalyzeFigma = useMemo(() => {
    return rootFigmaUrl.trim().length > 0;
  }, [rootFigmaUrl]);
  const canImportFigma = useMemo(() => {
    return (
      canAnalyzeFigma &&
      !isAnalyzingFigma &&
      !isImportingFigma &&
      figmaAnalysis?.canImport === true &&
      figmaTemplateName.trim().length > 0
    );
  }, [
    canAnalyzeFigma,
    figmaAnalysis?.canImport,
    figmaTemplateName,
    isAnalyzingFigma,
    isImportingFigma,
  ]);

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
      const nextGraph = v2_createEmptyTemplateNodeGraph();
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
        formSchema: {
          ...normalized.formSchema,
          fields: normalized.formSchema.fields.filter((field) => {
            if (!isMemo && field.scope === 'global' && field.key === 'memoText') {
              return false;
            }
            if (!isArtist && field.scope === 'global' && field.key === 'artistText') {
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
          enableThemeSelection,
        },
      });

      const createTemplateResponse = await fetch('/api/admin/v2/templates', {
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

      router.push(`/admin/template-editor/${templateId}/edit`);
    } catch (error) {
      console.error('template create failed', error);
      setCreateError(v2_toErrorMessage(error, '템플릿 생성 중 오류가 발생했습니다.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAnalyzeFigma = async () => {
    if (!canAnalyzeFigma) return;
    setFigmaAnalyzeError(null);
    setFigmaImportError(null);
    setIsAnalyzingFigma(true);

    try {
      const response = await fetch('/api/admin/v2/templates/figma/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rootFigmaUrl: rootFigmaUrl.trim(),
          cardComponentSetUrl: cardComponentSetUrl.trim() || undefined,
          templateName: figmaTemplateName.trim() || undefined,
        }),
      });
      const result = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(
          v2_extractApiErrorMessage(result) || 'Figma 분석에 실패했습니다.'
        );
      }
      const analysis =
        v2_isRecord(result) && v2_isRecord(result.analysis)
          ? (result.analysis as unknown as V2FigmaAnalyzeResponse)
          : null;
      if (!analysis) {
        throw new Error('Figma 분석 응답이 비어 있습니다.');
      }
      setFigmaAnalysis(analysis);
      if (!cardComponentSetUrl.trim() && analysis.resolvedCardComponentSetUrl) {
        setCardComponentSetUrl(analysis.resolvedCardComponentSetUrl);
      }
      if (!figmaTemplateName.trim() && analysis.templateNameSuggestion) {
        setFigmaTemplateName(analysis.templateNameSuggestion);
      }
    } catch (error) {
      setFigmaAnalysis(null);
      setFigmaAnalyzeError(
        v2_toErrorMessage(error, 'Figma 분석 중 오류가 발생했습니다.')
      );
    } finally {
      setIsAnalyzingFigma(false);
    }
  };

  const handleImportFromFigma = async () => {
    if (!canImportFigma) return;
    setFigmaImportError(null);
    setIsImportingFigma(true);

    try {
      const response = await fetch('/api/admin/v2/templates/figma/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rootFigmaUrl: rootFigmaUrl.trim(),
          cardComponentSetUrl: cardComponentSetUrl.trim() || undefined,
          templateName: figmaTemplateName.trim(),
          templateDescription: figmaTemplateDescription.trim() || undefined,
          layoutModeOverride: figmaLayoutModeOverride,
          withAssets: figmaWithAssets,
        }),
      });
      const result = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(
          v2_extractApiErrorMessage(result) || 'Figma import에 실패했습니다.'
        );
      }

      const templateId =
        v2_isRecord(result) &&
        v2_isRecord(result.import) &&
        typeof result.import.templateId === 'string'
          ? result.import.templateId
          : null;
      if (!templateId) {
        throw new Error('Figma import 결과에서 templateId를 찾을 수 없습니다.');
      }

      router.push(`/admin/template-editor/${templateId}/edit`);
    } catch (error) {
      setFigmaImportError(
        v2_toErrorMessage(error, 'Figma import 중 오류가 발생했습니다.')
      );
    } finally {
      setIsImportingFigma(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Template Editor Create</h1>
      <p className="mt-2 text-sm text-slate-500">
        v2 템플릿을 생성하고 바로 편집 페이지로 이동합니다.
      </p>
      <button
        type="button"
        onClick={() => router.push('/admin/template-editor')}
        className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
      >
        목록으로 돌아가기
      </button>

      <section className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Import From Figma
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            루트 프레임 링크를 기준으로 구조를 분석합니다. 카드 컴포넌트셋 링크는 자동 검출이 어려울 때만 override로 넣으면 됩니다.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="figma-root-url">
              루트 프레임 링크
            </label>
            <input
              id="figma-root-url"
              value={rootFigmaUrl}
              onChange={(event) => setRootFigmaUrl(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://www.figma.com/design/..."
            />
          </div>

          <details className="rounded-md border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              고급 옵션: 카드 컴포넌트셋 링크 override
            </summary>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="figma-card-url">
                카드 컴포넌트셋 링크 (선택)
              </label>
              <input
                id="figma-card-url"
                value={cardComponentSetUrl}
                onChange={(event) => setCardComponentSetUrl(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="비워두면 root에서 자동 검출"
              />
              <p className="mt-1 text-xs text-slate-500">
                root에서 여러 카드셋 후보가 섞였거나 자동 검출이 애매할 때만 직접 입력합니다.
              </p>
            </div>
          </details>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="figma-template-name">
                템플릿 이름
              </label>
              <input
                id="figma-template-name"
                value={figmaTemplateName}
                onChange={(event) => setFigmaTemplateName(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="예: temis_shared_status"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="figma-layout-override">
                배치 방식 override
              </label>
              <select
                id="figma-layout-override"
                value={figmaLayoutModeOverride}
                onChange={(event) =>
                  setFigmaLayoutModeOverride(event.target.value as V2LayoutOverrideMode)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {Object.entries(v2_LAYOUT_MODE_LABEL).map(([value, label]) => (
                  <option key={`layout-mode-${value}`} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="figma-template-description">
              템플릿 설명
            </label>
            <textarea
              id="figma-template-description"
              rows={2}
              value={figmaTemplateDescription}
              onChange={(event) => setFigmaTemplateDescription(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="예: Figma에서 불러온 공용 카드 템플릿"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={figmaWithAssets}
              onChange={(event) => setFigmaWithAssets(event.target.checked)}
            />
            에셋도 함께 import
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAnalyzeFigma}
              disabled={!canAnalyzeFigma || isAnalyzingFigma || isImportingFigma}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAnalyzingFigma ? '분석 중...' : '분석하기'}
            </button>
            <button
              type="button"
              onClick={handleImportFromFigma}
              disabled={!canImportFigma}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isImportingFigma ? '생성 중...' : 'Figma로 템플릿 만들기'}
            </button>
          </div>
        </div>

        {figmaAnalyzeError ? (
          <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {figmaAnalyzeError}
          </p>
        ) : null}

        {figmaImportError ? (
          <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {figmaImportError}
          </p>
        ) : null}

        {figmaAnalysis ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Variant Mode
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {figmaAnalysis.mode}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Layout Candidate
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {v2_LAYOUT_MODE_LABEL[figmaAnalysis.layoutModeCandidate]}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Statuses
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {figmaAnalysis.detectedStatuses.join(', ') || '(none)'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {figmaAnalysis.detectedStatuses
                    .map(
                      (status) =>
                        `${status}:${figmaAnalysis.statusSourceModeByStatus[status] ?? 'none'}`
                    )
                    .join(' / ') || '(none)'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Card Set Source
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {figmaAnalysis.cardComponentSetSource === 'auto-detected'
                    ? 'Auto-detected from root'
                    : 'Manual input'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Resolved Card Set
                </p>
                <p className="mt-1 break-all text-sm font-medium text-slate-900">
                  {figmaAnalysis.resolvedCardComponentSetUrl || '(none)'}
                </p>
              </div>
            </div>

            {figmaAnalysis.warnings.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Warnings
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-700">
                  {figmaAnalysis.warnings.map((warning) => (
                    <li key={`figma-warning-${warning}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {figmaAnalysis.critical.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                  Critical
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-rose-700">
                  {figmaAnalysis.critical.map((critical) => (
                    <li key={`figma-critical-${critical}`}>{critical}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

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

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={enableThemeSelection}
              onChange={(event) => setEnableThemeSelection(event.target.checked)}
            />
            테마 설정 노출 (테마 2개 이상일 때만 표시)
          </label>

          <p className="text-xs text-slate-500">
            신규 템플릿은 항상 빈 구조로 생성됩니다. 필요한 오브젝트/그룹은 에디터에서 직접 추가해 주세요.
          </p>

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

    </div>
  );
};

export default TemplateEditorMainPage;
