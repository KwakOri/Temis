import type {
  StudioInputDefinition,
  StudioTemplateDocument,
  StudioThumbnailWeekDates,
} from "@/types/template-studio";
import { normalizeThumbnailStudioInputPresentation } from "@/utils/thumbnail-studio/input-order";
import { parseStudioIsoDateParts } from "@/utils/template-studio/date-template";

export const THUMBNAIL_WEEK_DATES_START_INPUT_ID = "week-start-date";
export const THUMBNAIL_WEEK_DATES_DEFAULT_DAY_COUNT = 7;
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
  label: "Week Start Date",
  description: "The first date used to calculate the 7-day range.",
  defaultValue: getLocalIsoDate(),
  required: true,
  presentation: {
    control: "date" as const,
    groupId: "Week Dates",
    helpText: "Choose the first day of the 7-day range.",
  },
});

const isTextInput = (
  input: StudioInputDefinition | undefined,
): input is Extract<StudioInputDefinition, { type: "text" }> =>
  input?.type === "text";

export const getThumbnailWeekDates = (
  document: StudioTemplateDocument,
): StudioThumbnailWeekDates | null =>
  document.domains?.thumbnail?.weekDates ?? null;

/**
 * Thumbnail Week Dates가 사용할 global date input과 도메인 계약을 준비한다.
 * 이미 계약이 있으면 같은 input을 재사용하므로 Week Dates 객체가 여러 개여도
 * 시작일은 하나만 노출된다.
 */
export const ensureThumbnailWeekDatesContract = (
  document: StudioTemplateDocument,
): string => {
  const current = document.domains?.thumbnail?.weekDates;
  let inputId = current?.startDateInputId;

  if (!inputId || !isTextInput(document.inputs[inputId])) {
    inputId = getNextInputId(
      document,
      current?.startDateInputId ?? THUMBNAIL_WEEK_DATES_START_INPUT_ID,
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
        startDateInputId: inputId,
        dayCount: current?.dayCount ?? THUMBNAIL_WEEK_DATES_DEFAULT_DAY_COUNT,
        locale: current?.locale ?? THUMBNAIL_WEEK_DATES_DEFAULT_LOCALE,
      },
    },
  };
  normalizeThumbnailStudioInputPresentation(document);
  return inputId;
};

export const isStudioIsoDateInputValue = (value: string | undefined): boolean =>
  Boolean(parseStudioIsoDateParts(value));
