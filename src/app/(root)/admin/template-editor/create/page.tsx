'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';
import type {
  V2TemplateRenderConfig,
  V2TemplateStreamingTimeFormat,
  V2TemplateTimetableFlex42Align,
  V2TemplateTimetableFlex42ThreeRow,
  V2TemplateTimetableGridLayoutMode,
  V2TemplateWeekDateFormat,
} from '@/types/time-table/template-render-config';
import {
  v2_clampTimetableCardComponentCount,
  v2_clampTimetableMultiEntryCount,
  v2_createDefaultTimetableConfig,
  v2_createDefaultSceneTemplateNodeGraph,
  v2_createEmptyTemplateRenderConfig,
  v2_MAX_TIMETABLE_CARD_COMPONENT_COUNT,
  v2_createTimetableMultiEntryFrameStyle,
  v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT,
  v2_MIN_TIMETABLE_CARD_COMPONENT_COUNT,
  v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT,
  v2_normalizeTemplateRenderConfig,
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

const v2_MULTI_ENTRY_COUNT_OPTIONS = Array.from(
  {
    length:
      v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT -
      v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT +
      1,
  },
  (_, index) => v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT + index
);

const v2_CARD_COMPONENT_COUNT_OPTIONS = Array.from(
  {
    length:
      v2_MAX_TIMETABLE_CARD_COMPONENT_COUNT -
      v2_MIN_TIMETABLE_CARD_COMPONENT_COUNT +
      1,
  },
  (_, index) => v2_MIN_TIMETABLE_CARD_COMPONENT_COUNT + index
);

const v2_LAYOUT_MODE_OPTIONS: Array<{
  value: V2TemplateTimetableGridLayoutMode;
  label: string;
  description: string;
}> = [
  {
    value: 'grid3x3',
    label: '3 x 3',
    description: '고정 그리드',
  },
  {
    value: 'flex4x2',
    label: '4 x 2',
    description: '4칸/3칸 행',
  },
  {
    value: 'free',
    label: '자유배치',
    description: '슬롯별 위치',
  },
];

const v2_LOCALE_PRESET_LABELS: Record<V2TemplateLocalePreset, string> = {
  kr: '한국어',
  en: '영어',
  jp: '일본어',
};

const v2_TIME_PRESET_LABELS: Record<V2TemplateTimePreset, string> = {
  h12Prefix: '12시간제 AM/PM 앞',
  h12Suffix: '12시간제 AM/PM 뒤',
  h24: '24시간제',
};

const v2_WEEK_DATE_PRESET_LABELS: Record<V2TemplateWeekDatePreset, string> = {
  locale: '기본 locale',
  ymdSlash: 'Y/M/D',
  mdySlash: 'M/D/Y',
  dmyDot: 'D.M.Y',
};

const v2_FLEX42_THREE_ROW_LABELS: Record<
  V2TemplateTimetableFlex42ThreeRow,
  string
> = {
  top: '위',
  bottom: '아래',
};

const v2_FLEX42_ALIGN_LABELS: Record<V2TemplateTimetableFlex42Align, string> = {
  left: '왼쪽',
  center: '가운데',
  right: '오른쪽',
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
  const [isMemo, setIsMemo] = useState(true);
  const [isMultiple, setIsMultiple] = useState(true);
  const [useOfflineMemo, setUseOfflineMemo] = useState(true);
  const [enableThemeSelection, setEnableThemeSelection] = useState(false);
  const [maxStreamingTimeByDay, setMaxStreamingTimeByDay] = useState(2);
  const [cardComponentCount, setCardComponentCount] = useState(1);
  const [layoutMode, setLayoutMode] =
    useState<V2TemplateTimetableGridLayoutMode>('grid3x3');
  const [flex42ThreeRow, setFlex42ThreeRow] =
    useState<V2TemplateTimetableFlex42ThreeRow>('bottom');
  const [flex42Align, setFlex42Align] =
    useState<V2TemplateTimetableFlex42Align>('center');
  const [templateWidth, setTemplateWidth] = useState(baseConfig.templateSize.width);
  const [templateHeight, setTemplateHeight] = useState(baseConfig.templateSize.height);
  const [localePreset, setLocalePreset] = useState<V2TemplateLocalePreset>('en');
  const [timePreset, setTimePreset] = useState<V2TemplateTimePreset>('h12Prefix');
  const [weekDatePreset, setWeekDatePreset] =
    useState<V2TemplateWeekDatePreset>('mdySlash');
  const [defaultTheme, setDefaultTheme] = useState(baseConfig.defaultTheme);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = useMemo(() => {
    const maxSlotValid =
      !isMultiple ||
      (Number.isFinite(maxStreamingTimeByDay) &&
        maxStreamingTimeByDay >= v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT &&
        maxStreamingTimeByDay <= v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT);
    const widthValid = Number.isFinite(templateWidth) && templateWidth >= 1;
    const heightValid = Number.isFinite(templateHeight) && templateHeight >= 1;
    const componentCountValid =
      Number.isFinite(cardComponentCount) &&
      cardComponentCount >= v2_MIN_TIMETABLE_CARD_COMPONENT_COUNT &&
      cardComponentCount <= v2_MAX_TIMETABLE_CARD_COMPONENT_COUNT;
    const themeValid = baseThemeOptions.includes(defaultTheme);
    return (
      maxSlotValid &&
      widthValid &&
      heightValid &&
      componentCountValid &&
      themeValid
    );
  }, [
    baseThemeOptions,
    cardComponentCount,
    defaultTheme,
    isMultiple,
    maxStreamingTimeByDay,
    templateHeight,
    templateWidth,
  ]);

  const selectedLayoutOption = useMemo(
    () =>
      v2_LAYOUT_MODE_OPTIONS.find((option) => option.value === layoutMode) ??
      v2_LAYOUT_MODE_OPTIONS[0],
    [layoutMode]
  );

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
      const normalizedMultiEntryCount = isMultiple
        ? v2_clampTimetableMultiEntryCount(maxStreamingTimeByDay)
        : v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT;
      const normalizedMaxSlot = isMultiple ? normalizedMultiEntryCount : 1;
      const normalizedCardComponentCount =
        v2_clampTimetableCardComponentCount(cardComponentCount);
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
      const nextGraph = v2_createDefaultSceneTemplateNodeGraph({
        includeArtist: isArtist,
        includeMemo: isMemo,
      });
      const nextTimetable = v2_createDefaultTimetableConfig({
        multiEntryCount: normalizedMultiEntryCount,
        componentCount: normalizedCardComponentCount,
        statusOptions: {
          multi: isMultiple,
          offlineMemo: useOfflineMemo,
        },
      });
      nextTimetable.layoutMode = layoutMode;
      nextTimetable.flex42Align = flex42Align;
      nextTimetable.flex42ThreeRow = flex42ThreeRow;
      const nextCardLayout = {
        ...normalized.layout.card,
      };
      Array.from({ length: normalizedMultiEntryCount }, (_, entryIndex) => {
        nextCardLayout[`multiEntryFrame${entryIndex + 1}`] =
          v2_createTimetableMultiEntryFrameStyle({
            entryIndex,
            entryCount: normalizedMultiEntryCount,
          });
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
        formSchema: {
          ...normalized.formSchema,
          fields: normalized.formSchema.fields.filter((field) => {
            if (!isMemo && field.scope === 'global' && field.key === 'memoText') {
              return false;
            }
            if (!isArtist && field.scope === 'global' && field.key === 'artistText') {
              return false;
            }
            if (
              !useOfflineMemo &&
              field.scope === 'card' &&
              field.key === 'offlineMemo'
            ) {
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
          card: nextCardLayout,
          topObjectContainer: {
            ...normalized.layout.topObjectContainer,
            width,
            height,
          },
        },
        graph: nextGraph,
        timetable: nextTimetable,
        editorOptions: {
          ...normalized.editorOptions,
          isArtist,
          isMemo,
          isMultiple,
          maxStreamingTimeByDay: normalizedMaxSlot,
          useOfflineMemoAssetsByDay: useOfflineMemo,
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

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Template Editor
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            새 시간표 템플릿 만들기
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            빈 캔버스에서 시작하고 Grid/Card 기본 구조만 생성합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/template-editor')}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          목록으로 돌아가기
        </button>
      </div>

      <form
        onSubmit={handleCreateTemplate}
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="rounded-xl border border-slate-200 bg-white">
          <section className="space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-950">기본 정보</h2>
              <p className="mt-1 text-sm text-slate-500">
                관리 목록과 편집 화면에서 사용할 이름을 정합니다.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="template-name"
                >
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
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="template-description"
                >
                  템플릿 설명
                </label>
                <input
                  id="template-description"
                  value={templateDescription}
                  onChange={(event) => setTemplateDescription(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="예: 팬카페 주간 업로드용 기본 템플릿"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-950">시간표 구조</h2>
              <p className="mt-1 text-sm text-slate-500">
                요일 슬롯 Grid와 Card 상태의 기본 구조를 설정합니다.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">배치 방식</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {v2_LAYOUT_MODE_OPTIONS.map((option) => {
                  const isSelected = layoutMode === option.value;
                  return (
                    <button
                      key={`layout-mode-${option.value}`}
                      type="button"
                      onClick={() => setLayoutMode(option.value)}
                      className={`rounded-md border px-3 py-2 text-left text-sm ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block font-semibold">{option.label}</span>
                      <span
                        className={`mt-1 block text-xs ${
                          isSelected ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              {layoutMode === 'flex4x2' ? (
                <div className="mt-3 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium text-slate-700"
                      htmlFor="flex42-three-row"
                    >
                      3칸 줄
                    </label>
                    <select
                      id="flex42-three-row"
                      value={flex42ThreeRow}
                      onChange={(event) =>
                        setFlex42ThreeRow(
                          event.target.value as V2TemplateTimetableFlex42ThreeRow
                        )
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="top">위</option>
                      <option value="bottom">아래</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium text-slate-700"
                      htmlFor="flex42-align"
                    >
                      3칸 정렬
                    </label>
                    <select
                      id="flex42-align"
                      value={flex42Align}
                      onChange={(event) =>
                        setFlex42Align(
                          event.target.value as V2TemplateTimetableFlex42Align
                        )
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="left">왼쪽</option>
                      <option value="center">가운데</option>
                      <option value="right">오른쪽</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Card 상태</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled
                  aria-pressed="true"
                  className="flex min-h-[76px] cursor-default items-start justify-between rounded-md border border-slate-900 bg-slate-900 px-3 py-3 text-left text-sm text-white"
                >
                  <span>
                    <span className="block font-semibold">온라인</span>
                    <span className="mt-1 block text-xs text-slate-200">
                      기본 필수 상태
                    </span>
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-900">
                    필수
                  </span>
                </button>
                <button
                  type="button"
                  disabled
                  aria-pressed="true"
                  className="flex min-h-[76px] cursor-default items-start justify-between rounded-md border border-slate-900 bg-slate-900 px-3 py-3 text-left text-sm text-white"
                >
                  <span>
                    <span className="block font-semibold">오프라인</span>
                    <span className="mt-1 block text-xs text-slate-200">
                      기본 필수 상태
                    </span>
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-900">
                    필수
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={useOfflineMemo}
                  onClick={() => setUseOfflineMemo((current) => !current)}
                  className={`flex min-h-[76px] items-start justify-between rounded-md border px-3 py-3 text-left text-sm transition ${
                    useOfflineMemo
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    <span className="block font-semibold">오프라인 메모</span>
                    <span
                      className={`mt-1 block text-xs ${
                        useOfflineMemo ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      메모 전용 상태
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      useOfflineMemo
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {useOfflineMemo ? '사용' : '미사용'}
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={isMultiple}
                  onClick={() => setIsMultiple((current) => !current)}
                  className={`flex min-h-[76px] items-start justify-between rounded-md border px-3 py-3 text-left text-sm transition ${
                    isMultiple
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>
                    <span className="block font-semibold">다회차</span>
                    <span
                      className={`mt-1 block text-xs ${
                        isMultiple ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      Entry Frame 생성
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isMultiple
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isMultiple ? '사용' : '미사용'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="card-component-count"
                >
                  초기 Card 컴포넌트 수
                </label>
                <select
                  id="card-component-count"
                  value={cardComponentCount}
                  onChange={(event) =>
                    setCardComponentCount(
                      v2_clampTimetableCardComponentCount(event.target.value)
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {v2_CARD_COMPONENT_COUNT_OPTIONS.map((componentCount) => (
                    <option
                      key={`card-component-count-${componentCount}`}
                      value={componentCount}
                    >
                      {componentCount}개
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  요일 슬롯에 할당할 후보 Card 컴포넌트를 미리 만듭니다.
                </p>
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="multi-entry-count"
                >
                  다회차 수
                </label>
                <select
                  id="multi-entry-count"
                  value={maxStreamingTimeByDay}
                  onChange={(event) =>
                    setMaxStreamingTimeByDay(
                      v2_clampTimetableMultiEntryCount(event.target.value)
                    )
                  }
                  disabled={!isMultiple}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {v2_MULTI_ENTRY_COUNT_OPTIONS.map((entryCount) => (
                    <option
                      key={`multi-entry-count-${entryCount}`}
                      value={entryCount}
                    >
                      {entryCount}회차
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  다회차 상태를 사용할 때 Entry Frame이 이 수만큼 생성됩니다.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-950">입력 데이터</h2>
              <p className="mt-1 text-sm text-slate-500">
                사용자 Form에서 받을 전역 입력 필드를 선택합니다.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={isArtist}
                onClick={() => setIsArtist((current) => !current)}
                className={`flex min-h-[76px] items-start justify-between rounded-md border px-3 py-3 text-left text-sm transition ${
                  isArtist
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>
                  <span className="block font-semibold">아티스트</span>
                  <span
                    className={`mt-1 block text-xs ${
                      isArtist ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    전역 아티스트 입력
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isArtist
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isArtist ? '사용' : '미사용'}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={isMemo}
                onClick={() => setIsMemo((current) => !current)}
                className={`flex min-h-[76px] items-start justify-between rounded-md border px-3 py-3 text-left text-sm transition ${
                  isMemo
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>
                  <span className="block font-semibold">메모</span>
                  <span
                    className={`mt-1 block text-xs ${
                      isMemo ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    전역 메모 입력
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isMemo
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isMemo ? '사용' : '미사용'}
                </span>
              </button>
            </div>
          </section>

          <details className="border-t border-slate-200 p-5">
            <summary className="cursor-pointer text-base font-semibold text-slate-950">
              고급 설정
            </summary>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-slate-700"
                    htmlFor="template-width"
                  >
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
                  <label
                    className="mb-1 block text-sm font-medium text-slate-700"
                    htmlFor="template-height"
                  >
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
                  <label
                    className="mb-1 block text-sm font-medium text-slate-700"
                    htmlFor="locale-preset"
                  >
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
                    <option value="kr">한국어</option>
                    <option value="en">영어</option>
                    <option value="jp">일본어</option>
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-slate-700"
                    htmlFor="default-theme"
                  >
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
                  <label
                    className="mb-1 block text-sm font-medium text-slate-700"
                    htmlFor="time-preset"
                  >
                    시간 포맷
                  </label>
                  <select
                    id="time-preset"
                    value={timePreset}
                    onChange={(event) =>
                      setTimePreset(event.target.value as V2TemplateTimePreset)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="h12Prefix">12시간제 AM/PM 앞</option>
                    <option value="h12Suffix">12시간제 AM/PM 뒤</option>
                    <option value="h24">24시간제</option>
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-slate-700"
                    htmlFor="week-date-preset"
                  >
                    주간 날짜 포맷
                  </label>
                  <select
                    id="week-date-preset"
                    value={weekDatePreset}
                    onChange={(event) =>
                      setWeekDatePreset(event.target.value as V2TemplateWeekDatePreset)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="locale">기본 locale</option>
                    <option value="ymdSlash">Y/M/D</option>
                    <option value="mdySlash">M/D/Y</option>
                    <option value="dmyDot">D.M.Y</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={enableThemeSelection}
                  onChange={(event) => setEnableThemeSelection(event.target.checked)}
                  className="accent-slate-900"
                />
                테마 설정 노출
              </label>
            </div>
          </details>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6">
          <h2 className="text-base font-semibold text-slate-950">생성 요약</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">템플릿</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {templateName.trim() || '이름 미지정'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">시작점</dt>
              <dd className="mt-1 font-medium text-slate-950">빈 캔버스</dd>
            </div>
            <div>
              <dt className="text-slate-500">배치 방식</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {selectedLayoutOption.label}
                {layoutMode === 'flex4x2'
                  ? ` · 3칸 ${v2_FLEX42_THREE_ROW_LABELS[flex42ThreeRow]} · ${v2_FLEX42_ALIGN_LABELS[flex42Align]}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Card 컴포넌트</dt>
              <dd className="mt-1 text-slate-950">{cardComponentCount}개</dd>
            </div>
            <div>
              <dt className="text-slate-500">Card 상태</dt>
              <dd className="mt-1 text-slate-950">
                온라인, 오프라인
                {useOfflineMemo ? ', 오프라인 메모' : ''}
                {isMultiple ? `, 다회차 ${maxStreamingTimeByDay}회차` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">입력 필드</dt>
              <dd className="mt-1 text-slate-950">
                {[
                  isArtist ? '아티스트' : null,
                  isMemo ? '메모' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || '추가 전역 필드 없음'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">캔버스</dt>
              <dd className="mt-1 text-slate-950">
                {templateWidth} x {templateHeight}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">포맷</dt>
              <dd className="mt-1 text-slate-950">
                {v2_LOCALE_PRESET_LABELS[localePreset]} ·{' '}
                {v2_TIME_PRESET_LABELS[timePreset]} ·{' '}
                {v2_WEEK_DATE_PRESET_LABELS[weekDatePreset]}
              </dd>
            </div>
          </dl>

          <p className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
            Image asset, Text, FlexibleText, Frame은 생성 후 에디터에서 추가합니다.
          </p>

          {createError ? (
            <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {createError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canCreate || isCreating}
            className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCreating ? '생성 중...' : '새 템플릿 만들기'}
          </button>
        </aside>
      </form>
    </div>
  );
};

export default TemplateEditorMainPage;
