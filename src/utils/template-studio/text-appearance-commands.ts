import type {
  StudioGraphNode,
  StudioStyleRecord,
  StudioTextAppearance,
  StudioTextFill,
  StudioTextShadow,
  StudioTextStroke,
} from "@/types/template-studio";
import {
  getStudioTextFillPrimaryColor,
  hasLegacyStudioTextShadow,
  isStudioTextFillColor,
  parseLegacyStudioTextShadow,
  resolveStudioTextAppearance,
  STUDIO_TEXT_DEFAULT_FILL_COLOR,
  STUDIO_TEXT_MAX_OPACITY,
  STUDIO_TEXT_MAX_OUTSET,
  STUDIO_TEXT_MAX_STROKES,
} from "@/utils/template-studio/text-appearance";

export {
  STUDIO_TEXT_MAX_OPACITY,
  STUDIO_TEXT_MAX_OUTSET,
  STUDIO_TEXT_MAX_STROKES,
};
export const STUDIO_TEXT_MIN_OUTSET = 0;
export const STUDIO_TEXT_MIN_OPACITY = 0;
export const STUDIO_TEXT_MIN_FILL_ANGLE = 0;
export const STUDIO_TEXT_MAX_FILL_ANGLE = 360;
export const STUDIO_TEXT_DEFAULT_STROKE_THICKNESS = 4;

export const isStudioTextOutset = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= STUDIO_TEXT_MIN_OUTSET &&
  value <= STUDIO_TEXT_MAX_OUTSET;

export const isStudioTextOpacity = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= STUDIO_TEXT_MIN_OPACITY &&
  value <= STUDIO_TEXT_MAX_OPACITY;

export interface StudioTextAppearanceDiagnostic {
  code: string;
  message: string;
}

export interface StudioTextAppearanceMaterializeSuccess {
  ok: true;
  appearance: StudioTextAppearance;
  style: StudioStyleRecord;
  diagnostics: [];
}

export interface StudioTextAppearanceMaterializeFailure {
  ok: false;
  diagnostics: StudioTextAppearanceDiagnostic[];
}

export type StudioTextAppearanceMaterializeResult =
  | StudioTextAppearanceMaterializeSuccess
  | StudioTextAppearanceMaterializeFailure;

const diagnostic = (
  code: string,
  message: string,
): StudioTextAppearanceDiagnostic => ({ code, message });

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isConcreteLegacyCurrentColor = (color: string | null): color is string =>
  Boolean(color && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim()));

const materializeLegacyShadowColor = (
  shadow: StudioTextShadow,
  fillColor: string | null,
): StudioTextShadow | null => {
  if (shadow.color !== "currentColor") return shadow;
  if (!isConcreteLegacyCurrentColor(fillColor)) return null;
  return { ...shadow, color: fillColor.trim() };
};

/** 구조화 효과가 저장된 뒤에도 legacy scalar text appearance가 다시 살아나지 않게 한다. */
export const removeLegacyStudioTextAppearanceScalars = (
  style: StudioStyleRecord,
): StudioStyleRecord => {
  const nextStyle = { ...style };
  delete nextStyle.WebkitTextStroke;
  delete nextStyle.webkitTextStroke;
  delete nextStyle.textShadow;
  return nextStyle;
};

export const cloneStudioTextAppearance = (
  appearance: StudioTextAppearance,
): StudioTextAppearance => clone(appearance);

export const clampStudioTextOutset = (value: number): number =>
  Math.min(
    STUDIO_TEXT_MAX_OUTSET,
    Math.max(
      STUDIO_TEXT_MIN_OUTSET,
      Number.isFinite(value) ? value : STUDIO_TEXT_MIN_OUTSET,
    ),
  );

export const clampStudioTextOpacity = (value: number): number =>
  Math.min(
    STUDIO_TEXT_MAX_OPACITY,
    Math.max(
      STUDIO_TEXT_MIN_OPACITY,
      Number.isFinite(value) ? value : STUDIO_TEXT_MAX_OPACITY,
    ),
  );

