import {
  runImportV2TemplateFromFigmaV2,
  type ImportV2FigmaAnalyzeResult,
} from "../../../scripts/import-v2-template-from-figma-v2";
import type { V2TemplateRenderConfig } from "@/types/time-table/template-render-config";

export type V2AdminFigmaLayoutMode = "grid3x3" | "flex4x2" | "free";
export type V2AdminFigmaStatusSourceMode = "none" | "shared" | "byDay";

export type V2AdminFigmaAssetImportSummary = {
  discovered: number;
  mapped: number;
  uploaded: number;
  applied: number;
  warnings: string[];
  unresolved: string[];
};

export type V2AdminFigmaDetectedFeatures = {
  artist: {
    enabled: boolean;
    on: boolean;
    off: boolean;
    object: boolean;
    text: boolean;
    profile: boolean;
  };
  memo: {
    enabled: boolean;
    on: boolean;
    off: boolean;
    object: boolean;
    text: boolean;
  };
};

export type V2AdminFigmaAnalyzeInput = {
  rootFigmaUrl: string;
  cardComponentSetUrl?: string;
  templateName?: string;
};

export type V2AdminFigmaImportInput = {
  rootFigmaUrl: string;
  cardComponentSetUrl?: string;
  templateName?: string;
  templateDescription?: string;
  layoutModeOverride?: V2AdminFigmaLayoutMode | "auto";
  withAssets?: boolean;
};

export type V2AdminFigmaImportConfigInput = {
  templateId: string;
  rootFigmaUrl: string;
  cardComponentSetUrl?: string;
  layoutModeOverride?: V2AdminFigmaLayoutMode | "auto";
  withAssets?: boolean;
};

const v2_isLayoutMode = (value: unknown): value is V2AdminFigmaLayoutMode => {
  return value === "grid3x3" || value === "flex4x2" || value === "free";
};

const v2_extractDetectedStatuses = (analysis: ImportV2FigmaAnalyzeResult) => {
  return (["online", "offline", "multi", "offlineMemo"] as const).filter(
    (status) => analysis.validation.statusCounts[status] > 0
  );
};

const v2_createEmptyDetectedFeatures = (): V2AdminFigmaDetectedFeatures => ({
  artist: {
    enabled: false,
    on: false,
    off: false,
    object: false,
    text: false,
    profile: false,
  },
  memo: {
    enabled: false,
    on: false,
    off: false,
    object: false,
    text: false,
  },
});

const v2_buildLayoutOverridePostProcessor = (
  layoutModeOverride?: V2AdminFigmaLayoutMode | "auto"
) => {
  if (!v2_isLayoutMode(layoutModeOverride)) return undefined;
  return (config: V2TemplateRenderConfig): V2TemplateRenderConfig => ({
    ...config,
    timetable: {
      ...config.timetable,
      layoutMode: layoutModeOverride,
    },
  });
};

export const v2_runAdminFigmaAnalyze = async (
  input: V2AdminFigmaAnalyzeInput
) => {
  const result = await runImportV2TemplateFromFigmaV2({
    rootFigmaUrl: input.rootFigmaUrl,
    cardComponentSetUrl: input.cardComponentSetUrl,
    templateName: input.templateName,
    templateDescription: undefined,
    templateId: undefined,
    write: false,
    validateOnly: false,
    public: false,
    configPreset: "default",
    source: "system",
    createdBy: undefined,
    supabaseUrl: undefined,
    supabaseServiceRoleKey: undefined,
    figmaToken: undefined,
    withAssets: false,
    assetTheme: "first",
    assetFormat: "png",
    aiMode: "off",
  });

  const normalizedConfig = result.importResult?.normalizedConfig;
  const layoutModeCandidate = v2_isLayoutMode(normalizedConfig?.timetable?.layoutMode)
    ? normalizedConfig.timetable.layoutMode
    : "grid3x3";

  return {
    mode: result.validation.mode,
    canImport: result.validation.critical.length === 0,
    detectedStatuses: v2_extractDetectedStatuses(result),
    statusCounts: result.validation.statusCounts,
    statusSourceModeByStatus: result.statusSourceModeByStatus,
    warnings: result.validation.warnings,
    critical: result.validation.critical,
    templateNameSuggestion:
      result.importResult?.templateName ?? input.templateName ?? "새 템플릿",
    layoutModeCandidate,
    detectedFeatures:
      (result.importResult?.detectedFeatures as V2AdminFigmaDetectedFeatures | undefined) ??
      v2_createEmptyDetectedFeatures(),
    cardComponentSetSource: result.cardComponentSetSource,
    resolvedCardComponentSetUrl: result.resolvedCardComponentSetUrl,
  };
};

