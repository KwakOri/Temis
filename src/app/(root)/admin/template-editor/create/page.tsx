'use client';

import { useRouter } from 'next/navigation';
import {
  CSSProperties,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Layers3,
} from 'lucide-react';
import type {
  V2TemplateCreationCardAssetMode,
  V2TemplateCreationDraft,
  V2TemplateCreationTimePreset,
  V2TemplateCreationWeekDatePreset,
} from '@/types/time-table/template-creation';
import type {
  V2TemplateArtistMode,
  V2TemplateAssetRequirement,
  V2TemplateMemoMode,
  V2TemplateObjectAssetMode,
  V2TemplateTimetableFlex42Align,
  V2TemplateTimetableFlex42ThreeRow,
  V2TemplateTimetableGridLayoutMode,
} from '@/types/time-table/template-render-config';
import type { V2TemplateAssetUploadItem } from '@/services/admin/v2_template_asset_service';
import type { TLanOpt } from '@/types/time-table/data';
import {
  useCreateAdminV2Template,
  useUpdateAdminV2TemplateRenderConfig,
  useUploadAdminV2TemplateAssets,
} from '@/hooks/query/useAdminV2TemplateRenderConfig';
import {
  v2_buildRenderConfigFromCreationDraft,
  v2_createDefaultTemplateCreationDraft,
  v2_resolveCreationThemeOptions,
} from '@/utils/v2/template-creation-builder';
import {
  v2_getTemplateAssetRequirementGroups,
} from '@/utils/v2/template-asset-requirements';
import {
  v2_clampTimetableCardComponentCount,
  v2_clampTimetableMultiEntryCount,
  v2_MAX_TIMETABLE_CARD_COMPONENT_COUNT,
  v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT,
  v2_MIN_TIMETABLE_CARD_COMPONENT_COUNT,
  v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT,
} from '@/utils/v2/template-render-config';
import {
  v2_applyUploadedAssetRecordsToRenderConfig,
  v2_readImageFileDimensions,
} from '@/utils/v2/template-asset-upload-client';

const v2_toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
};

type V2CreatePanelId =
  | 'basic'
  | 'objects'
  | 'timetable'
  | 'data'
  | 'assets'
  | 'formats'
  | 'review';

const v2_CREATE_PANELS: Array<{
  id: V2CreatePanelId;
  label: string;
  description: string;
}> = [
  {
    id: 'basic',
    label: '기본 정보',
    description: '이름, 캔버스, 테마',
  },
  {
    id: 'objects',
    label: '구성 요소',
    description: '사용할 오브젝트',
  },
  {
    id: 'timetable',
    label: '시간표 구조',
    description: '슬롯과 카드 상태',
  },
  {
    id: 'data',
    label: '입력 데이터',
    description: '폼 필드 구성',
  },
  {
    id: 'assets',
    label: '에셋 요구사항',
    description: '필요한 이미지 슬롯',
  },
  {
    id: 'formats',
    label: '포맷',
    description: '언어와 날짜',
  },
  {
    id: 'review',
    label: '검토',
    description: '생성 전 확인',
  },
];

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

const v2_LOCALE_PRESET_LABELS: Record<TLanOpt, string> = {
  kr: '한국어',
  en: '영어',
  jp: '일본어',
};

const v2_TIME_PRESET_LABELS: Record<V2TemplateCreationTimePreset, string> = {
  h12Prefix: '12시간제 AM/PM 앞',
  h12Suffix: '12시간제 AM/PM 뒤',
  h24: '24시간제',
};

const v2_WEEK_DATE_PRESET_LABELS: Record<
  V2TemplateCreationWeekDatePreset,
  string
