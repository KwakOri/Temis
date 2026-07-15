export type StudioRuntimeLocale = "ko" | "en" | "ja";

export const STUDIO_RUNTIME_LOCALE_STORAGE_KEY = "temis.platform.locale";
export const STUDIO_RUNTIME_LOCALE_COOKIE_KEY = "temis_platform_locale";

export const STUDIO_RUNTIME_LOCALE_OPTIONS: Array<{
  id: StudioRuntimeLocale;
  label: string;
}> = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
];

export interface StudioRuntimeCopy {
  language: string;
  back: string;
  previewScale: string;
  saveImage: string;
  savingImage: string;
  saveImageFailed: string;
  save: string;
  saving: string;
  saveFailed: string;
  saved: string;
  sourceDraft: string;
  sourcePublished: string;
  zoomOut: string;
  zoomIn: string;
  fitPreview: string;
  formTitle: string;
  dayCount: (count: number) => string;
  globalSettingsOnly: string;
  reset: string;
  basic: string;
  formSections: string;
  globalSettings: string;
  globalSettingsDescription: string;
  noGlobalInputs: string;
  weeklyTimetable: string;
  weeklyTimetableDescription: string;
  noTimetableDays: string;
  week: string;
  previousWeek: string;
  nextWeek: string;
  weekNotSet: string;
  weekRuntimeDescription: string;
  upload: string;
  cropImage: string;
  cropDescription: string;
  cropZoom: string;
  cropRotation: string;
  cropTargetFrame: string;
  cropTargetDescription: string;
  cropResetView: string;
  cropApply: string;
  cropProcessing: string;
  cropFailed: string;
  cancel: string;
  daySettings: string;
  time: string;
  hour: string;
  minute: string;
  guerrilla: string;
  subTitle: string;
  mainTitle: string;
  offlineMemo: string;
  offlineMemoPlaceholder: string;
  online: string;
  offline: string;
  memo: string;
  multi: string;
  memoDescription: string;
  toggleOfflineMemo: string;
  offlineMemoUnavailable: string;
  noEntries: string;
  addEntry: string;
  addEntryTo: (dayLabel: string) => string;
  entry: string;
  removeEntry: (entryNumber: number) => string;
  enableMultiToAdd: string;
  maximumEntriesReached: string;
  selectDayFirst: string;
}

