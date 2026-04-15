"use client";

import {
  V2TemplateAssetDimension,
  V2TemplateAssetRef,
  V2TemplateBuiltinAssetKey,
  V2TemplateColorKey,
  V2TemplateDayKey,
  V2TemplateFontFaceSource,
  V2TemplateFontRegistryItem,
  V2TemplateRenderConfig,
  v2_TEMPLATE_DAY_KEYS,
} from "@/types/time-table/template-render-config";

interface UseTemplateThemeAssetActionsParams {
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
}

const v2_isFontDisplay = (
  value: string
): value is NonNullable<V2TemplateFontRegistryItem["display"]> => {
  return (
    value === "auto" ||
    value === "block" ||
    value === "swap" ||
    value === "fallback" ||
    value === "optional"
  );
};

const v2_isFontStyle = (
  value: string
): value is NonNullable<V2TemplateFontFaceSource["style"]> => {
  return value === "normal" || value === "italic" || value === "oblique";
};

const v2_isFontFormat = (
  value: string
): value is NonNullable<V2TemplateFontFaceSource["format"]> => {
  return (
    value === "woff2" ||
    value === "woff" ||
    value === "truetype" ||
    value === "opentype"
  );
};

const v2_normalizeFontFormat = (
  value: string
): V2TemplateFontFaceSource["format"] | undefined => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "ttf") return "truetype";
  if (normalized === "otf") return "opentype";
  return v2_isFontFormat(normalized)
    ? normalized
    : undefined;
};

const v2_unquote = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const v2_parseFontWeightInput = (rawValue: string): number | string => {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "normal") return 400;
  if (lower === "bold") return 700;
  return trimmed;
};