> = {
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

const v2_TOP_OBJECT_MODE_LABELS: Record<V2TemplateObjectAssetMode, string> = {
  none: '미사용',
  singleAsset: '단일 에셋',
  statefulAsset: 'ON/OFF 에셋',
};

const v2_ARTIST_MODE_LABELS: Record<V2TemplateArtistMode, string> = {
  none: '미사용',
  textOnly: '텍스트만',
  textWithAsset: '단일 에셋',
  textWithStatefulAsset: 'ON/OFF 에셋',
};

const v2_MEMO_MODE_LABELS: Record<V2TemplateMemoMode, string> = {
  none: '미사용',
  textOnly: '텍스트만',
  textWithAsset: '단일 에셋',
  statefulAssetWithText: 'ON/OFF 에셋',
};

type V2CreateCardAssetKey = keyof V2TemplateCreationDraft['cardAssets'];

const v2_CARD_ASSET_OPTIONS: Array<{
  key: V2CreateCardAssetKey;
  label: string;
  description: string;
}> = [
  {
    key: 'online',
    label: '온라인 카드',
    description: '온라인 상태에 사용하는 카드 배경',
  },
  {
    key: 'offline',
    label: '오프라인 카드',
    description: '오프라인 상태에 사용하는 카드 배경',
  },
  {
    key: 'multi',
    label: '다회차 카드',
    description: '온라인 다회차 상태에 사용하는 카드 배경',
  },
  {
    key: 'offlineMemo',
    label: '오프라인 메모 카드',
    description: '오프라인 메모 상태에 사용하는 카드 배경',
  },
];

const v2_CARD_ASSET_MODE_LABELS: Record<V2TemplateCreationCardAssetMode, string> = {
  common: '공통',
  byDay: '요일별',
};

const v2_ASSET_GROUP_MODE_LABELS: Record<string, string> = {
  single: '단일',
  stateful: '상태별',
  common: '공통',
  byDay: '요일별',
};

const v2_TOP_OBJECT_MODE_OPTIONS: Array<{
  value: Exclude<V2TemplateObjectAssetMode, 'none'>;
  label: string;
  description: string;
  chips: string[];
}> = [
  {
    value: 'singleAsset',
    label: '단일 에셋',
    description: '상태 전환 없이 하나의 상단 오브젝트를 사용합니다.',
    chips: ['topObjectByTheme'],
  },
  {
    value: 'statefulAsset',
    label: 'ON/OFF 에셋',
    description: '런타임 토글 상태에 따라 상단 오브젝트를 전환합니다.',
    chips: ['topObject.on', 'topObject.off'],
  },
];

const v2_ARTIST_MODE_OPTIONS: Array<{
  value: Exclude<V2TemplateArtistMode, 'none' | 'textOnly'>;
  label: string;
  description: string;
  chips: string[];
}> = [
  {
    value: 'textWithAsset',
    label: '단일 에셋',
    description: '아티스트 텍스트와 하나의 오브젝트를 사용합니다.',
    chips: ['artistText', 'artist'],
  },
  {
    value: 'textWithStatefulAsset',
    label: 'ON/OFF 에셋',
    description: '아티스트 표시 상태에 따라 오브젝트를 전환합니다.',
    chips: ['artistText', 'artistOnByTheme', 'artistOffByTheme'],
  },
];

const v2_MEMO_MODE_OPTIONS: Array<{
  value: Exclude<V2TemplateMemoMode, 'none' | 'textOnly'>;
  label: string;
  description: string;
  chips: string[];
}> = [
  {
    value: 'textWithAsset',
    label: '단일 에셋',
    description: '메모 텍스트와 하나의 오브젝트를 사용합니다.',
    chips: ['memoText', 'memoByTheme'],
  },
  {
    value: 'statefulAssetWithText',
    label: 'ON/OFF 에셋',
    description: '메모 표시 상태에 따라 오브젝트를 전환합니다.',
    chips: ['memoText', 'memo.on', 'memo.off'],
  },
];

type V2ObjectModeOption<TValue extends string> = {
  value: TValue;
  label: string;
  description: string;
  chips: string[];
};

const SwitchControl = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) => (
  <label
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
      checked
        ? 'bg-slate-500 ring-1 ring-white/45'
        : 'bg-slate-300 ring-1 ring-slate-200'
    } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
  >
    <input
      type="checkbox"
      role="switch"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="sr-only"
    />
    <span
      className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow transition ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </label>
);

