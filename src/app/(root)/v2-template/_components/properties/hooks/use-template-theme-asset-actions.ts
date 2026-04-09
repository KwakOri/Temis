"use client";

import {
  V2TemplateAssetDimension,
  V2TemplateAssetMap,
  V2TemplateColorKey,
  V2TemplateFontFaceSource,
  V2TemplateFontRegistryItem,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";

interface UseTemplateThemeAssetActionsParams {
  renderConfig: V2TemplateRenderConfig;
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
}

const useTemplateThemeAssetActions = ({
  renderConfig,
  safeUpdateConfig,
}: UseTemplateThemeAssetActionsParams) => {
  const parseFontWeightInput = (rawValue: string): number | string => {
    const trimmed = rawValue.trim();
    if (!trimmed) return "";
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }
    return trimmed;
  };

  const addFontRegistryItem = () => {
    safeUpdateConfig((prev) => {
      let nextIndex = 1;
      let nextKey = `font${nextIndex}`;
      while (prev.fonts.registry[nextKey]) {
        nextIndex += 1;
        nextKey = `font${nextIndex}`;
      }

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [nextKey]: {
              family: nextKey,
              display: "swap",
              faces: [
                {
                  weight: 400,
                  style: "normal",
                  src: "",
                  format: "woff2",
                },
              ],
            } satisfies V2TemplateFontRegistryItem,
          },
        },
      };
    });
  };

  const removeFontRegistryItem = (registryKey: string) => {
    safeUpdateConfig((prev) => {
      if (!prev.fonts.registry[registryKey]) return prev;

      const usedByBase = (
        Object.keys(prev.baseFonts) as Array<keyof typeof prev.baseFonts>
      ).some((tokenKey) => prev.baseFonts[tokenKey] === registryKey);
      const usedByComponent = (
        Object.keys(prev.componentFonts) as Array<keyof typeof prev.componentFonts>
      ).some((componentKey) => prev.componentFonts[componentKey] === registryKey);

      if (usedByBase || usedByComponent) {
        window.alert(
          "사용 중인 폰트입니다. base/component 폰트 토큰 연결을 먼저 변경해 주세요."
        );
        return prev;
      }

      const nextRegistry = { ...prev.fonts.registry };
      delete nextRegistry[registryKey];

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: nextRegistry,
        },
      };
    });
  };

  const updateBaseFontToken = (
    tokenKey: keyof V2TemplateRenderConfig["baseFonts"],
    value: string
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      baseFonts: {
        ...prev.baseFonts,
        [tokenKey]: value,
      },
    }));
  };

  const updateFontRegistryMeta = (
    registryKey: string,
    patch: Partial<Pick<V2TemplateFontRegistryItem, "family" | "display">>
  ) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;

      const nextItem: V2TemplateFontRegistryItem = {
        ...currentItem,
        ...(patch.family !== undefined ? { family: patch.family } : {}),
        ...(patch.display !== undefined ? { display: patch.display } : {}),
      };

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: nextItem,
          },
        },
      };
    });
  };

  const addFontFace = (registryKey: string) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;
      const nextFaces = [
        ...currentItem.faces,
        {
          weight: 400,
          src: "",
          format: "woff2",
        } satisfies V2TemplateFontFaceSource,
      ];

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: {
              ...currentItem,
              faces: nextFaces,
            },
          },
        },
      };
    });
  };

  const updateFontFace = (
    registryKey: string,
    faceIndex: number,
    patch: Partial<V2TemplateFontFaceSource>
  ) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;

      const nextFaces = [...currentItem.faces];
      if (!nextFaces[faceIndex]) return prev;
      nextFaces[faceIndex] = {
        ...nextFaces[faceIndex],
        ...patch,
      };

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: {
              ...currentItem,
              faces: nextFaces,
            },
          },
        },
      };
    });
  };

  const removeFontFace = (registryKey: string, faceIndex: number) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;
      if (currentItem.faces.length <= 1) return prev;

      const nextFaces = currentItem.faces.filter((_, index) => index !== faceIndex);

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: {
              ...currentItem,
              faces: nextFaces,
            },
          },
        },
      };
    });
  };

  const updateColor = (key: V2TemplateColorKey, value: string) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      componentColors: {
        ...prev.componentColors,
        [key]: value,
      },
    }));
  };

  const updateComponentFont = (key: V2TemplateColorKey, value: string) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      componentFonts: {
        ...prev.componentFonts,
        [key]: value,
      },
    }));
  };

  const updateMaxFontSize = (
    key: "MAIN_TITLE" | "SUB_TITLE" | "ARTIST",
    value: number
  ) => {
    if (!Number.isFinite(value) || value <= 0) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      maxFontSizes: {
        ...prev.maxFontSizes,
        [key]: Math.round(value),
      },
    }));
  };

  const updateAssetUrl = (
    key: keyof V2TemplateAssetMap,
    theme: string,
    value: string,
    dimension: V2TemplateAssetDimension | null = null
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [key]: {
          ...prev.assets[key],
          [theme]: value.trim() === "" ? null : value,
        },
      },
      assetDimensions: {
        ...prev.assetDimensions,
        [key]: {
          ...prev.assetDimensions[key],
          [theme]: value.trim() === "" ? null : dimension,
        },
      },
    }));
  };

  const readImageFileAsDataUrl = (
    file: File
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error("파일을 읽지 못했습니다."));
      };

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("이미지 데이터 변환에 실패했습니다."));
          return;
        }

        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: result,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.onerror = () => {
          reject(new Error("이미지 크기 확인에 실패했습니다."));
        };
        img.src = result;
      };

      reader.readAsDataURL(file);
    });
  };

  const handleAssetFileUpload = async (
    key: keyof V2TemplateAssetMap,
    theme: string,
    file: File | null
  ) => {
    if (!file) return;

    try {
      const result = await readImageFileAsDataUrl(file);
      updateAssetUrl(key, theme, result.dataUrl, {
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      console.error("Failed to upload asset image", error);
    }
  };

  return {
    parseFontWeightInput,
    addFontRegistryItem,
    removeFontRegistryItem,
    updateBaseFontToken,
    updateFontRegistryMeta,
    addFontFace,
    updateFontFace,
    removeFontFace,
    updateColor,
    updateComponentFont,
    updateMaxFontSize,
    updateAssetUrl,
    readImageFileAsDataUrl,
    handleAssetFileUpload,
  };
};

export default useTemplateThemeAssetActions;