const v2_parseFontFaceCssSnippet = (
  cssText: string
): {
  family?: string;
  display?: V2TemplateFontRegistryItem["display"];
  faces: V2TemplateFontFaceSource[];
} | null => {
  const source = cssText.trim();
  if (!source) return null;

  const blockMatches = Array.from(
    source.matchAll(/@font-face\s*{([\s\S]*?)}/gi)
  ).map((match) => match[1] ?? "");

  const blocks =
    blockMatches.length > 0 ? blockMatches : [source];

  const parsedFaces: V2TemplateFontFaceSource[] = [];
  let parsedFamily: string | undefined;
  let parsedDisplay: V2TemplateFontRegistryItem["display"] | undefined;

  blocks.forEach((block) => {
    const declarations = Array.from(
      block.matchAll(/([a-zA-Z-]+)\s*:\s*([^;]+);?/g)
    );
    if (declarations.length === 0) return;

    let family: string | undefined;
    let src = "";
    let format: V2TemplateFontFaceSource["format"] | undefined;
    let style: V2TemplateFontFaceSource["style"] = "normal";
    let weight: V2TemplateFontFaceSource["weight"] = 400;
    let unicodeRange: string | undefined;
    let display: V2TemplateFontRegistryItem["display"] | undefined;

    declarations.forEach(([, rawPropertyName = "", rawPropertyValue = ""]) => {
      const propertyName = rawPropertyName.trim().toLowerCase();
      const propertyValue = rawPropertyValue.trim();

      if (propertyName === "font-family") {
        family = v2_unquote(propertyValue);
        return;
      }

      if (propertyName === "src") {
        const urlMatch = propertyValue.match(/url\((['"]?)(.*?)\1\)/i);
        if (urlMatch?.[2]) {
          src = urlMatch[2].trim();
        }
        const formatMatch = propertyValue.match(/format\((['"]?)(.*?)\1\)/i);
        if (formatMatch?.[2]) {
          format = v2_normalizeFontFormat(formatMatch[2]);
        }
        if (!format && src) {
          const extensionMatch = src
            .toLowerCase()
            .match(/\.([a-z0-9]+)(?:\?|#|$)/);
          const ext = extensionMatch?.[1];
          if (ext === "woff2") format = "woff2";
          if (ext === "woff") format = "woff";
          if (ext === "ttf") format = "truetype";
          if (ext === "otf") format = "opentype";
        }
        return;
      }

      if (propertyName === "font-style") {
        const normalizedStyle = propertyValue.toLowerCase();
        if (v2_isFontStyle(normalizedStyle)) {
          style = normalizedStyle;
        }
        return;
      }

      if (propertyName === "font-weight") {
        weight = v2_parseFontWeightInput(propertyValue);
        return;
      }

      if (propertyName === "font-display") {
        const normalizedDisplay = propertyValue.toLowerCase();
        if (v2_isFontDisplay(normalizedDisplay)) {
          display = normalizedDisplay;
        }
        return;
      }

      if (propertyName === "unicode-range") {
        unicodeRange = propertyValue;
      }
    });

    if (!src) return;

    if (!parsedFamily && family) {
      parsedFamily = family;
    }
    if (!parsedDisplay && display) {
      parsedDisplay = display;
    }

    parsedFaces.push({
      weight,
      style,
      src,
      ...(format ? { format } : {}),
      ...(display ? { display } : {}),
      ...(unicodeRange ? { unicodeRange } : {}),
    });
  });

  if (parsedFaces.length === 0) return null;

  return {
    ...(parsedFamily ? { family: parsedFamily } : {}),
    ...(parsedDisplay ? { display: parsedDisplay } : {}),
    faces: parsedFaces,
  };
};

const v2_isReservedFontRegistryKey = (value: string): boolean => {
  return (
    value === "primary" ||
    value === "secondary" ||
    value === "tertiary" ||
    value === "quaternary"
  );
};

const v2_findRegistryKeyByFamily = (
  registry: V2TemplateRenderConfig["fonts"]["registry"],
  family: string,
  exceptKey?: string
): string | null => {
  const normalizedFamily = family.trim();
  if (!normalizedFamily) return null;
  for (const [key, item] of Object.entries(registry)) {
    if (exceptKey && key === exceptKey) continue;
    if ((item.family ?? "").trim() === normalizedFamily) {
      return key;
    }
  }
  return null;
};

const v2_applyRegistryKeyRenameToConfig = ({
  prev,
  fromKey,
  toKey,
}: {
  prev: V2TemplateRenderConfig;
  fromKey: string;
  toKey: string;
}): V2TemplateRenderConfig | null => {
  if (fromKey === toKey) return prev;
  if (!prev.fonts.registry[fromKey]) return null;
  if (prev.fonts.registry[toKey]) return null;

  const nextRegistry: typeof prev.fonts.registry = {};
  Object.entries(prev.fonts.registry).forEach(([key, value]) => {
    if (key === fromKey) {
      nextRegistry[toKey] = value;
      return;
    }
    nextRegistry[key] = value;
  });

  const nextBaseFonts = {
    ...prev.baseFonts,
  };
  (Object.keys(nextBaseFonts) as Array<keyof typeof nextBaseFonts>).forEach(
    (tokenKey) => {
      if (nextBaseFonts[tokenKey] === fromKey) {
        nextBaseFonts[tokenKey] = toKey;
      }
    }
  );

  const nextComponentFonts = {
    ...prev.componentFonts,
  };
  (Object.keys(nextComponentFonts) as Array<keyof typeof nextComponentFonts>).forEach(
    (componentKey) => {
      if (nextComponentFonts[componentKey] === fromKey) {
        nextComponentFonts[componentKey] = toKey;
      }
    }
  );

  return {
    ...prev,
    fonts: {
      ...prev.fonts,
      registry: nextRegistry,
    },
    baseFonts: nextBaseFonts,
    componentFonts: nextComponentFonts,
  };
};

const v2_CARD_BACKGROUND_VARIANTS = {
  online: {
    builtinAssetKey: "onlineByTheme" as const,
    layerTarget: "cardNode:online-background",
    dayAssetKeyByDay: {
      mon: "online_mon",
      tue: "online_tue",
      wed: "online_wed",
      thu: "online_thu",
      fri: "online_fri",
      sat: "online_sat",
      sun: "online_sun",
    } satisfies Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>,
  },
  offline: {
    builtinAssetKey: "offlineByTheme" as const,
    layerTarget: "cardNode:offline-background",
    dayAssetKeyByDay: {
      mon: "offline_mon",
      tue: "offline_tue",
      wed: "offline_wed",
      thu: "offline_thu",
      fri: "offline_fri",
      sat: "offline_sat",
      sun: "offline_sun",
    } satisfies Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>,
  },
};

type V2CardBackgroundVariantMode = keyof typeof v2_CARD_BACKGROUND_VARIANTS;

const v2_buildCardBackgroundDayAssetRefMap = (
  mode: V2CardBackgroundVariantMode
): Record<V2TemplateDayKey, V2TemplateAssetRef> => {
  const dayAssetKeyByDay = v2_CARD_BACKGROUND_VARIANTS[mode].dayAssetKeyByDay;
  return v2_TEMPLATE_DAY_KEYS.reduce<
    Record<V2TemplateDayKey, V2TemplateAssetRef>
  >((acc, dayKey) => {
    acc[dayKey] = {
      source: "builtin",
      key: dayAssetKeyByDay[dayKey],
    };
    return acc;
  }, {} as Record<V2TemplateDayKey, V2TemplateAssetRef>);
};

const v2_isSameAssetRef = (
  left: V2TemplateAssetRef | undefined,
  right: V2TemplateAssetRef | undefined
): boolean => {
  if (!left || !right) return left === right;
  return left.source === right.source && left.key === right.key;
};

const v2_isCardBackgroundNodeForVariant = (
  node: V2TemplateRenderConfig["graph"]["nodes"][string],
  mode: V2CardBackgroundVariantMode
): boolean => {
  if (node.type !== "image") return false;
  const variant = v2_CARD_BACKGROUND_VARIANTS[mode];
  if (
    node.highlightTarget === variant.layerTarget ||
    node.meta?.layerTarget === variant.layerTarget
  ) {
    return true;
  }
  const assetRef = node.meta?.assetRef;
  const expectedVisibility = mode === "online" ? "onlineOnly" : "offlineOnly";
  return (
    assetRef?.source === "builtin" &&
    assetRef.key === variant.builtinAssetKey &&
    node.visibilityMode === expectedVisibility
  );
};

const useTemplateThemeAssetActions = ({
  safeUpdateConfig,
}: UseTemplateThemeAssetActionsParams) => {
  const parseFontWeightInput = (rawValue: string): number | string =>
    v2_parseFontWeightInput(rawValue);

  const addFontRegistryItem = () => {
    safeUpdateConfig((prev) => {
      let nextIndex = 1;
      let nextKey = "NewFont";
      while (prev.fonts.registry[nextKey]) {
        nextIndex += 1;
        nextKey = `NewFont${nextIndex}`;
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

  const syncFontRegistryKeyWithFamily = (registryKey: string): string | null => {
    let resolvedNextKey: string | null = null;

    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;

      const family = (currentItem.family ?? "").trim();
      const nextRegistryKey = family;
      if (!nextRegistryKey) {
        window.alert("font-family를 먼저 입력해 주세요.");
        return prev;
      }
      if (v2_isReservedFontRegistryKey(nextRegistryKey)) {
        window.alert("base font token 이름(primary~quaternary)은 사용할 수 없습니다.");
        return prev;
      }
      if (nextRegistryKey === registryKey) {
        resolvedNextKey = nextRegistryKey;
        return prev;
      }
      if (prev.fonts.registry[nextRegistryKey]) {
        window.alert("동일한 font-family(키)가 이미 존재합니다.");
        return prev;
      }

      const renamed = v2_applyRegistryKeyRenameToConfig({
        prev,
        fromKey: registryKey,
        toKey: nextRegistryKey,
      });
      if (!renamed) return prev;
      resolvedNextKey = nextRegistryKey;
      return renamed;
    });

    return resolvedNextKey;
  };

  const applyFontFaceCssSnippet = (
    registryKey: string,
    cssText: string
  ): string | null => {
    const parsed = v2_parseFontFaceCssSnippet(cssText);
    if (!parsed) {
      window.alert("`@font-face` CSS를 해석하지 못했습니다. 형식을 확인해 주세요.");
      return null;
    }

    let resolvedNextKey: string | null = null;
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;

      const nextFamily = (parsed.family ?? currentItem.family ?? "").trim();
      const duplicateKeyByFamily = nextFamily
        ? v2_findRegistryKeyByFamily(prev.fonts.registry, nextFamily, registryKey)
        : null;
      if (duplicateKeyByFamily) {
        window.alert(
          `동일한 font-family(${nextFamily})가 이미 등록되어 있습니다.`
        );
        return prev;
      }

      const nextRegistryKey = nextFamily || registryKey;
      if (v2_isReservedFontRegistryKey(nextRegistryKey)) {
        window.alert("base font token 이름(primary~quaternary)은 사용할 수 없습니다.");
        return prev;
      }
      if (nextRegistryKey !== registryKey && prev.fonts.registry[nextRegistryKey]) {
        window.alert("동일한 font-family(키)가 이미 존재합니다.");
        return prev;
      }
      resolvedNextKey = nextRegistryKey;

      const nextConfig: V2TemplateRenderConfig = {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: {
              ...currentItem,
              ...(parsed.family ? { family: parsed.family.trim() } : {}),
              ...(parsed.display ? { display: parsed.display } : {}),
              faces: parsed.faces,
            },
          },
        },
      };

      if (nextRegistryKey === registryKey) {
        return nextConfig;
      }

      const renamed = v2_applyRegistryKeyRenameToConfig({
        prev: nextConfig,
        fromKey: registryKey,
        toKey: nextRegistryKey,
      });
      return renamed ?? nextConfig;
    });

    return resolvedNextKey;
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

      const nextFamily =
        patch.family !== undefined ? patch.family.trim() : currentItem.family;
      if (
        patch.family !== undefined &&
        nextFamily &&
        v2_findRegistryKeyByFamily(prev.fonts.registry, nextFamily, registryKey)
      ) {
        window.alert(`동일한 font-family(${nextFamily})가 이미 등록되어 있습니다.`);
        return prev;
      }

      const nextItem: V2TemplateFontRegistryItem = {
        ...currentItem,
        ...(patch.family !== undefined ? { family: nextFamily } : {}),
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
    key: V2TemplateBuiltinAssetKey,
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

  const updateExtraAssetUrl = (
    key: string,
    theme: string,
    value: string,
    dimension: V2TemplateAssetDimension | null = null
  ) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      extraAssets: {
        ...prev.extraAssets,
        [normalizedKey]: {
          ...(prev.extraAssets[normalizedKey] ?? {}),
          [theme]: value.trim() === "" ? null : value,
        },
      },
      extraAssetDimensions: {
        ...prev.extraAssetDimensions,
        [normalizedKey]: {
          ...(prev.extraAssetDimensions[normalizedKey] ?? {}),
          [theme]: value.trim() === "" ? null : dimension,
        },
      },
    }));
  };

  const addExtraAssetKey = (key: string, themes: string[]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;

    safeUpdateConfig((prev) => {
      if (normalizedKey in prev.assets) return prev;
      if (prev.extraAssets[normalizedKey]) return prev;

      const seededThemeMap: Record<string, string | null> = {};
      const seededDimensionThemeMap: Record<string, V2TemplateAssetDimension | null> = {};

      themes.forEach((theme) => {
        const normalizedTheme = theme.trim();
        if (!normalizedTheme) return;
        seededThemeMap[normalizedTheme] = null;
        seededDimensionThemeMap[normalizedTheme] = null;
      });

      if (Object.keys(seededThemeMap).length === 0) {
        seededThemeMap.first = null;
        seededDimensionThemeMap.first = null;
      }

      return {
        ...prev,
        extraAssets: {
          ...prev.extraAssets,
          [normalizedKey]: seededThemeMap,
        },
        extraAssetDimensions: {
          ...prev.extraAssetDimensions,
          [normalizedKey]: seededDimensionThemeMap,
        },
      };
    });
  };

  const removeExtraAssetKey = (key: string) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;

    safeUpdateConfig((prev) => {
      if (!prev.extraAssets[normalizedKey]) return prev;

      const nextExtraAssets = { ...prev.extraAssets };
      const nextExtraAssetDimensions = { ...prev.extraAssetDimensions };
      delete nextExtraAssets[normalizedKey];
      delete nextExtraAssetDimensions[normalizedKey];

      let graphNodesChanged = false;
      const nextGraphNodes: typeof prev.graph.nodes = {};
      Object.entries(prev.graph.nodes).forEach(([nodeId, node]) => {
        const assetRef = node.meta?.assetRef;
        const isTargetExtraAssetRef =
          assetRef?.source === "extra" && assetRef.key === normalizedKey;
        const prevAssetRefByDayKey = node.meta?.assetRefByDayKey ?? {};
        const nextAssetRefByDayKey = Object.entries(prevAssetRefByDayKey).reduce<
          typeof prevAssetRefByDayKey
        >((acc, [dayKey, dayAssetRef]) => {
          if (
            dayAssetRef?.source === "extra" &&
            dayAssetRef.key === normalizedKey
          ) {
            return acc;
          }
          acc[dayKey as keyof typeof prevAssetRefByDayKey] = dayAssetRef;
          return acc;
        }, {});
        const hasDayRefRemoval =
          Object.keys(nextAssetRefByDayKey).length !==
          Object.keys(prevAssetRefByDayKey).length;

        if (!isTargetExtraAssetRef) {
          if (!hasDayRefRemoval) {
            nextGraphNodes[nodeId] = node;
            return;
          }
          const nextMeta = {
            ...(node.meta ?? {}),
            ...(Object.keys(nextAssetRefByDayKey).length > 0
              ? { assetRefByDayKey: nextAssetRefByDayKey }
              : { assetRefByDayKey: undefined }),
          };
          nextGraphNodes[nodeId] = {
            ...node,
            meta: nextMeta,
          };
          graphNodesChanged = true;
          return;
        }

        const nextMeta = {
          ...(node.meta ?? {}),
        };
        delete nextMeta.assetRef;
        if (Object.keys(nextAssetRefByDayKey).length > 0) {
          nextMeta.assetRefByDayKey = nextAssetRefByDayKey;
        } else {
          delete nextMeta.assetRefByDayKey;
        }
        nextGraphNodes[nodeId] = {
          ...node,
          meta: nextMeta,
        };
        graphNodesChanged = true;
      });

      return {
        ...prev,
        extraAssets: nextExtraAssets,
        extraAssetDimensions: nextExtraAssetDimensions,
        ...(graphNodesChanged
          ? {
              graph: {
                ...prev.graph,
                ...(graphNodesChanged ? { nodes: nextGraphNodes } : {}),
              },
            }
          : {}),
      };
    });
  };

  const toggleCardBackgroundAssetsByDay = (
    mode: V2CardBackgroundVariantMode,
    enabled: boolean
  ) => {
    safeUpdateConfig((prev) => {
      const expectedAssetRefByDayKey = enabled
        ? v2_buildCardBackgroundDayAssetRefMap(mode)
        : null;

      let graphNodesChanged = false;
      const nextGraphNodes = { ...prev.graph.nodes };
      Object.entries(prev.graph.nodes).forEach(([nodeId, node]) => {
        if (!v2_isCardBackgroundNodeForVariant(node, mode)) return;

        const nextMeta = {
          ...(node.meta ?? {}),
        };

        if (enabled && expectedAssetRefByDayKey) {
          const prevByDay = nextMeta.assetRefByDayKey ?? {};
          const isAlreadyApplied = v2_TEMPLATE_DAY_KEYS.every((dayKey) =>
            v2_isSameAssetRef(prevByDay[dayKey], expectedAssetRefByDayKey[dayKey])
          );
          if (isAlreadyApplied) {
            return;
          }
          nextMeta.assetRefByDayKey = expectedAssetRefByDayKey;
        } else {
          if (!nextMeta.assetRefByDayKey) {
            return;
          }
          delete nextMeta.assetRefByDayKey;
        }

        nextGraphNodes[nodeId] = {
          ...node,
          meta: nextMeta,
        };
        graphNodesChanged = true;
      });

      const editorOptionsChanged =
        mode === "online"
          ? Boolean(prev.editorOptions.useOnlineAssetsByDay) !== enabled
          : Boolean(prev.editorOptions.useOfflineAssetsByDay) !== enabled;

      if (!graphNodesChanged && !editorOptionsChanged) {
        return prev;
      }

      return {
        ...prev,
        editorOptions:
          mode === "online"
            ? {
                ...prev.editorOptions,
                useOnlineAssetsByDay: enabled,
              }
            : {
                ...prev.editorOptions,
                useOfflineAssetsByDay: enabled,
              },
        ...(graphNodesChanged
          ? {
              graph: {
                ...prev.graph,
                nodes: nextGraphNodes,
              },
            }
          : {}),
      };
    });
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
    key: V2TemplateBuiltinAssetKey,
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

  const handleExtraAssetFileUpload = async (
    key: string,
    theme: string,
    file: File | null
  ) => {
    if (!file) return;

    try {
      const result = await readImageFileAsDataUrl(file);
      updateExtraAssetUrl(key, theme, result.dataUrl, {
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      console.error("Failed to upload extra asset image", error);
    }
  };

  return {
    parseFontWeightInput,
    addFontRegistryItem,
    removeFontRegistryItem,
    syncFontRegistryKeyWithFamily,
    applyFontFaceCssSnippet,
    updateBaseFontToken,
    updateFontRegistryMeta,
    addFontFace,
    updateFontFace,
    removeFontFace,
    updateColor,
    updateComponentFont,
    updateMaxFontSize,
    updateAssetUrl,
    updateExtraAssetUrl,
    addExtraAssetKey,
    removeExtraAssetKey,
    toggleCardBackgroundAssetsByDay,
    readImageFileAsDataUrl,
    handleAssetFileUpload,
    handleExtraAssetFileUpload,
  };
};

export default useTemplateThemeAssetActions;
