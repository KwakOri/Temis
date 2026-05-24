"use client";

import type {
  V2TemplateAssetDimension,
  V2TemplateBuiltinAssetKey,
  V2TemplateDayKey,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_TEMPLATE_DAY_KEYS } from "@/types/time-table/template-render-config";
import type { V2TemplateAssetUploadRecord } from "@/services/admin/v2_template_asset_service";

const v2_CARD_COMMON_ASSET_DAY_KEYS: Partial<
  Record<V2TemplateBuiltinAssetKey, Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>>
> = {
  onlineByTheme: {
    mon: "online_mon",
    tue: "online_tue",
    wed: "online_wed",
    thu: "online_thu",
    fri: "online_fri",
    sat: "online_sat",
    sun: "online_sun",
  },
  offlineByTheme: {
    mon: "offline_mon",
    tue: "offline_tue",
    wed: "offline_wed",
    thu: "offline_thu",
    fri: "offline_fri",
    sat: "offline_sat",
    sun: "offline_sun",
  },
  multiByTheme: {
    mon: "multi_mon",
    tue: "multi_tue",
    wed: "multi_wed",
    thu: "multi_thu",
    fri: "multi_fri",
    sat: "multi_sat",
    sun: "multi_sun",
  },
  offlineMemoByTheme: {
    mon: "offlineMemo_mon",
    tue: "offlineMemo_tue",
    wed: "offlineMemo_wed",
    thu: "offlineMemo_thu",
    fri: "offlineMemo_fri",
    sat: "offlineMemo_sat",
    sun: "offlineMemo_sun",
  },
};

const v2_isBuiltinAssetKey = (
  config: V2TemplateRenderConfig,
  key: string
): key is V2TemplateBuiltinAssetKey =>
  Object.prototype.hasOwnProperty.call(config.assets, key);

export const v2_readImageFileDimensions = (
  file: File
): Promise<V2TemplateAssetDimension> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 크기 확인에 실패했습니다."));
    };
    img.src = objectUrl;
  });
};

export const v2_applyUploadedAssetRecordsToRenderConfig = ({
  renderConfig,
  uploadedRecords,
  dimensionsByClientId,
}: {
  renderConfig: V2TemplateRenderConfig;
  uploadedRecords: V2TemplateAssetUploadRecord[];
  dimensionsByClientId: ReadonlyMap<string, V2TemplateAssetDimension | null>;
}): V2TemplateRenderConfig => {
  if (uploadedRecords.length === 0) return renderConfig;

  let hasChanges = false;
  const nextAssets: V2TemplateRenderConfig["assets"] = {
    ...renderConfig.assets,
  };
  const nextAssetDimensions: V2TemplateRenderConfig["assetDimensions"] = {
    ...renderConfig.assetDimensions,
  };
  const nextExtraAssets: V2TemplateRenderConfig["extraAssets"] = {
    ...renderConfig.extraAssets,
  };
  const nextExtraAssetDimensions: V2TemplateRenderConfig["extraAssetDimensions"] = {
    ...renderConfig.extraAssetDimensions,
  };

  const assignBuiltinAsset = ({
    key,
    theme,
    url,
    dimension,
  }: {
    key: V2TemplateBuiltinAssetKey;
    theme: string;
    url: string;
    dimension: V2TemplateAssetDimension | null;
  }) => {
    const prevThemeMap = nextAssets[key];
    const prevDimensionMap = nextAssetDimensions[key];
    const prevUrl = prevThemeMap[theme] ?? null;
    const prevDimension = prevDimensionMap[theme] ?? null;
    const dimensionChanged =
      (prevDimension?.width ?? null) !== (dimension?.width ?? null) ||
      (prevDimension?.height ?? null) !== (dimension?.height ?? null);

    if (prevUrl === url && !dimensionChanged) return;

    nextAssets[key] = {
      ...prevThemeMap,
      [theme]: url,
    };
    nextAssetDimensions[key] = {
      ...prevDimensionMap,
      [theme]: dimension,
    };
    hasChanges = true;
  };

  uploadedRecords.forEach((uploaded) => {
    const clientId =
      typeof uploaded.clientId === "string" ? uploaded.clientId : "";
    const targetType = uploaded.targetType;
    const targetKey =
      typeof uploaded.targetKey === "string" ? uploaded.targetKey.trim() : "";
    const url = typeof uploaded.url === "string" ? uploaded.url.trim() : "";
    const theme = typeof uploaded.theme === "string" ? uploaded.theme.trim() : "";
    if (
      !clientId ||
      !targetKey ||
      !url ||
      !theme ||
      (targetType !== "builtin" && targetType !== "extra")
    ) {
      return;
    }

    const nextDimension = dimensionsByClientId.get(clientId) ?? null;

    if (targetType === "builtin" && v2_isBuiltinAssetKey(renderConfig, targetKey)) {
      assignBuiltinAsset({
        key: targetKey,
        theme,
        url,
        dimension: nextDimension,
      });

      const dayKeys = v2_CARD_COMMON_ASSET_DAY_KEYS[targetKey];
      if (dayKeys) {
        v2_TEMPLATE_DAY_KEYS.forEach((dayKey) => {
          assignBuiltinAsset({
            key: dayKeys[dayKey],
            theme,
            url,
            dimension: nextDimension,
          });
        });
      }
      return;
    }

    const prevThemeMap = nextExtraAssets[targetKey] ?? {};
    const prevDimensionMap = nextExtraAssetDimensions[targetKey] ?? {};
    const prevUrl = prevThemeMap[theme] ?? null;
    const prevDimension = prevDimensionMap[theme] ?? null;
    const dimensionChanged =
      (prevDimension?.width ?? null) !== (nextDimension?.width ?? null) ||
      (prevDimension?.height ?? null) !== (nextDimension?.height ?? null);

    if (prevUrl === url && !dimensionChanged) return;

    nextExtraAssets[targetKey] = {
      ...prevThemeMap,
      [theme]: url,
    };
    nextExtraAssetDimensions[targetKey] = {
      ...prevDimensionMap,
      [theme]: nextDimension,
    };
    hasChanges = true;
  });

  if (!hasChanges) return renderConfig;

  return {
    ...renderConfig,
    assets: nextAssets,
    assetDimensions: nextAssetDimensions,
    extraAssets: nextExtraAssets,
    extraAssetDimensions: nextExtraAssetDimensions,
  };
};