function ObjectModeOptionList<TValue extends string>({
  label,
  value,
  options,
  disabled = false,
  activeOnDark = false,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<V2ObjectModeOption<TValue>>;
  disabled?: boolean;
  activeOnDark?: boolean;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="space-y-2">
      <p
        className={`text-xs font-semibold ${
          activeOnDark ? 'text-slate-200' : 'text-slate-500'
        }`}
      >
        {label}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.value === value;
          const optionClasses = activeOnDark
            ? selected
              ? 'border-white bg-white text-slate-950 shadow-sm'
              : 'border-white/15 bg-white/5 text-slate-100 hover:bg-white/10'
            : selected
              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
          const descriptionClasses = activeOnDark
            ? selected
              ? 'text-slate-600'
              : 'text-slate-300'
            : selected
              ? 'text-slate-200'
              : 'text-slate-500';
          const chipClasses = activeOnDark
            ? selected
              ? 'bg-slate-100 text-slate-700'
              : 'bg-white/10 text-slate-200'
            : selected
              ? 'bg-white/15 text-slate-100'
              : 'bg-slate-100 text-slate-600';
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`min-h-[116px] rounded-md border px-3 py-3 text-left text-sm transition ${optionClasses} ${
                disabled ? 'cursor-not-allowed opacity-55' : ''
              }`}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className={`mt-1 block text-xs ${descriptionClasses}`}>
                {option.description}
              </span>
              <span className="mt-3 flex flex-wrap gap-1">
                {option.chips.map((chip) => (
                  <span
                    key={`${option.value}-${chip}`}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipClasses}`}
                  >
                    {chip}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ObjectCapabilityCard = ({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) => {
  return (
    <section
      className={`min-h-[112px] rounded-md border px-4 py-4 transition ${
        checked
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold">{title}</p>
          <p
            className={`mt-1 text-sm ${
              checked ? 'text-slate-200' : 'text-slate-500'
            }`}
          >
            {description}
          </p>
        </div>
        <SwitchControl
          checked={checked}
          onChange={onChange}
          ariaLabel={`${title} 사용 여부`}
        />
      </div>
      {children ? (
        <div
          className={`mt-4 space-y-3 border-t pt-3 ${
            checked ? 'border-white/15' : 'border-slate-200'
          }`}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
};

const v2_ALPHA_CHECKER_MAT_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
  backgroundSize: '16px 16px',
};

const AlphaCheckerMat = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span className={className} style={v2_ALPHA_CHECKER_MAT_STYLE}>
    {children}
  </span>
);

const AssetRequirementUploadCard = ({
  requirement,
  selectedFile,
  onFileChange,
}: {
  requirement: V2TemplateAssetRequirement;
  selectedFile?: File | null;
  onFileChange: (file: File | null) => void;
}) => {
  const inputId = `asset-file-${requirement.id.replace(
    /[^a-zA-Z0-9_-]/g,
    '-'
  )}`;
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {requirement.label}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {requirement.state ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {requirement.state.toUpperCase()}
            </span>
          ) : null}
          {requirement.dayKey ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {requirement.dayKey}
            </span>
          ) : null}
          {requirement.required ? (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
              필수
            </span>
          ) : null}
        </div>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={inputId}
        className={`group flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed text-center transition ${
          previewUrl
            ? 'border-slate-300 bg-white'
            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
        }`}
      >
        {previewUrl ? (
          <AlphaCheckerMat className="relative block h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`${requirement.label} 미리보기`}
              className="h-full w-full object-contain"
            />
            <span className="absolute inset-x-0 bottom-0 bg-slate-950/75 px-3 py-2 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
              이미지 변경
            </span>
          </AlphaCheckerMat>
        ) : (
          <AlphaCheckerMat className="flex h-full w-full items-center justify-center">
            <span className="flex flex-col items-center gap-2 rounded-md bg-white/85 px-4 py-3 text-xs font-semibold shadow-sm ring-1 ring-slate-200/70">
              <ImagePlus className="h-5 w-5 text-slate-400" />
              이미지 선택
            </span>
          </AlphaCheckerMat>
        )}
      </label>

      {selectedFile ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
          <span className="min-w-0 truncate">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="shrink-0 font-semibold text-slate-900 hover:text-rose-600"
          >
            제거
          </button>
        </div>
      ) : null}
    </div>
  );
};

