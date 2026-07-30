import type { StudioStyleRecord } from "@/types/template-studio";

/**
 * Auto Text(`flexibleText`)가 박스 안에서 줄을 어떻게 다룰지 결정하는 모드.
 *
 * - `preserve`: 바인딩된 텍스트의 개행 문자를 그대로 반영한다(`white-space: pre`).
 *   기존 동작이며 값이 없을 때의 기본값이다.
 * - `single`: 개행을 무시하고 한 줄로 렌더한다(`white-space: nowrap`).
 *
 * 값은 `StudioStyleRecord`에 문자열로 저장한다. 레코드가 `string | number`만
 * 허용하므로 boolean을 쓰지 않고, 나중에 자동 줄바꿈 모드를 추가할 때도
 * 문서 마이그레이션 없이 값만 늘릴 수 있게 열린 enum으로 둔다.
 */
export type StudioTextWrapMode = "preserve" | "single";

export const STUDIO_TEXT_WRAP_MODE_STYLE_KEY = "textWrapMode";

export const STUDIO_DEFAULT_TEXT_WRAP_MODE: StudioTextWrapMode = "preserve";

export const STUDIO_TEXT_WRAP_MODE_OPTIONS: Array<{
  value: StudioTextWrapMode;
  label: string;
  description: string;
}> = [
  {
    value: "preserve",
    label: "Preserve",
    description: "Keep line breaks from the bound text",
  },
  {
    value: "single",
    label: "Single line",
    description: "Ignore line breaks and fit one line",
  },
];

/**
 * 스타일 레코드에서 줄바꿈 모드를 읽는다. 값이 없거나 알 수 없는 값이면
 * 기존 동작(`preserve`)으로 떨어져서 이전 문서의 렌더 결과가 바뀌지 않는다.
 */
export const getStudioTextWrapMode = (
  style: StudioStyleRecord | undefined,
): StudioTextWrapMode =>
  style?.[STUDIO_TEXT_WRAP_MODE_STYLE_KEY] === "single"
    ? "single"
    : STUDIO_DEFAULT_TEXT_WRAP_MODE;

/**
 * `AutoResizeText`의 `multiline` prop으로 변환한다. `multiline`은 자동 줄바꿈이
 * 아니라 개행 문자 보존 여부를 뜻한다(`pre` vs `nowrap`).
 */
export const isStudioTextWrapModeMultiline = (
  mode: StudioTextWrapMode,
): boolean => mode === "preserve";
