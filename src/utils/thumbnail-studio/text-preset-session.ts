import type {
  StudioTextAppearance,
  StudioStyleRecord,
} from "@/types/template-studio";
import { cloneStudioTextAppearance } from "@/utils/template-studio/text-appearance-commands";
import {
  cloneStudioTextEffectPreset,
  pickStudioTextPresetTypography,
  type StudioTextEffectPreset,
} from "@/utils/thumbnail-studio/text-effect-presets";

export interface CreateStudioCustomTextPresetInput {
  id: string;
  label: string;
  previewText: string;
  typography: Partial<StudioStyleRecord>;
  appearance: StudioTextAppearance;
}

/** 문서 history와 분리된 편집기 세션 custom preset 생성. */
export const createStudioCustomTextPreset = ({
  id,
  label,
  previewText,
  typography,
  appearance,
}: CreateStudioCustomTextPresetInput): StudioTextEffectPreset => {
  const copiedAppearance = cloneStudioTextAppearance(appearance);
  delete copiedAppearance.presetRef;
  return {
    id,
    source: "custom",
    version: 1,
    label,
    previewText,
    typography: pickStudioTextPresetTypography(typography),
    appearance: copiedAppearance,
  };
};

/** 적용된 노드와 preset은 값을 복사하므로 이후 preset 변경이 전파되지 않는다. */
export const duplicateStudioCustomTextPreset = (
  preset: StudioTextEffectPreset,
  id: string,
): StudioTextEffectPreset => {
  const copy = cloneStudioTextEffectPreset(preset);
  copy.id = id;
  copy.source = "custom";
  copy.version = 1;
  copy.label = `${preset.label} Copy`;
  delete copy.appearance.presetRef;
  return copy;
};

/** 이름 변경은 내용 version을 올리지 않는다. */
export const renameStudioCustomTextPreset = (
  preset: StudioTextEffectPreset,
  label: string,
): StudioTextEffectPreset => ({
  ...cloneStudioTextEffectPreset(preset),
  label: label.trim() || preset.label,
});

export const deleteStudioCustomTextPreset = (
  presets: readonly StudioTextEffectPreset[],
  presetId: string,
): StudioTextEffectPreset[] =>
  presets.filter(
    (preset) => !(preset.source === "custom" && preset.id === presetId),
  );
