import type { StudioBinding } from "@/types/template-studio";

/** 텍스트 틀 안에서 입력값이 들어갈 자리. */
export const STUDIO_INPUT_TEXT_VALUE_TOKEN = "${value}";

const VALUE_TOKEN_PATTERN = /\$\{\s*value\s*\}/g;

export const STUDIO_INPUT_TEXT_TEMPLATE_PRESETS = [
  {
    id: "value",
    label: "입력값 그대로",
    template: STUDIO_INPUT_TEXT_VALUE_TOKEN,
  },
  {
    id: "at",
    label: "@ 입력값",
    template: `@ ${STUDIO_INPUT_TEXT_VALUE_TOKEN}`,
  },
];

/**
 * 입력값을 텍스트 틀에 넣는다.
 *
 * 입력값이 비어 있으면 틀의 고정 글자도 함께 비운다. 이름 없이 "@ "만 남으면
 * 사용자가 지울 방법이 없다.
 */
export const applyStudioInputTextTemplate = (
  value: string,
  template?: string,
): string => {
  if (!template || !value) return value;
  // 함수로 넘겨야 입력값 안의 `$&` 같은 글자가 치환 규칙으로 읽히지 않는다.
  return template.replace(VALUE_TOKEN_PATTERN, () => value);
};

/** 입력값만 쓰는 틀은 저장하지 않는다. */
export const normalizeStudioInputTextTemplate = (
  template?: string,
): string | undefined =>
  !template ||
  template.replace(VALUE_TOKEN_PATTERN, STUDIO_INPUT_TEXT_VALUE_TOKEN) ===
    STUDIO_INPUT_TEXT_VALUE_TOKEN
    ? undefined
    : template;

/** 입력 텍스트 바인딩의 틀만 바꾼다. 입력 연결은 그대로 둔다. */
export const applyStudioInputTextTemplatePatch = (
  target: { binding?: StudioBinding },
  template: string | undefined,
) => {
  if (target.binding?.kind !== "inputText") return;
  const binding = { ...target.binding };
  if (template) binding.textTemplate = template;
  else delete binding.textTemplate;
  target.binding = binding;
};
