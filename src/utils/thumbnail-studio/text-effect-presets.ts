import type {
  StudioStyleRecord,
  StudioTextAppearance,
} from "@/types/template-studio";
import { STUDIO_TEXT_WRAP_MODE_STYLE_KEY } from "@/utils/template-studio/text-wrap";

export interface StudioTextEffectPreset {
  id: string;
  source: "builtin" | "custom";
  version: number;
  label: string;
  previewText: string;
  typography: Partial<StudioStyleRecord>;
  appearance: StudioTextAppearance;
}

export const STUDIO_TEXT_PRESET_TYPOGRAPHY_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "justifyContent",
  "whiteSpace",
  "wordBreak",
  "textDecoration",
  "textTransform",
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
] as const;

const createAppearance = (
  fill: string,
  strokes: StudioTextAppearance["strokes"],
  shadow?: StudioTextAppearance["shadow"],
): StudioTextAppearance => ({
  fill: { type: "solid", color: fill, opacity: 1 },
  strokes,
  ...(shadow ? { shadow } : {}),
});

/** Phase 3의 코드 내장 텍스트 preset registry. 원격 저장은 Phase 6 범위다. */
export const STUDIO_TEXT_EFFECT_PRESETS: readonly StudioTextEffectPreset[] =
  Object.freeze([
    {
      id: "clean-white",
      source: "builtin",
      version: 1,
      label: "Clean White",
      previewText: "Aa",
      typography: {
        fontSize: 72,
        fontWeight: 800,
        lineHeight: 1,
        textAlign: "center",
      },
      appearance: createAppearance("#ffffff", [
        {
          id: "builtin-stroke",
          enabled: true,
          color: "#111827",
          outset: 6,
          opacity: 1,
        },
      ]),
    },
    {
      id: "sunset-outline",
      source: "builtin",
      version: 2,
      label: "Sunset Outline",
      previewText: "SUNSET",
      typography: {
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 1,
        textAlign: "center",
      },
      appearance: createAppearance("#fef3c7", [
        {
          id: "builtin-outer",
          enabled: true,
          color: "#7c2d12",
          outset: 10,
          opacity: 1,
        },
        {
          id: "builtin-inner",
          enabled: true,
          color: "#fb923c",
          outset: 4,
          opacity: 1,
        },
      ]),
    },
    {
      id: "soft-shadow",
      source: "builtin",
      version: 1,
      label: "Soft Shadow",
      previewText: "Soft",
      typography: {
        fontSize: 68,
        fontWeight: 700,
        lineHeight: 1.05,
        textAlign: "center",
      },
      appearance: createAppearance("#1d4ed8", [], {
        enabled: true,
        color: "#0f172a",
        offsetX: 4,
        offsetY: 6,
        blur: 10,
        opacity: 0.45,
      }),
    },
  ]);

export const getStudioBuiltinTextEffectPreset = (
  presetId: string,
): StudioTextEffectPreset | undefined =>
  STUDIO_TEXT_EFFECT_PRESETS.find((preset) => preset.id === presetId);

export const isStudioBuiltinTextEffectPresetVersionValid = (
  preset: Pick<StudioTextEffectPreset, "source" | "version">,
): boolean =>
  preset.source === "builtin" &&
  Number.isInteger(preset.version) &&
  preset.version >= 1;

export const pickStudioTextPresetTypography = (
  typography: Partial<StudioStyleRecord>,
): StudioStyleRecord =>
  Object.fromEntries(
    STUDIO_TEXT_PRESET_TYPOGRAPHY_KEYS.flatMap((key) =>
      typography[key] === undefined ? [] : [[key, typography[key]]],
    ),
  );

export const cloneStudioTextEffectPreset = (
  preset: StudioTextEffectPreset,
): StudioTextEffectPreset =>
  JSON.parse(JSON.stringify(preset)) as StudioTextEffectPreset;
