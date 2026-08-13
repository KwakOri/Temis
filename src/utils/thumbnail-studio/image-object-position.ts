import type { StudioStyleRecord } from "@/types/template-studio";

export interface StudioImageObjectPosition {
  x: number;
  y: number;
}

export const STUDIO_IMAGE_OBJECT_POSITION_DEFAULT: StudioImageObjectPosition = {
  x: 50,
  y: 50,
};

const clampPercentage = (value: number): number =>
  Math.min(Math.max(value, 0), 100);

const parsePositionToken = (token: string, axis: "x" | "y"): number | null => {
  const normalized = token.trim().toLowerCase();
  const keywordValues: Record<string, number> =
    axis === "x"
      ? { left: 0, center: 50, right: 100 }
      : { top: 0, center: 50, bottom: 100 };
  if (normalized in keywordValues) return keywordValues[normalized] ?? null;

  const match = normalized.match(/^(-?(?:\d+\.?\d*|\.\d+))%?$/);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? clampPercentage(value) : null;
};

/**
 * CSS object-position의 편집기 표현을 읽는다.
 *
 * Thumbnail Studio는 focus를 퍼센트 두 개로 저장한다. 오래된 문서나 외부 JSON이
 * keyword를 보내도 읽을 수 있게 하되, 알 수 없는 값은 안전한 중앙으로 되돌린다.
 */
export const parseStudioImageObjectPosition = (
  value: unknown,
): StudioImageObjectPosition => {
  if (typeof value !== "string")
    return { ...STUDIO_IMAGE_OBJECT_POSITION_DEFAULT };

  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 2) {
    return { ...STUDIO_IMAGE_OBJECT_POSITION_DEFAULT };
  }

  const x = parsePositionToken(tokens[0] ?? "", "x");
  const y = parsePositionToken(tokens[1] ?? "center", "y");
  if (x === null || y === null) {
    return { ...STUDIO_IMAGE_OBJECT_POSITION_DEFAULT };
  }

  return { x, y };
};

const formatPercentage = (value: number): string =>
  `${Number(clampPercentage(value).toFixed(2))}%`;

/** object-position을 외부 CSS로 내보낼 canonical 문자열. */
export const formatStudioImageObjectPosition = ({
  x,
  y,
}: StudioImageObjectPosition): string =>
  `${formatPercentage(x)} ${formatPercentage(y)}`;

/** style record에서 focus를 읽고, 저장 경계의 범위 계약을 적용한다. */
export const getStudioImageObjectPosition = (
  style: StudioStyleRecord | undefined,
): StudioImageObjectPosition =>
  parseStudioImageObjectPosition(style?.objectPosition);

/** 이미지 반경은 음수나 비유한 값을 CSS로 흘리지 않는다. */
export const getStudioImageBorderRadius = (
  style: StudioStyleRecord | undefined,
): number => {
  const value = style?.borderRadius;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
};
