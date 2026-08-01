import type {
  StudioImageInputDefinition,
  StudioImageInputPolicy,
  StudioInputDefinition,
} from "@/types/template-studio";

/** 정책이 없는 기존 image input이 보여 줄 안전한 기본 권한. */
export const getStudioImageInputPolicy = (
  policy?: StudioImageInputPolicy,
): StudioImageInputPolicy => ({
  allowReplace: policy?.allowReplace !== false,
  allowFitChange: policy?.allowFitChange !== false,
  allowFocusChange: policy?.allowFocusChange !== false,
  allowCrop: policy?.allowCrop !== false,
  ...(typeof policy?.recommendedAspectRatio === "number" &&
  Number.isFinite(policy.recommendedAspectRatio) &&
  policy.recommendedAspectRatio > 0
    ? { recommendedAspectRatio: policy.recommendedAspectRatio }
    : {}),
});

/** command가 저장할 image policy를 canonical shape으로 만든다. */
export const normalizeStudioImageInputPolicy = (
  policy?: StudioImageInputPolicy,
): StudioImageInputPolicy | undefined => {
  if (!policy) return undefined;
  return getStudioImageInputPolicy(policy);
};

/** help text는 공백만인 값을 저장하지 않고 앞뒤 공백을 제거한다. */
export const normalizeStudioInputHelpText = (
  value: unknown,
): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
};

/** Thumbnail input command가 저장할 image input의 policy/presentation 경계. */
export const normalizeThumbnailStudioImageInput = (
  input: StudioImageInputDefinition,
): StudioImageInputDefinition => {
  const presentation = input.presentation
    ? { ...input.presentation }
    : undefined;
  const helpText = normalizeStudioInputHelpText(presentation?.helpText);

  if (presentation) {
    if (helpText) presentation.helpText = helpText;
    else delete presentation.helpText;
  }

  return {
    ...input,
    policy: normalizeStudioImageInputPolicy(input.policy),
    presentation,
  };
};

export const normalizeThumbnailStudioInputDefinition = (
  input: StudioInputDefinition,
): StudioInputDefinition =>
  input.type === "image" ? normalizeThumbnailStudioImageInput(input) : input;
