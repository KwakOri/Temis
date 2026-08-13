import {
  StudioInputDefinition,
  StudioInputId,
  StudioInputScope,
  StudioTemplateDocument,
  StudioTimetableObjectPresetId,
} from "@/types/template-studio";

import { createStudioId } from "./id";

const normalizeInputLabel = (label: string): string =>
  label.trim().toLowerCase().replace(/\s+/g, " ");

export const STUDIO_WEEKLY_MEMO_INPUT_LABEL = "Weekly Memo";
export const STUDIO_WEEKLY_MEMO_DEFAULT_VALUE = "Weekly memo";
export const STUDIO_WEEKLY_MEMO_PLACEHOLDER = "Write a weekly memo";
export const STUDIO_ARTIST_PROFILE_TEXT_INPUT_LABEL = "Artist";
export const STUDIO_ARTIST_PROFILE_TEXT_DEFAULT_VALUE = "Artist";
export const STUDIO_ARTIST_PROFILE_TEXT_PLACEHOLDER =
  "Write artist or profile text";
export const STUDIO_WEEKLY_MEMO_BACKGROUND_INPUT_LABEL =
  "Weekly Memo Background";
export const STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL = "Profile Block Image";
export const STUDIO_PROFILE_BLOCK_FRAME_INPUT_LABEL = "Profile Block Frame";
export const STUDIO_ARTIST_PROFILE_TEXT_ASSET_INPUT_LABEL =
  "Artist / Profile Text Asset";
export const STUDIO_TOP_OBJECT_IMAGE_INPUT_LABEL = "Top Object Image";

const STUDIO_TIMETABLE_VARIANT_INPUT_LABELS: Partial<
  Record<StudioTimetableObjectPresetId, string>
> = {
  weeklyMemo: "Weekly Memo Status",
  artistProfileText: "Artist Status",
  topObject: "Top Object Status",
};

export const isStudioTimetableVariantInputCompatible = (
  document: StudioTemplateDocument,
  inputId: StudioInputId | null | undefined,
) => {
  if (!inputId) return false;
  const input = document.inputs[inputId];
  if (!input || input.type !== "select" || input.scope !== "global") {
    return false;
  }

  const optionValues = new Set(input.options.map((option) => option.value));
  return optionValues.has("on") && optionValues.has("off");
};

export const ensureStudioTimetableVariantInput = (
  document: StudioTemplateDocument,
  presetId: StudioTimetableObjectPresetId,
): { inputId: StudioInputId; created: boolean } | null => {
  const label = STUDIO_TIMETABLE_VARIANT_INPUT_LABELS[presetId];
  if (!label) return null;

  const normalizedLabel = normalizeInputLabel(label);
  const existingInput = Object.values(document.inputs).find(
    (input) =>
      input.type === "select" &&
      input.scope === "global" &&
      normalizeInputLabel(input.label) === normalizedLabel,
  );

  if (existingInput?.type === "select") {
    existingInput.options = [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ];
    if (
      existingInput.defaultValue !== "on" &&
      existingInput.defaultValue !== "off"
    ) {
      existingInput.defaultValue = "on";
    }
    return { inputId: existingInput.id, created: false };
  }

  const inputId = createStudioId("input");
  document.inputs[inputId] = {
    id: inputId,
    type: "select",
    scope: "global",
    label,
    defaultValue: "on",
    options: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  };

  return { inputId, created: true };
};

const STUDIO_WEEKLY_MEMO_MATCHING_LABELS = new Set([
  normalizeInputLabel(STUDIO_WEEKLY_MEMO_INPUT_LABEL),
  normalizeInputLabel("Week Memo"),
]);

const STUDIO_ARTIST_PROFILE_TEXT_MATCHING_LABELS = new Set([
  normalizeInputLabel(STUDIO_ARTIST_PROFILE_TEXT_INPUT_LABEL),
  normalizeInputLabel("Artist / Profile Text"),
  normalizeInputLabel("Artist Profile Text"),
  normalizeInputLabel("Artist Profile"),
  normalizeInputLabel("Profile Text"),
]);