/** 저장 경계를 validator와 document command가 공유한다. */
export const validateStudioTextAppearance = (
  appearance: StudioTextAppearance,
): StudioTextAppearanceDiagnostic[] => {
  const diagnostics: StudioTextAppearanceDiagnostic[] = [];

  const fill = appearance?.fill as
    (StudioTextFill & Record<string, unknown>) | undefined;
  if (!fill || (fill.type !== "solid" && fill.type !== "linearGradient")) {
    diagnostics.push(
      diagnostic(
        "fill-type",
        "Text fill type must be solid or linearGradient.",
      ),
    );
  } else {
    const validateColor = (key: "color" | "startColor" | "endColor") => {
      const value = fill[key];
      if (typeof value !== "string" || value.trim() === "") {
        diagnostics.push(
          diagnostic(`fill-${key}-empty`, `Text fill ${key} is required.`),
        );
        return;
      }
      if (!isStudioTextFillColor(value)) {
        diagnostics.push(
          diagnostic(`fill-${key}-invalid`, `Text fill ${key} is invalid.`),
        );
      }
    };

    if (fill.type === "solid") {
      validateColor("color");
    } else {
      validateColor("startColor");
      validateColor("endColor");
      if (fill.angleDeg === undefined) {
        diagnostics.push(
          diagnostic(
            "fill-angle-missing",
            "Text gradient angleDeg is required.",
          ),
        );
      } else if (
        typeof fill.angleDeg !== "number" ||
        !Number.isFinite(fill.angleDeg)
      ) {
        diagnostics.push(
          diagnostic(
            "fill-angle-invalid",
            "Text gradient angleDeg must be a finite number.",
          ),
        );
      } else if (
        fill.angleDeg < STUDIO_TEXT_MIN_FILL_ANGLE ||
        fill.angleDeg > STUDIO_TEXT_MAX_FILL_ANGLE
      ) {
        diagnostics.push(
          diagnostic(
            "fill-angle-out-of-range",
            `Text gradient angleDeg must be between ${STUDIO_TEXT_MIN_FILL_ANGLE} and ${STUDIO_TEXT_MAX_FILL_ANGLE}.`,
          ),
        );
      }
    }

    if (
      typeof fill.opacity !== "number" ||
      !Number.isFinite(fill.opacity) ||
      fill.opacity < STUDIO_TEXT_MIN_OPACITY ||
      fill.opacity > STUDIO_TEXT_MAX_OPACITY
    ) {
      diagnostics.push(
        diagnostic(
          "fill-opacity",
          "Text fill opacity must be between 0 and 1.",
        ),
      );
    }
  }

  if (!Array.isArray(appearance.strokes)) {
    diagnostics.push(
      diagnostic("strokes-type", "Text strokes must be an array."),
    );
    return diagnostics;
  }

  if (appearance.strokes.length > STUDIO_TEXT_MAX_STROKES) {
    diagnostics.push(
      diagnostic(
        "strokes-count",
        `Text supports at most ${STUDIO_TEXT_MAX_STROKES} strokes.`,
      ),
    );
  }

  const strokeIds = new Set<string>();
  appearance.strokes.forEach((stroke, index) => {
    if (
      !stroke ||
      typeof stroke.id !== "string" ||
      stroke.id.trim() === "" ||
      strokeIds.has(stroke.id)
    ) {
      diagnostics.push(
        diagnostic(
          `stroke-id:${index}`,
          `Stroke ${index + 1} has a missing or duplicate id.`,
        ),
      );
    }
    if (!stroke) return;
    strokeIds.add(stroke.id);

    if (
      typeof stroke.enabled !== "boolean" ||
      typeof stroke.color !== "string"
    ) {
      diagnostics.push(
        diagnostic(
          `stroke-shape:${index}`,
          `Stroke ${index + 1} has invalid fields.`,
        ),
      );
    }
    if (!isStudioTextOutset(stroke.outset)) {
      diagnostics.push(
        diagnostic(
          `stroke-outset:${index}`,
          `Stroke ${index + 1} outset must be between 0 and ${STUDIO_TEXT_MAX_OUTSET}.`,
        ),
      );
    }
    if (!isStudioTextOpacity(stroke.opacity)) {
      diagnostics.push(
        diagnostic(
          `stroke-opacity:${index}`,
          `Stroke ${index + 1} opacity must be between 0 and 1.`,
        ),
      );
    }
  });

  const shadow = appearance.shadow;
  if (shadow) {
    if (
      typeof shadow.enabled !== "boolean" ||
      typeof shadow.color !== "string" ||
      !Number.isFinite(shadow.offsetX) ||
      !Number.isFinite(shadow.offsetY) ||
      !Number.isFinite(shadow.blur) ||
      shadow.blur < 0 ||
      !isStudioTextOpacity(shadow.opacity)
    ) {
      diagnostics.push(
        diagnostic("shadow-value", "Text shadow has an invalid value."),
      );
    }
  }

  if (appearance.presetRef) {
    if (
      (appearance.presetRef.source !== "builtin" &&
        appearance.presetRef.source !== "custom") ||
      typeof appearance.presetRef.presetId !== "string" ||
      appearance.presetRef.presetId.trim() === "" ||
      !Number.isInteger(appearance.presetRef.presetVersion) ||
      appearance.presetRef.presetVersion < 1
    ) {
      diagnostics.push(
        diagnostic("preset-ref", "Text preset reference is invalid."),
      );
    }
  }

  return diagnostics;
};

