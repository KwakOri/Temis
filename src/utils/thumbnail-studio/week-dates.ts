import type {
  StudioInputDefinition,
  StudioTemplateDocument,
  StudioThumbnailWeekDates,
} from "@/types/template-studio";
import { normalizeThumbnailStudioInputPresentation } from "@/utils/thumbnail-studio/input-order";
import { parseStudioIsoDateParts } from "@/utils/template-studio/date-template";

export const THUMBNAIL_WEEK_DATES_START_INPUT_ID = "week-start-date";
export const THUMBNAIL_WEEK_DATES_DEFAULT_LOCALE = "ko-KR";

const getLocalIsoDate = (): string => {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) =>
      index === 0
        ? String(value).padStart(4, "0")
        : String(value).padStart(2, "0"),
    )
    .join("-");
};

const getNextInputId = (
  document: StudioTemplateDocument,
  baseId: string,
): string => {
  if (!document.inputs[baseId]) return baseId;
  let suffix = 2;
  while (document.inputs[`${baseId}-${suffix}`]) suffix += 1;
  return `${baseId}-${suffix}`;
};

const createThumbnailWeekStartDateInput = (inputId: string) => ({
  id: inputId,
  type: "text" as const,
  scope: "global" as const,
  label: "Date",
  description: "The date displayed on the thumbnail.",
  defaultValue: getLocalIsoDate(),
  required: true,
  presentation: {
    control: "date" as const,
    groupId: "Week Dates",
    helpText: "Choose the date to display.",
  },
});

type LegacyThumbnailWeekDates = {
  dateInputId?: string;
  startDateInputId?: string;
  dayCount?: number;
  locale?: string;
};

const isTextInput = (
  input: StudioInputDefinition | undefined,
): input is Extract<StudioInputDefinition, { type: "text" }> =>
  input?.type === "text";

export const getThumbnailWeekDates = (
  document: StudioTemplateDocument,
): StudioThumbnailWeekDates | null =>
  document.domains?.thumbnail?.weekDates ?? null;

/** 새 계약과 마이그레이션 전 레거시 계약에서 썸네일 날짜 input id를 읽는다. */
export const getThumbnailWeekDatesInputId = (
  document: StudioTemplateDocument,
): string | null => {
  const weekDates = document.domains?.thumbnail?.weekDates as
    LegacyThumbnailWeekDates | undefined;
  return weekDates?.dateInputId ?? weekDates?.startDateInputId ?? null;
};

/**
 * Thumbnail Week Dates가 사용할 global date input과 도메인 계약을 준비한다.
 * 이미 계약이 있으면 같은 input을 재사용하므로 Week Dates 객체가 여러 개여도
 * 날짜 input은 하나만 노출된다.
 */
export const ensureThumbnailWeekDatesContract = (
  document: StudioTemplateDocument,
): string => {
  const current = document.domains?.thumbnail?.weekDates as
    LegacyThumbnailWeekDates | undefined;
  let inputId = current?.dateInputId ?? current?.startDateInputId;

  if (!inputId || !isTextInput(document.inputs[inputId])) {
    inputId = getNextInputId(
      document,
      inputId ?? THUMBNAIL_WEEK_DATES_START_INPUT_ID,
    );
  }

  const input = document.inputs[inputId];
  if (!input) {
    document.inputs[inputId] = createThumbnailWeekStartDateInput(inputId);
  } else if (isTextInput(input)) {
    input.presentation = {
      ...(input.presentation ?? {}),
      control: "date",
      groupId: input.presentation?.groupId ?? "Week Dates",
    };
    if (!input.required) input.required = true;
  }

  document.domains = {
    ...(document.domains ?? {}),
    thumbnail: {
      ...(document.domains?.thumbnail ?? {
        version: 1,
        export: { defaultFormat: "png", transparentBackground: false },
      }),
      weekDates: {
        dateInputId: inputId,
        locale: current?.locale ?? THUMBNAIL_WEEK_DATES_DEFAULT_LOCALE,
      },
    },
  };
  normalizeThumbnailStudioInputPresentation(document);
  return inputId;
};

export const isStudioIsoDateInputValue = (value: string | undefined): boolean =>
  Boolean(parseStudioIsoDateParts(value));