export const findStudioWeeklyMemoInput = (
  document: StudioTemplateDocument,
): StudioInputDefinition | null =>
  Object.values(document.inputs).find(
    (input) =>
      input.type === "text" &&
      input.scope === "global" &&
      STUDIO_WEEKLY_MEMO_MATCHING_LABELS.has(normalizeInputLabel(input.label)),
  ) ?? null;

export const ensureStudioWeeklyMemoInput = (
  document: StudioTemplateDocument,
): { inputId: StudioInputId; created: boolean } => {
  const existingInput = findStudioWeeklyMemoInput(document);
  if (existingInput) {
    return {
      inputId: existingInput.id,
      created: false,
    };
  }

  const inputId = createStudioId("input");
  document.inputs[inputId] = {
    id: inputId,
    type: "text",
    scope: "global",
    label: STUDIO_WEEKLY_MEMO_INPUT_LABEL,
    placeholder: STUDIO_WEEKLY_MEMO_PLACEHOLDER,
    defaultValue: STUDIO_WEEKLY_MEMO_DEFAULT_VALUE,
    maxLength: 180,
    multiline: true,
    minRows: 4,
  };

  return {
    inputId,
    created: true,
  };
};

export const findStudioArtistProfileTextInput = (
  document: StudioTemplateDocument,
): StudioInputDefinition | null =>
  Object.values(document.inputs).find(
    (input) =>
      input.type === "text" &&
      input.scope === "global" &&
      STUDIO_ARTIST_PROFILE_TEXT_MATCHING_LABELS.has(
        normalizeInputLabel(input.label),
      ),
  ) ?? null;

export const ensureStudioArtistProfileTextInput = (
  document: StudioTemplateDocument,
): { inputId: StudioInputId; created: boolean } => {
  const existingInput = findStudioArtistProfileTextInput(document);
  if (existingInput) {
    return {
      inputId: existingInput.id,
      created: false,
    };
  }

  const inputId = createStudioId("input");
  document.inputs[inputId] = {
    id: inputId,
    type: "text",
    scope: "global",
    label: STUDIO_ARTIST_PROFILE_TEXT_INPUT_LABEL,
    placeholder: STUDIO_ARTIST_PROFILE_TEXT_PLACEHOLDER,
    defaultValue: STUDIO_ARTIST_PROFILE_TEXT_DEFAULT_VALUE,
    maxLength: 120,
    multiline: true,
    minRows: 3,
  };

  return {
    inputId,
    created: true,
  };
};

export const findStudioPresetImageInput = (
  document: StudioTemplateDocument,
  options: {
    label: string;
    scope?: StudioInputScope;
  },
): StudioInputDefinition | null => {
  const scope = options.scope ?? "global";
  const normalizedLabel = normalizeInputLabel(options.label);

  return (
    Object.values(document.inputs).find(
      (input) =>
        input.type === "image" &&
        input.scope === scope &&
        normalizeInputLabel(input.label) === normalizedLabel,
    ) ?? null
  );
};

export const ensureStudioPresetImageInput = (
  document: StudioTemplateDocument,
  options: {
    label: string;
    scope?: StudioInputScope;
    placeholder?: string;
    defaultUrl?: string;
  },
): { inputId: StudioInputId; created: boolean } => {
  const existingInput = findStudioPresetImageInput(document, options);
  if (existingInput) {
    return {
      inputId: existingInput.id,
      created: false,
    };
  }

  const inputId = createStudioId("input");
  document.inputs[inputId] = {
    id: inputId,
    type: "image",
    scope: options.scope ?? "global",
    label: options.label,
    placeholder: options.placeholder ?? "Paste image URL",
    defaultUrl: options.defaultUrl ?? "",
  };

  return {
    inputId,
    created: true,
  };
};