/**
 * `legacy scalar text appearance`를 구조화 appearance로 materialize한다.
 *
 * 이 함수는 style에서 stroke/shadow 선언을 제거한 결과까지 함께 반환한다. 해석하지 못한
 * 지원하지 않는 `legacy scalar text appearance` shadow는 삭제하지 않고 실패시켜 저장자가
 * 조용히 효과를 잃지 않게 한다.
 */
export const materializeStudioTextAppearance = (
  node: Pick<StudioGraphNode, "textAppearance">,
  style: StudioStyleRecord | undefined,
): StudioTextAppearanceMaterializeResult => {
  const legacyShadowExists = hasLegacyStudioTextShadow(style);
  const legacyShadow = parseLegacyStudioTextShadow(style);
  if (legacyShadowExists && !legacyShadow) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          "legacy-shadow-unsupported",
          "This legacy text shadow cannot be converted without losing its value.",
        ),
      ],
    };
  }

  const resolved = resolveStudioTextAppearance(node, style);
  const appearance = node.textAppearance
    ? cloneStudioTextAppearance(node.textAppearance)
    : {
        fill: {
          type: "solid" as const,
          color:
            getStudioTextFillPrimaryColor(resolved.fill) ??
            STUDIO_TEXT_DEFAULT_FILL_COLOR,
          opacity: resolved.fill.opacity,
        },
        strokes: clone(resolved.strokes),
      };

  if (legacyShadow && !appearance.shadow) {
    const shadow = materializeLegacyShadowColor(
      legacyShadow,
      node.textAppearance
        ? getStudioTextFillPrimaryColor(node.textAppearance.fill)
        : getStudioTextFillPrimaryColor(resolved.fill),
    );
    if (!shadow) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            "legacy-shadow-current-color-unsupported",
            "This colorless legacy text shadow needs a concrete fill color before it can be converted.",
          ),
        ],
      };
    }
    appearance.shadow = shadow;
  }

  const diagnostics = validateStudioTextAppearance(appearance);
  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const nextStyle = removeLegacyStudioTextAppearanceScalars({
    ...(style ?? {}),
  });

  return { ok: true, appearance, style: nextStyle, diagnostics: [] };
};

export const createDefaultStudioTextShadow = (): StudioTextShadow => ({
  enabled: true,
  color: "#111827",
  offsetX: 0,
  offsetY: 4,
  blur: 8,
  opacity: 0.35,
});

export const createDefaultStudioTextStroke = (
  id: string,
  outset = STUDIO_TEXT_DEFAULT_STROKE_THICKNESS,
): StudioTextStroke => ({
  id,
  enabled: true,
  color: "#111827",
  outset,
  opacity: 1,
});