const copies: Record<StudioRuntimeLocale, StudioRuntimeCopy> = {
  ko: {
    language: "언어",
    back: "뒤로가기",
    previewScale: "미리보기 배율",
    saveImage: "이미지로 저장",
    savingImage: "저장 중...",
    saveImageFailed: "이미지를 저장하지 못했습니다.",
    save: "저장",
    saving: "저장 중...",
    saveFailed: "저장하지 못했습니다.",
    saved: "저장되었습니다",
    sourceDraft: "초안",
    sourcePublished: "게시됨",
    zoomOut: "축소",
    zoomIn: "확대",
    fitPreview: "화면 맞춤",
    formTitle: "시간표",
    dayCount: (count) => `${count}일`,
    globalSettingsOnly: "공통 설정",
    reset: "초기화",
    basic: "기본 설정",
    formSections: "설정 영역",
    globalSettings: "공통 설정",
    globalSettingsDescription: "시간표 전체에 적용되는 값",
    noGlobalInputs: "공통 입력이 없습니다",
    weeklyTimetable: "주간 시간표",
    weeklyTimetableDescription: "요일별 일정을 바로 편집합니다",
    noTimetableDays: "시간표 요일이 없습니다",
    week: "주간 선택",
    previousWeek: "이전 주",
    nextWeek: "다음 주",
    weekNotSet: "날짜 미설정",
    weekRuntimeDescription: "미리보기에서 표시할 주를 선택합니다",
    upload: "새 이미지 업로드",
    cropImage: "이미지 자르기",
    cropDescription: "프로필 영역 비율에 맞춰 표시할 부분을 선택해 주세요.",
    cropZoom: "확대",
    cropRotation: "회전",
    cropTargetFrame: "프로필 영역",
    cropTargetDescription: "크롭 비율과 출력 크기는 에디터의 프로필 영역으로 고정됩니다.",
    cropResetView: "보기 초기화",
    cropApply: "자르기 적용",
    cropProcessing: "처리 중...",
    cropFailed: "이미지를 자르지 못했습니다.",
    cancel: "취소",
    daySettings: "요일 설정",
    time: "시간",
    hour: "시",
    minute: "분",
    guerrilla: "게릴라",
    subTitle: "서브 타이틀",
    mainTitle: "메인 타이틀",
    offlineMemo: "휴방 메모",
    offlineMemoPlaceholder: "휴방 메모를 입력해 주세요",
    online: "온라인",
    offline: "오프라인",
    memo: "메모",
    multi: "멀티",
    memoDescription: "휴방 메모 카드를 사용합니다",
    toggleOfflineMemo: "휴방 메모 전환",
    offlineMemoUnavailable: "이 템플릿에서는 휴방 메모를 사용할 수 없습니다",
    noEntries: "엔트리가 없습니다",
    addEntry: "엔트리 추가",
    addEntryTo: (dayLabel) => `${dayLabel}에 엔트리 추가`,
    entry: "엔트리",
    removeEntry: (entryNumber) => `엔트리 ${entryNumber} 삭제`,
    enableMultiToAdd: "엔트리를 추가하려면 멀티 상태를 활성화하세요",
    maximumEntriesReached: "추가할 수 있는 최대 엔트리 수입니다",
    selectDayFirst: "먼저 요일을 선택하세요",
  },
  en: {
    language: "Language",
    back: "Back",
    previewScale: "Preview scale",
    saveImage: "Save as image",
    savingImage: "Saving...",
    saveImageFailed: "Could not save the image.",
    save: "Save",
    saving: "Saving...",
    saveFailed: "Could not save.",
    saved: "Saved",
    sourceDraft: "Draft",
    sourcePublished: "Published",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    fitPreview: "Fit preview",
    formTitle: "Timetable",
    dayCount: (count) => `${count} days`,
    globalSettingsOnly: "Global settings",
    reset: "Reset",
    basic: "Basic",
    formSections: "Runtime form sections",
    globalSettings: "Global settings",
    globalSettingsDescription: "Shared values used by the whole timetable",
    noGlobalInputs: "No global inputs",
    weeklyTimetable: "Weekly timetable",
    weeklyTimetableDescription: "Edit each day without changing selection",
    noTimetableDays: "No timetable days",
    week: "Week",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    weekNotSet: "Not set",
    weekRuntimeDescription: "Choose the week shown in this preview",
    upload: "Upload new image",
    cropImage: "Crop image",
    cropDescription: "Choose the area to display in the profile frame.",
    cropZoom: "Zoom",
    cropRotation: "Rotation",
    cropTargetFrame: "Profile frame",
    cropTargetDescription:
      "The crop ratio and output size are fixed to the profile frame authored in the editor.",
    cropResetView: "Reset view",
    cropApply: "Apply crop",
    cropProcessing: "Processing...",
    cropFailed: "Could not crop the image.",
    cancel: "Cancel",
    daySettings: "Day",
    time: "Time",
    hour: "Hour",
    minute: "Minute",
    guerrilla: "Guerrilla",
    subTitle: "Sub Title",
    mainTitle: "Main Title",
    offlineMemo: "Offline Memo",
    offlineMemoPlaceholder: "Enter offline memo",
    online: "Online",
    offline: "Offline",
    memo: "Memo",
    multi: "Multi",
    memoDescription: "Use the offline memo card",
    toggleOfflineMemo: "Toggle offline memo",
    offlineMemoUnavailable: "Offline Memo is disabled for this template",
    noEntries: "No entries",
    addEntry: "Add entry",
    addEntryTo: (dayLabel) => `Add entry to ${dayLabel}`,
    entry: "Entry",
    removeEntry: (entryNumber) => `Remove entry ${entryNumber}`,
    enableMultiToAdd: "Enable Multi Status to add entries",
    maximumEntriesReached: "Maximum entries reached",
    selectDayFirst: "Select a day first",
  },
  ja: {
    language: "言語",
    back: "戻る",
    previewScale: "プレビュー倍率",
    saveImage: "画像として保存",
    savingImage: "保存中...",
    saveImageFailed: "画像を保存できませんでした。",
    save: "保存",
    saving: "保存中...",
    saveFailed: "保存できませんでした。",
    saved: "保存しました",
    sourceDraft: "下書き",
    sourcePublished: "公開済み",
    zoomOut: "縮小",
    zoomIn: "拡大",
    fitPreview: "画面に合わせる",
    formTitle: "時間割",
    dayCount: (count) => `${count}日`,
    globalSettingsOnly: "共通設定",
    reset: "リセット",
    basic: "基本設定",
    formSections: "設定セクション",
    globalSettings: "共通設定",
    globalSettingsDescription: "時間割全体に適用される値",
    noGlobalInputs: "共通入力はありません",
    weeklyTimetable: "週間時間割",
    weeklyTimetableDescription: "曜日ごとの予定を直接編集します",
    noTimetableDays: "時間割の曜日がありません",
    week: "週の選択",
    previousWeek: "前の週",
    nextWeek: "次の週",
    weekNotSet: "日付未設定",
    weekRuntimeDescription: "プレビューに表示する週を選択します",
    upload: "新しい画像をアップロード",
    cropImage: "画像を切り抜く",
    cropDescription: "プロフィール枠に表示する範囲を選択してください。",
    cropZoom: "拡大",
    cropRotation: "回転",
    cropTargetFrame: "プロフィール枠",
    cropTargetDescription:
      "切り抜き比率と出力サイズはエディターのプロフィール枠に固定されます。",
    cropResetView: "表示をリセット",
    cropApply: "切り抜きを適用",
    cropProcessing: "処理中...",
    cropFailed: "画像を切り抜けませんでした。",
    cancel: "キャンセル",
    daySettings: "曜日設定",
    time: "時間",
    hour: "時",
    minute: "分",
    guerrilla: "ゲリラ",
    subTitle: "サブタイトル",
    mainTitle: "メインタイトル",
    offlineMemo: "休止メモ",
    offlineMemoPlaceholder: "休止メモを入力してください",
    online: "オンライン",
    offline: "オフライン",
    memo: "メモ",
    multi: "マルチ",
    memoDescription: "休止メモカードを使用します",
    toggleOfflineMemo: "休止メモの切り替え",
    offlineMemoUnavailable: "このテンプレートでは休止メモを使用できません",
    noEntries: "エントリーがありません",
    addEntry: "エントリーを追加",
    addEntryTo: (dayLabel) => `${dayLabel}にエントリーを追加`,
    entry: "エントリー",
    removeEntry: (entryNumber) => `エントリー${entryNumber}を削除`,
    enableMultiToAdd: "追加するにはマルチ状態を有効にしてください",
    maximumEntriesReached: "追加できる最大エントリー数です",
    selectDayFirst: "先に曜日を選択してください",
  },
};