export const v2_runAdminFigmaImport = async (
  input: V2AdminFigmaImportInput
) => {
  const result = await runImportV2TemplateFromFigmaV2({
    rootFigmaUrl: input.rootFigmaUrl,
    cardComponentSetUrl: input.cardComponentSetUrl,
    templateName: input.templateName,
    templateDescription: input.templateDescription,
    templateId: undefined,
    write: true,
    validateOnly: false,
    public: false,
    configPreset: "default",
    source: "system",
    createdBy: undefined,
    supabaseUrl: undefined,
    supabaseServiceRoleKey: undefined,
    figmaToken: undefined,
    withAssets: input.withAssets !== false,
    assetTheme: "first",
    assetFormat: "png",
    aiMode: "off",
    postProcessNormalizedConfig: v2_buildLayoutOverridePostProcessor(
      input.layoutModeOverride
    ),
  });

  if (!result.importResult) {
    throw new Error("Figma import result is empty.");
  }

  return {
    templateId: result.importResult.templateId,
    templateName: result.importResult.templateName,
    latestRevisionNo: result.importResult.latestRevisionNo,
    layoutMode: result.importResult.normalizedConfig.timetable.layoutMode,
    mode: result.validation.mode,
    detectedStatuses: v2_extractDetectedStatuses(result),
    detectedFeatures:
      (result.importResult.detectedFeatures as V2AdminFigmaDetectedFeatures | undefined) ??
      v2_createEmptyDetectedFeatures(),
    statusSourceModeByStatus: result.statusSourceModeByStatus,
    cardComponentSetSource: result.cardComponentSetSource,
    resolvedCardComponentSetUrl: result.resolvedCardComponentSetUrl,
  };
};

export const v2_runAdminFigmaImportConfig = async (
  input: V2AdminFigmaImportConfigInput
) => {
  const result = await runImportV2TemplateFromFigmaV2({
    rootFigmaUrl: input.rootFigmaUrl,
    cardComponentSetUrl: input.cardComponentSetUrl,
    templateName: undefined,
    templateDescription: undefined,
    templateId: input.templateId,
    write: false,
    validateOnly: false,
    public: false,
    configPreset: "default",
    source: "system",
    createdBy: undefined,
    supabaseUrl: undefined,
    supabaseServiceRoleKey: undefined,
    figmaToken: undefined,
    withAssets: input.withAssets === true,
    uploadAssetsWithoutWrite: input.withAssets === true,
    assetTheme: "first",
    assetFormat: "png",
    aiMode: "off",
    postProcessNormalizedConfig: v2_buildLayoutOverridePostProcessor(
      input.layoutModeOverride
    ),
  });

  if (!result.importResult) {
    throw new Error("Figma import result is empty.");
  }

  return {
    templateId: input.templateId,
    renderConfig: result.importResult.normalizedConfig,
    layoutMode: result.importResult.normalizedConfig.timetable.layoutMode,
    mode: result.validation.mode,
    detectedStatuses: v2_extractDetectedStatuses(result),
    detectedFeatures:
      (result.importResult.detectedFeatures as V2AdminFigmaDetectedFeatures | undefined) ??
      v2_createEmptyDetectedFeatures(),
    statusSourceModeByStatus: result.statusSourceModeByStatus,
    cardComponentSetSource: result.cardComponentSetSource,
    resolvedCardComponentSetUrl: result.resolvedCardComponentSetUrl,
    warnings: result.validation.warnings,
    critical: result.validation.critical,
    assetImportSummary: result.importResult.assetImportSummary as
      | V2AdminFigmaAssetImportSummary
      | null,
  };
};