const ToggleCard = ({
  title,
  description,
  checked,
  onClick,
  disabled = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[76px] items-start justify-between rounded-md border px-3 py-3 text-left text-sm transition ${
        checked
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      } ${disabled ? 'cursor-default opacity-80' : ''}`}
    >
      <span>
        <span className="block font-semibold">{title}</span>
        <span
          className={`mt-1 block text-xs ${
            checked ? 'text-slate-200' : 'text-slate-500'
          }`}
        >
          {description}
        </span>
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          checked ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {checked ? '사용' : '미사용'}
      </span>
    </button>
  );
};

const FieldBlock = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <div>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const TemplateEditorCreatePage = () => {
  const router = useRouter();
  const [draft, setDraft] = useState<V2TemplateCreationDraft>(() =>
    v2_createDefaultTemplateCreationDraft()
  );
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [assetFilesByRequirementId, setAssetFilesByRequirementId] = useState<
    Record<string, File | null>
  >({});
  const createTemplateMutation = useCreateAdminV2Template();
  const updateRenderConfigMutation = useUpdateAdminV2TemplateRenderConfig();
  const uploadAssetsMutation = useUploadAdminV2TemplateAssets();

  const previewConfig = useMemo(
    () => v2_buildRenderConfigFromCreationDraft(draft),
    [draft]
  );
  const assetRequirementGroups = useMemo(
    () => v2_getTemplateAssetRequirementGroups(previewConfig),
    [previewConfig]
  );
  const templateAssetRequirementGroups = useMemo(
    () =>
      assetRequirementGroups.filter((group) => group.category !== 'development'),
    [assetRequirementGroups]
  );
  const developmentAssetRequirementGroups = useMemo(
    () =>
      assetRequirementGroups.filter((group) => group.category === 'development'),
    [assetRequirementGroups]
  );
  const templateAssetRequirements = useMemo(
    () => templateAssetRequirementGroups.flatMap((group) => group.requirements),
    [templateAssetRequirementGroups]
  );
  const developmentAssetRequirements = useMemo(
    () => developmentAssetRequirementGroups.flatMap((group) => group.requirements),
    [developmentAssetRequirementGroups]
  );
  const allAssetRequirements = useMemo(
    () => [...templateAssetRequirements, ...developmentAssetRequirements],
    [templateAssetRequirements, developmentAssetRequirements]
  );
  const selectedAssetUploadCount = useMemo(
    () =>
      allAssetRequirements.filter((requirement) =>
        Boolean(assetFilesByRequirementId[requirement.id])
      ).length,
    [allAssetRequirements, assetFilesByRequirementId]
  );
  const themeOptions = useMemo(
    () => v2_resolveCreationThemeOptions(previewConfig),
    [previewConfig]
  );
  const selectedLayoutOption = useMemo(
    () =>
      v2_LAYOUT_MODE_OPTIONS.find(
        (option) => option.value === draft.timetable.layoutMode
      ) ?? v2_LAYOUT_MODE_OPTIONS[0],
    [draft.timetable.layoutMode]
  );
  const activePanel = v2_CREATE_PANELS[activePanelIndex];
  const isFirstPanel = activePanelIndex === 0;
  const isLastPanel = activePanelIndex === v2_CREATE_PANELS.length - 1;
  const isCreating =
    createTemplateMutation.isPending ||
    uploadAssetsMutation.isPending ||
    updateRenderConfigMutation.isPending;

  const canCreate = useMemo(() => {
    const maxEntriesValid =
      !draft.timetable.multipleEnabled ||
      (Number.isFinite(draft.timetable.maxEntriesPerDay) &&
        draft.timetable.maxEntriesPerDay >= v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT &&
        draft.timetable.maxEntriesPerDay <= v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT);
    const widthValid = Number.isFinite(draft.canvas.width) && draft.canvas.width >= 1;
    const heightValid =
      Number.isFinite(draft.canvas.height) && draft.canvas.height >= 1;
    const componentCountValid =
      Number.isFinite(draft.timetable.cardComponentCount) &&
      draft.timetable.cardComponentCount >=
        v2_MIN_TIMETABLE_CARD_COMPONENT_COUNT &&
      draft.timetable.cardComponentCount <= v2_MAX_TIMETABLE_CARD_COMPONENT_COUNT;
    const themeValid = themeOptions.includes(draft.theme.defaultTheme);
    return maxEntriesValid && widthValid && heightValid && componentCountValid && themeValid;
  }, [draft, themeOptions]);

  const updateDraft = (updater: (current: V2TemplateCreationDraft) => V2TemplateCreationDraft) => {
    setDraft(updater);
  };

  const updateCardAssetMode = (
    key: V2CreateCardAssetKey,
    mode: V2TemplateCreationCardAssetMode
  ) => {
    updateDraft((current) => ({
      ...current,
      cardAssets: {
        ...current.cardAssets,
        [key]: mode,
      },
    }));
  };

  const updateAssetFile = (requirementId: string, file: File | null) => {
    setAssetFilesByRequirementId((current) => {
      if (!file) {
        const next = { ...current };
        delete next[requirementId];
        return next;
      }
      return {
        ...current,
        [requirementId]: file,
      };
    });
  };

  const buildAssetUploadItems = ({
    requirements,
    theme,
  }: {
    requirements: V2TemplateAssetRequirement[];
    theme: string;
  }): V2TemplateAssetUploadItem[] => {
    const normalizedTheme = theme.trim();
    if (!normalizedTheme) return [];
    return requirements.flatMap((requirement) => {
      const file = assetFilesByRequirementId[requirement.id];
      if (!file) return [];
      return [
        {
          clientId: `${requirement.id}:${normalizedTheme}:${Date.now()}`,
          file,
          targetType: requirement.assetRef.source,
          targetKey: requirement.assetRef.key,
          theme: normalizedTheme,
        },
      ];
    });
  };

  const handleCreateTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreate) return;
    if (!isLastPanel) {
      setActivePanelIndex((current) =>
        Math.min(current + 1, v2_CREATE_PANELS.length - 1)
      );
      return;
    }

    setCreateError(null);

    try {
      const fallbackNameSuffix = Math.random().toString(36).slice(2, 10);
      let nextConfig = v2_buildRenderConfigFromCreationDraft(draft, {
        fallbackNameSuffix,
      });
      const uploadItems = buildAssetUploadItems({
        requirements: allAssetRequirements,
        theme: nextConfig.defaultTheme,
      });
      const uploadDimensions = await Promise.all(
        uploadItems.map(async (item) => ({
          clientId: item.clientId,
          dimension: await v2_readImageFileDimensions(item.file),
        }))
      );
      const dimensionsByClientId = new Map(
        uploadDimensions.map((entry) => [entry.clientId, entry.dimension])
      );
      const created = await createTemplateMutation.mutateAsync({
        name: nextConfig.metadata.name,
        description: nextConfig.metadata.description,
        is_public: false,
      });
      const templateId = created.template?.id;
      if (!templateId) {
        throw new Error('생성된 템플릿 ID를 확인할 수 없습니다.');
      }

      if (uploadItems.length > 0) {
        const uploadedRecords = await uploadAssetsMutation.mutateAsync({
          templateId,
          items: uploadItems,
        });
        nextConfig = v2_applyUploadedAssetRecordsToRenderConfig({
          renderConfig: nextConfig,
          uploadedRecords,
          dimensionsByClientId,
        });
      }

      await updateRenderConfigMutation.mutateAsync({
        templateId,
        payload: {
          configVersion: nextConfig.version,
          renderConfig: nextConfig,
        },
      });

      router.push(`/admin/template-editor/${templateId}/edit`);
    } catch (error) {
      console.error('template create failed', error);
      setCreateError(v2_toErrorMessage(error, '템플릿 생성 중 오류가 발생했습니다.'));
    }
  };

  const renderPanel = () => {
    if (activePanel.id === 'basic') {
      return (
        <FieldBlock
          title="기본 정보"
          description="관리 목록과 편집 화면에서 사용할 큰 설정을 먼저 정합니다."
        >
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
                value={draft.metadata.name}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    metadata: {
                      ...current.metadata,
                      name: event.target.value,
                    },
                  }))
                }
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
                value={draft.metadata.description}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    metadata: {
                      ...current.metadata,
                      description: event.target.value,
                    },
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="예: 팬카페 주간 업로드용 기본 템플릿"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                value={draft.canvas.width}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    canvas: {
                      ...current.canvas,
                      width: Number.parseInt(event.target.value, 10) || 1,
                    },
                  }))
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
                value={draft.canvas.height}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    canvas: {
                      ...current.canvas,
                      height: Number.parseInt(event.target.value, 10) || 1,
                    },
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="default-theme"
              >
                기본 테마
              </label>
              <select
                id="default-theme"
                value={draft.theme.defaultTheme}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    theme: {
                      ...current.theme,
                      defaultTheme: event.target.value,
                    },
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {themeOptions.map((theme) => (
                  <option key={`create-theme-${theme}`} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.theme.enableThemeSelection}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    theme: {
                      ...current.theme,
                      enableThemeSelection: event.target.checked,
                    },
                  }))
                }
                className="accent-slate-900"
              />
              런타임에서 테마 선택 노출
            </label>
          </div>
        </FieldBlock>
      );
    }

    if (activePanel.id === 'objects') {
      return (
        <FieldBlock
          title="구성 요소"
          description="처음에는 템플릿이 어떤 object capability를 가질지 정합니다."
        >
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            <ObjectCapabilityCard
              title="Top Object"
              description="상단 장식/상태 오브젝트"
              checked={draft.objects.topObject.enabled}
              onChange={(checked) =>
                updateDraft((current) => ({
                  ...current,
                  objects: {
                    ...current.objects,
                    topObject: {
                      ...current.objects.topObject,
                      enabled: checked,
                    },
                  },
                }))
              }
            >
              <ObjectModeOptionList
                label="Top Object 방식"
                value={
                  draft.objects.topObject.mode === 'statefulAsset'
                    ? 'statefulAsset'
                    : 'singleAsset'
                }
                options={v2_TOP_OBJECT_MODE_OPTIONS}
                disabled={!draft.objects.topObject.enabled}
                activeOnDark={draft.objects.topObject.enabled}
                onChange={(mode) =>
                  updateDraft((current) => ({
                    ...current,
                    objects: {
                      ...current.objects,
                      topObject: {
                        ...current.objects.topObject,
                        mode,
                      },
                    },
                  }))
                }
              />
            </ObjectCapabilityCard>

            <ObjectCapabilityCard
              title="Profile"
              description="프로필 아트워크와 프레임"
              checked={draft.objects.profile.enabled}
              onChange={(checked) =>
                updateDraft((current) => ({
                  ...current,
                  objects: {
                    ...current.objects,
                    profile: {
                      ...current.objects.profile,
                      enabled: checked,
                    },
                  },
                }))
              }
            >
              <div
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
                  draft.objects.profile.enabled
                    ? 'border-white/15 bg-white/5 text-slate-100'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span>프로필 이미지 필수</span>
                <SwitchControl
                  checked={draft.objects.profile.imageRequired}
                  disabled={!draft.objects.profile.enabled}
                  ariaLabel="프로필 이미지 필수 여부"
                  onChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      objects: {
                        ...current.objects,
                        profile: {
                          ...current.objects.profile,
                          imageRequired: checked,
                        },
                      },
                    }))
                  }
                />
              </div>

              <div
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
                  draft.objects.profile.enabled
                    ? 'border-white/15 bg-white/5 text-slate-100'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span>프레임 필수</span>
                <SwitchControl
                  checked={draft.objects.profile.frameRequired}
                  disabled={!draft.objects.profile.enabled}
                  ariaLabel="프레임 필수 여부"
                  onChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      objects: {
                        ...current.objects,
                        profile: {
                          ...current.objects.profile,
                          frameRequired: checked,
                        },
                      },
                    }))
                  }
                />
              </div>
            </ObjectCapabilityCard>

            <ObjectCapabilityCard
              title="Artist"
              description="아티스트 텍스트와 오브젝트"
              checked={draft.objects.artist.enabled}
              onChange={(checked) =>
                updateDraft((current) => ({
                  ...current,
                  objects: {
                    ...current.objects,
                    artist: {
                      ...current.objects.artist,
                      enabled: checked,
                      mode:
                        current.objects.artist.mode === 'textWithAsset' ||
                        current.objects.artist.mode === 'textWithStatefulAsset'
                          ? current.objects.artist.mode
                          : 'textWithStatefulAsset',
                    },
                  },
                }))
              }
            >
              <ObjectModeOptionList
                label="Artist 방식"
                value={
                  draft.objects.artist.mode === 'textWithAsset'
                    ? 'textWithAsset'
                    : 'textWithStatefulAsset'
                }
                options={v2_ARTIST_MODE_OPTIONS}
                disabled={!draft.objects.artist.enabled}
                activeOnDark={draft.objects.artist.enabled}
                onChange={(mode) =>
                  updateDraft((current) => ({
                    ...current,
                    objects: {
                      ...current.objects,
                      artist: {
                        ...current.objects.artist,
                        mode,
                      },
                    },
                  }))
                }
              />
            </ObjectCapabilityCard>
            <ObjectCapabilityCard
              title="Memo"
              description="주간 메모 텍스트와 오브젝트"
              checked={draft.objects.memo.enabled}
              onChange={(checked) =>
                updateDraft((current) => ({
                  ...current,
                  objects: {
                    ...current.objects,
                    memo: {
                      ...current.objects.memo,
                      enabled: checked,
                      mode:
                        current.objects.memo.mode === 'textWithAsset' ||
                        current.objects.memo.mode === 'statefulAssetWithText'
                          ? current.objects.memo.mode
                          : 'statefulAssetWithText',
                    },
                  },
                }))
              }
            >
              <ObjectModeOptionList
                label="Memo 방식"
                value={
                  draft.objects.memo.mode === 'textWithAsset'
                    ? 'textWithAsset'
                    : 'statefulAssetWithText'
                }
                options={v2_MEMO_MODE_OPTIONS}
                disabled={!draft.objects.memo.enabled}
                activeOnDark={draft.objects.memo.enabled}
                onChange={(mode) =>
                  updateDraft((current) => ({
                    ...current,
                    objects: {
                      ...current.objects,
                      memo: {
                        ...current.objects.memo,
                        mode,
                      },
                    },
                  }))
                }
              />
            </ObjectCapabilityCard>
            <ObjectCapabilityCard
              title="Week Dates"
              description="주간 날짜/플래그 노드"
              checked={draft.objects.weekDates.enabled}
              onChange={(checked) =>
                updateDraft((current) => ({
                  ...current,
                  objects: {
                    ...current.objects,
                    weekDates: {
                      enabled: checked,
                    },
                  },
                }))
              }
            />
          </div>
        </FieldBlock>
      );
    }

    if (activePanel.id === 'timetable') {
      return (
        <FieldBlock
          title="시간표 구조"
          description="요일 슬롯과 Card 상태의 기본 구조를 설정합니다."
        >
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">배치 방식</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {v2_LAYOUT_MODE_OPTIONS.map((option) => {
                const isSelected = draft.timetable.layoutMode === option.value;
                return (
                  <button
                    key={`layout-mode-${option.value}`}
                    type="button"
                    onClick={() =>
                      updateDraft((current) => ({
                        ...current,
                        timetable: {
                          ...current.timetable,
                          layoutMode: option.value,
                        },
                      }))
                    }
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
          </div>

          {draft.timetable.layoutMode === 'flex4x2' ? (
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-slate-700"
                  htmlFor="flex42-three-row"
                >
                  3칸 줄
                </label>
                <select
                  id="flex42-three-row"
                  value={draft.timetable.flex42ThreeRow}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      timetable: {
                        ...current.timetable,
                        flex42ThreeRow:
                          event.target.value as V2TemplateTimetableFlex42ThreeRow,
                      },
                    }))
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
                  value={draft.timetable.flex42Align}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      timetable: {
                        ...current.timetable,
                        flex42Align:
                          event.target.value as V2TemplateTimetableFlex42Align,
                      },
                    }))
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

          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleCard
              title="온라인"
              description="기본 필수 상태"
              checked
              disabled
              onClick={() => undefined}
            />
            <ToggleCard
              title="오프라인"
              description="기본 필수 상태"
              checked
              disabled
              onClick={() => undefined}
            />
            <ToggleCard
              title="오프라인 메모"
              description="메모 전용 상태"
              checked={draft.timetable.offlineMemoEnabled}
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  timetable: {
                    ...current.timetable,
                    offlineMemoEnabled: !current.timetable.offlineMemoEnabled,
                  },
                }))
              }
            />
            <ToggleCard
              title="다회차"
              description="Entry Frame 생성"
              checked={draft.timetable.multipleEnabled}
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  timetable: {
                    ...current.timetable,
                    multipleEnabled: !current.timetable.multipleEnabled,
                    maxEntriesPerDay: current.timetable.multipleEnabled
                      ? 1
                      : Math.max(
                          current.timetable.maxEntriesPerDay,
                          v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT
                        ),
                  },
                }))
              }
            />
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
                value={draft.timetable.cardComponentCount}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    timetable: {
                      ...current.timetable,
                      cardComponentCount: v2_clampTimetableCardComponentCount(
                        event.target.value
                      ),
                    },
                  }))
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
                value={Math.max(
                  draft.timetable.maxEntriesPerDay,
                  v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT
                )}
                disabled={!draft.timetable.multipleEnabled}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    timetable: {
                      ...current.timetable,
                      maxEntriesPerDay: v2_clampTimetableMultiEntryCount(
                        event.target.value
                      ),
                    },
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {v2_MULTI_ENTRY_COUNT_OPTIONS.map((entryCount) => (
                  <option key={`multi-entry-count-${entryCount}`} value={entryCount}>
                    {entryCount}회차
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FieldBlock>
      );
    }

    if (activePanel.id === 'data') {
      const globalFields = [
        draft.objects.artist.enabled ? 'artistText' : null,
        draft.objects.memo.enabled ? 'memoText' : null,
      ].filter(Boolean);
      const cardFields = [
        'time',
        'mainTitle',
        'subTitle',
        draft.timetable.offlineMemoEnabled ? 'offlineMemo' : null,
      ].filter(Boolean);
      return (
        <FieldBlock
          title="입력 데이터"
          description="앞에서 고른 구성 요소에 따라 생성될 사용자 입력 필드입니다."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">전역 필드</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {globalFields.length > 0 ? (
                  globalFields.map((field) => <li key={field}>{field}</li>)
                ) : (
                  <li className="text-slate-500">추가 전역 필드 없음</li>
                )}
              </ul>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">카드/엔트리 필드</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {cardFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        </FieldBlock>
      );
    }

    if (activePanel.id === 'assets') {
      const cardAssetOptions = v2_CARD_ASSET_OPTIONS.filter((option) => {
        if (option.key === 'multi') return draft.timetable.multipleEnabled;
        if (option.key === 'offlineMemo') return draft.timetable.offlineMemoEnabled;
        return true;
      });
      const renderAssetGroups = (groups: typeof assetRequirementGroups) => (
        <div className="space-y-3">
          {groups.map((group) => (
            <section
              key={group.id}
              className="rounded-md border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {group.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {group.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {v2_ASSET_GROUP_MODE_LABELS[group.mode] ?? group.mode}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {group.requirements.length} slots
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {group.requirements.map((requirement) => {
                  const selectedFile = assetFilesByRequirementId[requirement.id];
                  return (
                    <AssetRequirementUploadCard
                      key={requirement.id}
                      requirement={requirement}
                      selectedFile={selectedFile}
                      onFileChange={(file) => updateAssetFile(requirement.id, file)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      );

      return (
        <FieldBlock
          title="에셋 요구사항"
          description="카드 배경의 공통/요일별 모드와 템플릿 이미지 슬롯을 설정합니다."
        >
          <div className="space-y-5">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              업로드 대상 테마{' '}
              <span className="font-semibold text-slate-950">
                {draft.theme.defaultTheme}
              </span>
              {selectedAssetUploadCount > 0
                ? ` · 선택된 파일 ${selectedAssetUploadCount}개`
                : ''}
            </div>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-950">
                  카드 에셋 모드
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  요일별 이미지가 필요한 카드만 개별 슬롯을 엽니다.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {cardAssetOptions.map((option) => {
                  const selectedMode = draft.cardAssets[option.key];
                  return (
                    <div
                      key={`card-asset-mode-${option.key}`}
                      className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {option.label}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {option.description}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {v2_CARD_ASSET_MODE_LABELS[selectedMode]}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {(['common', 'byDay'] as const).map((mode) => {
                          const selected = selectedMode === mode;
                          return (
                            <button
                              key={`${option.key}-${mode}`}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => updateCardAssetMode(option.key, mode)}
                              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                                selected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {v2_CARD_ASSET_MODE_LABELS[mode]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-950">
                  이미지 업로드
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  각 슬롯의 16:9 영역을 눌러 이미지를 선택합니다.
                </p>
              </div>
              {renderAssetGroups(templateAssetRequirementGroups)}
            </section>

            {developmentAssetRequirementGroups.length > 0 ? (
              <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-950">
                    개발/검수 보조 에셋
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    가이드 레이어와 더미 이미지는 최종 제작 에셋과 분리해 관리합니다.
                  </p>
                </div>
                {renderAssetGroups(developmentAssetRequirementGroups)}
              </section>
            ) : null}
          </div>
        </FieldBlock>
      );
    }

    if (activePanel.id === 'formats') {
      return (
        <FieldBlock
          title="포맷"
          description="요일, 시간, 주간 날짜의 기본 표시 방식을 정합니다."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="locale-preset"
              >
                언어 프리셋
              </label>
              <select
                id="locale-preset"
                value={draft.formats.localePreset}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    formats: {
                      ...current.formats,
                      localePreset: event.target.value as TLanOpt,
                    },
                  }))
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
                htmlFor="time-preset"
              >
                시간 포맷
              </label>
              <select
                id="time-preset"
                value={draft.formats.timePreset}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    formats: {
                      ...current.formats,
                      timePreset:
                        event.target.value as V2TemplateCreationTimePreset,
                    },
                  }))
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
                value={draft.formats.weekDatePreset}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    formats: {
                      ...current.formats,
                      weekDatePreset:
                        event.target.value as V2TemplateCreationWeekDatePreset,
                    },
                  }))
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
        </FieldBlock>
      );
    }

    return (
      <FieldBlock
        title="검토"
        description="생성될 render-config의 핵심 구조를 마지막으로 확인합니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">구성 요소</p>
            <p className="mt-2 text-sm text-slate-700">
              {[
                draft.objects.topObject.enabled
                  ? `TopObject (${v2_TOP_OBJECT_MODE_LABELS[draft.objects.topObject.mode]})`
                  : null,
                draft.objects.profile.enabled ? 'Profile' : null,
                draft.objects.artist.enabled
                  ? `Artist (${v2_ARTIST_MODE_LABELS[draft.objects.artist.mode]})`
                  : null,
                draft.objects.memo.enabled
                  ? `Memo (${v2_MEMO_MODE_LABELS[draft.objects.memo.mode]})`
                  : null,
                draft.objects.weekDates.enabled ? 'Week Dates' : null,
              ]
                .filter(Boolean)
                .join(', ') || '선택된 구성 요소 없음'}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">생성 결과</p>
            <p className="mt-2 text-sm text-slate-700">
              graph nodes {Object.keys(previewConfig.graph.nodes).length}개 ·
              asset groups {templateAssetRequirementGroups.length}개 · asset slots{' '}
              {templateAssetRequirements.length}개
              {developmentAssetRequirements.length > 0
                ? ` · 보조 slots ${developmentAssetRequirements.length}개`
                : ''}
            </p>
          </div>
        </div>
      </FieldBlock>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Template Editor
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            새 시간표 템플릿 만들기
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            개괄 설정에서 시작해 필요한 세부 옵션만 순서대로 설정합니다.
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
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
            <Layers3 className="h-4 w-4 text-slate-500" />
            <span className="font-medium text-slate-900">{activePanel.label}</span>
            <span>{activePanel.description}</span>
          </div>
          {renderPanel()}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <nav className="rounded-xl border border-slate-200 bg-white p-3">
            <ol className="space-y-1">
              {v2_CREATE_PANELS.map((panel, index) => {
                const active = index === activePanelIndex;
                const done = index < activePanelIndex;
                return (
                  <li key={panel.id}>
                    <button
                      type="button"
                      onClick={() => setActivePanelIndex(index)}
                      className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                          active
                            ? 'border-white bg-white text-slate-900'
                            : done
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 text-slate-500'
                        }`}
                      >
                        {done ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">
                          {panel.label}
                        </span>
                        <span
                          className={`mt-0.5 block text-xs ${
                            active ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {panel.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">생성 요약</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">템플릿</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {draft.metadata.name.trim() || '이름 미지정'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">캔버스</dt>
              <dd className="mt-1 text-slate-950">
                {draft.canvas.width} x {draft.canvas.height}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Top Object</dt>
              <dd className="mt-1 text-slate-950">
                {draft.objects.topObject.enabled
                  ? v2_TOP_OBJECT_MODE_LABELS[draft.objects.topObject.mode]
                  : '미사용'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Artist</dt>
              <dd className="mt-1 text-slate-950">
                {draft.objects.artist.enabled
                  ? v2_ARTIST_MODE_LABELS[draft.objects.artist.mode]
                  : '미사용'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Memo</dt>
              <dd className="mt-1 text-slate-950">
                {draft.objects.memo.enabled
                  ? v2_MEMO_MODE_LABELS[draft.objects.memo.mode]
                  : '미사용'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">배치 방식</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {selectedLayoutOption.label}
                {draft.timetable.layoutMode === 'flex4x2'
                  ? ` · 3칸 ${v2_FLEX42_THREE_ROW_LABELS[draft.timetable.flex42ThreeRow]} · ${v2_FLEX42_ALIGN_LABELS[draft.timetable.flex42Align]}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Card 상태</dt>
              <dd className="mt-1 text-slate-950">
                온라인, 오프라인
                {draft.timetable.offlineMemoEnabled ? ', 오프라인 메모' : ''}
                {draft.timetable.multipleEnabled
                  ? `, 다회차 ${draft.timetable.maxEntriesPerDay}회차`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">포맷</dt>
              <dd className="mt-1 text-slate-950">
                {v2_LOCALE_PRESET_LABELS[draft.formats.localePreset]} ·{' '}
                {v2_TIME_PRESET_LABELS[draft.formats.timePreset]} ·{' '}
                {v2_WEEK_DATE_PRESET_LABELS[draft.formats.weekDatePreset]}
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ImagePlus className="h-4 w-4" />
              에셋 슬롯
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {templateAssetRequirementGroups.length}개 제작 그룹,{' '}
              {templateAssetRequirements.length}개 입력 슬롯이 생성됩니다.
              {developmentAssetRequirements.length > 0
                ? ` 보조 슬롯 ${developmentAssetRequirements.length}개는 별도 관리됩니다.`
                : ''}
              {selectedAssetUploadCount > 0
                ? ` 생성 전에 ${selectedAssetUploadCount}개 파일을 업로드합니다.`
                : ''}
            </p>
          </div>

          {createError ? (
            <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {createError}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isFirstPanel || isCreating}
              onClick={() =>
                setActivePanelIndex((current) => Math.max(current - 1, 0))
              }
              className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </button>
            <button
              type="submit"
              disabled={!canCreate || isCreating}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLastPanel ? (
                isCreating ? (
                  '생성 중...'
                ) : (
                  '생성'
                )
              ) : (
                <>
                  다음
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          </section>
        </aside>
      </form>
    </div>
  );
};

export default TemplateEditorCreatePage;