const dayLabels: Record<
  StudioRuntimeLocale,
  Record<string, { short: string; long: string }>
> = {
  ko: {
    mon: { short: "월", long: "월요일" },
    tue: { short: "화", long: "화요일" },
    wed: { short: "수", long: "수요일" },
    thu: { short: "목", long: "목요일" },
    fri: { short: "금", long: "금요일" },
    sat: { short: "토", long: "토요일" },
    sun: { short: "일", long: "일요일" },
  },
  en: {
    mon: { short: "Mon", long: "Monday" },
    tue: { short: "Tue", long: "Tuesday" },
    wed: { short: "Wed", long: "Wednesday" },
    thu: { short: "Thu", long: "Thursday" },
    fri: { short: "Fri", long: "Friday" },
    sat: { short: "Sat", long: "Saturday" },
    sun: { short: "Sun", long: "Sunday" },
  },
  ja: {
    mon: { short: "月", long: "月曜日" },
    tue: { short: "火", long: "火曜日" },
    wed: { short: "水", long: "水曜日" },
    thu: { short: "木", long: "木曜日" },
    fri: { short: "金", long: "金曜日" },
    sat: { short: "土", long: "土曜日" },
    sun: { short: "日", long: "日曜日" },
  },
};

const intlLocales: Record<StudioRuntimeLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

export const isStudioRuntimeLocale = (
  value: unknown,
): value is StudioRuntimeLocale =>
  value === "ko" || value === "en" || value === "ja";

export const normalizeStudioRuntimeLocale = (
  value: string | undefined,
): StudioRuntimeLocale => {
  const normalized = value?.trim().toLowerCase();
  if (normalized?.startsWith("ko") || normalized === "kr") return "ko";
  if (normalized?.startsWith("ja") || normalized === "jp") return "ja";
  return "en";
};

export const getStudioRuntimeCopy = (
  locale: StudioRuntimeLocale,
): StudioRuntimeCopy => copies[locale] ?? copies.en;

export const getStudioRuntimeIntlLocale = (
  locale: StudioRuntimeLocale,
): string => intlLocales[locale] ?? intlLocales.en;

export const getStudioRuntimeDayLabel = ({
  locale,
  dayId,
  width,
  fallback,
}: {
  locale: StudioRuntimeLocale;
  dayId: string;
  width: "short" | "long";
  fallback: string;
}): string => dayLabels[locale]?.[dayId]?.[width] ?? fallback;

const parseRuntimeIsoDate = (value: string | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
};

export const formatStudioRuntimeWeekStartDate = ({
  startDate,
  fallback,
}: {
  startDate: string | null;
  fallback: string;
}): string => {
  const start = parseRuntimeIsoDate(startDate);
  if (!start) return fallback;

  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}`;
};

export const getLocalizedStudioAddEntryDisabledReason = (
  copy: StudioRuntimeCopy,
  reason: string | null,
): string | null => {
  if (reason === null) return null;
  if (reason === "Enable Multi Status to add entries") {
    return copy.enableMultiToAdd;
  }
  if (reason === "Maximum entries reached") {
    return copy.maximumEntriesReached;
  }
  if (reason === "Select a day first") return copy.selectDayFirst;
  return reason;
};
