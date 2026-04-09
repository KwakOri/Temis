"use client";

import { V2TemplateRenderConfig } from "@/types/time-table/template-render-config";
import { v2_createDefaultTemplateRenderConfig } from "@/utils/time-table/template-render-config";

export interface V2TemplatePresetDefinition {
  id: string;
  label: string;
  description: string;
  createConfig: () => V2TemplateRenderConfig;
}

export const v2_TEMPLATE_PRESET_DEFINITIONS: V2TemplatePresetDefinition[] = [
  {
    id: "default_boilerplate",
    label: "기본 보일러플레이트",
    description: "현재 v2 기본 템플릿 구조/스타일/스키마를 적용합니다.",
    createConfig: () => v2_createDefaultTemplateRenderConfig(),
  },
];

export const v2_applyTemplatePreset = ({
  current,
  preset,
}: {
  current: V2TemplateRenderConfig;
  preset: V2TemplateRenderConfig;
}): V2TemplateRenderConfig => {
  return {
    ...current,
    metadata: {
      ...current.metadata,
      name: preset.metadata.name,
      description: preset.metadata.description,
    },
    templateSize: preset.templateSize,
    weekdayOption: preset.weekdayOption,
    monthOption: preset.monthOption,
    themes: [...preset.themes],
    defaultTheme: preset.defaultTheme,
    buttonThemes: [...preset.buttonThemes],
    fonts: preset.fonts,
    baseFonts: preset.baseFonts,
    baseColors: preset.baseColors,
    componentColors: preset.componentColors,
    componentFonts: preset.componentFonts,
    maxFontSizes: preset.maxFontSizes,
    cardSizes: preset.cardSizes,
    editorOptions: preset.editorOptions,
    profileTextPlaceholder: preset.profileTextPlaceholder,
    formSchema: preset.formSchema,
    layout: preset.layout,
    structure: preset.structure,
    graph: preset.graph,
    // 에셋 URL은 작업 중 손실이 크므로 현재값을 보존한다.
    assets: current.assets,
    assetDimensions: current.assetDimensions,
  };
};
