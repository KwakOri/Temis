"use client";

import { useCallback, useMemo, useState } from "react";

import {
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN,
  v2_HORIZONTAL_ALIGN_TO_JUSTIFY,
  v2_JUSTIFY_TO_HORIZONTAL_ALIGN,
  v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS,
} from "../model/alignment-utils";
import {
  V2BoilerplateGroupConfig,
  v2_STYLE_EXTENSION_DEFAULT_VALUES,
} from "../model/boilerplate-ui-utils";
import {
  v2_POSITION_MUTEX_MAP,
  v2_hasRenderableStyleValue,
} from "../model/layout-utils";
import { v2_isKnownStyleSectionKey } from "../model/style-section-utils";

type V2HorizontalAlign = "left" | "center" | "right";
type V2VerticalAlign = "top" | "center" | "bottom";

interface UseTemplateStyleEditorActionsParams {
  renderConfig: V2TemplateRenderConfig;
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
  sceneStyleSectionKeySet: Set<string>;
  structureSectionToTarget: Record<string, V2TemplateHighlightTarget>;
  setHoverHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  setActiveHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  styleSectionLabels: Record<string, string>;
  rootLayoutStyleSectionKeyMap: Partial<
    Record<string, keyof V2TemplateRenderConfig["layout"]>
  >;
  cardLayoutStyleSectionKeyMap: Partial<
    Record<
      string,
      Extract<keyof V2TemplateRenderConfig["layout"]["card"], string>
    >
  >;
  styleSectionHighlightTargetMap: Record<string, V2TemplateHighlightTarget>;
  stylePropertyCatalog: readonly string[];
  lockedStylePropertyKeys: Set<string>;
}

const useTemplateStyleEditorActions = ({
  renderConfig,
  safeUpdateConfig,
  sceneStyleSectionKeySet,
  structureSectionToTarget,
  setHoverHighlightTarget,
  setActiveHighlightTarget,
  styleSectionLabels,
  rootLayoutStyleSectionKeyMap,
  cardLayoutStyleSectionKeyMap,
  styleSectionHighlightTargetMap,
  stylePropertyCatalog,
  lockedStylePropertyKeys,
}: UseTemplateStyleEditorActionsParams) => {
  const [styleGroupExpanded, setStyleGroupExpanded] = useState<
    Record<string, boolean>
  >({});
  const sharedStyleSectionTargets = useMemo(() => {
    const next: Record<string, string[]> = {};
    Object.values(renderConfig.sharedStyleGroups ?? {}).forEach((group) => {
      const members = Array.from(
        new Set(
          Array.isArray(group.memberSectionKeys) ? group.memberSectionKeys : []
        )
      );
      if (members.length <= 1) return;
      members.forEach((sectionKey) => {
        next[sectionKey] = members;
      });
    });
    return next;
  }, [renderConfig.sharedStyleGroups]);

  const getStyleSectionMap = useCallback(
    (section: string): Record<string, string | number> => {
      const knownSection = v2_isKnownStyleSectionKey(section, styleSectionLabels)
        ? section
        : null;
      const rootLayoutKey = knownSection
        ? rootLayoutStyleSectionKeyMap[knownSection]
        : undefined;
      if (rootLayoutKey) {
        return (
          (renderConfig.layout[rootLayoutKey] as Record<string, string | number>) ??
          {}
        );
      }

      const cardLayoutKey = knownSection
        ? cardLayoutStyleSectionKeyMap[knownSection]
        : undefined;
      if (cardLayoutKey) {
        return (
          (renderConfig.layout.card[cardLayoutKey] as Record<
            string,
            string | number
          >) ?? {}
        );
      }

      const dynamicSectionSource = sceneStyleSectionKeySet.has(section)
        ? renderConfig.layout.scene[section]
        : renderConfig.layout.card[section];
      if (dynamicSectionSource && typeof dynamicSectionSource === "object") {
        return dynamicSectionSource as Record<string, string | number>;
      }

      return {};
    },
    [
      cardLayoutStyleSectionKeyMap,
      renderConfig.layout,
      rootLayoutStyleSectionKeyMap,
      sceneStyleSectionKeySet,
      styleSectionLabels,
    ]
  );

  const parseStyleValue = useCallback((rawValue: string): string | number => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return "";
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return trimmed;
  }, []);

  const withExclusiveInsetValue = useCallback(
    (
      currentMap: Record<string, string | number>,
      key: string,
      nextValue: string | number
    ) => {
      const nextMap: Record<string, string | number> = {
        ...currentMap,
        [key]: nextValue,
      };

      const counterpartKey = v2_POSITION_MUTEX_MAP[key];
      if (!counterpartKey) return nextMap;
      if (!v2_hasRenderableStyleValue(nextValue)) return nextMap;

      delete nextMap[counterpartKey];
      return nextMap;
    },
    []
  );

  const updateStyleSection = useCallback(
    (section: string, nextMap: Record<string, string | number>) => {
      safeUpdateConfig((prev) => {
        const targetSections = sharedStyleSectionTargets[section] ?? [section];
        return targetSections.reduce((nextPrev, targetSection) => {
          const knownSection = v2_isKnownStyleSectionKey(
            targetSection,
            styleSectionLabels
          )
            ? targetSection
            : null;
          const rootLayoutKey = knownSection
            ? rootLayoutStyleSectionKeyMap[knownSection]
            : undefined;
          if (rootLayoutKey) {
            return {
              ...nextPrev,
              layout: {
                ...nextPrev.layout,
                [rootLayoutKey]: nextMap,
              },
            };
          }

          const cardLayoutKey = knownSection
            ? cardLayoutStyleSectionKeyMap[knownSection]
            : undefined;
          if (cardLayoutKey) {
            return {
              ...nextPrev,
              layout: {
                ...nextPrev.layout,
                card: {
                  ...nextPrev.layout.card,
                  [cardLayoutKey]: nextMap,
                },
              },
            };
          }

          if (sceneStyleSectionKeySet.has(targetSection)) {
            return {
              ...nextPrev,
              layout: {
                ...nextPrev.layout,
                scene: {
                  ...nextPrev.layout.scene,
                  [targetSection]: nextMap,
                },
              },
            };
          }

          return {
            ...nextPrev,
            layout: {
              ...nextPrev.layout,
              card: {
                ...nextPrev.layout.card,
                [targetSection]: nextMap,
              },
            },
          };
        }, prev);
      });
    },
    [
      cardLayoutStyleSectionKeyMap,
      rootLayoutStyleSectionKeyMap,
      safeUpdateConfig,
      sceneStyleSectionKeySet,
      sharedStyleSectionTargets,
      styleSectionLabels,
    ]
  );

  const addStyleProperty = useCallback(
    (section: string) => {
      const currentMap = getStyleSectionMap(section);
      const nextKey =
        stylePropertyCatalog.find(
          (property) =>
            !lockedStylePropertyKeys.has(property) &&
            currentMap[property] === undefined
        ) ?? `custom_${Object.keys(currentMap).length + 1}`;

      updateStyleSection(section, {
        ...currentMap,
        [nextKey]: "",
      });
    },
    [
      getStyleSectionMap,
      lockedStylePropertyKeys,
      stylePropertyCatalog,
      updateStyleSection,
    ]
  );

  const removeStyleProperty = useCallback(
    (section: string, key: string) => {
      if (lockedStylePropertyKeys.has(key)) return;
      const currentMap = getStyleSectionMap(section);
      const nextMap = { ...currentMap };
      delete nextMap[key];
      updateStyleSection(section, nextMap);
    },
    [getStyleSectionMap, lockedStylePropertyKeys, updateStyleSection]
  );

  const updateStylePropertyValue = useCallback(
    (section: string, key: string, rawValue: string) => {
      if (lockedStylePropertyKeys.has(key)) return;
      const currentMap = getStyleSectionMap(section);
      const nextValue = parseStyleValue(rawValue);
      updateStyleSection(
        section,
        withExclusiveInsetValue(currentMap, key, nextValue)
      );
    },
    [
      getStyleSectionMap,
      lockedStylePropertyKeys,
      parseStyleValue,
      updateStyleSection,
      withExclusiveInsetValue,
    ]
  );

  const updateGridLayoutMode = useCallback(
    (mode: "grid3x3" | "flex4x2" | "free") => {
      const currentMap = getStyleSectionMap("grid");
      updateStyleSection("grid", {
        ...currentMap,
        layoutMode: mode,
      });
    },
    [getStyleSectionMap, updateStyleSection]
  );

  const updateFlex42Align = useCallback(
    (align: "left" | "center" | "right") => {
      const currentMap = getStyleSectionMap("grid");
      updateStyleSection("grid", {
        ...currentMap,
        flex42Align: align,
      });
    },
    [getStyleSectionMap, updateStyleSection]
  );

  const updateFlex42ThreeRow = useCallback(
    (targetRow: "top" | "bottom") => {
      const currentMap = getStyleSectionMap("grid");
      updateStyleSection("grid", {
        ...currentMap,
        flex42ThreeRow: targetRow,
      });
    },
    [getStyleSectionMap, updateStyleSection]
  );

  const pickGridEmptySlot = useCallback(
    (slot: number) => {
      const currentMap = getStyleSectionMap("grid");
      const slotA = currentMap.gridEmptySlotA;
      const slotB = currentMap.gridEmptySlotB;
      const currentSlots = [slotA, slotB].filter(
        (value): value is number => typeof value === "number"
      );
      const isSelected = currentSlots.includes(slot);

      let nextSlots: number[];
      if (isSelected) {
        nextSlots = currentSlots.filter((value) => value !== slot);
      } else if (currentSlots.length < 2) {
        nextSlots = [...currentSlots, slot];
      } else {
        nextSlots = [currentSlots[1], slot];
      }

      const nextMap: Record<string, string | number> = {
        ...currentMap,
      };
      if (nextSlots[0] !== undefined) {
        nextMap.gridEmptySlotA = nextSlots[0];
      } else {
        delete nextMap.gridEmptySlotA;
      }
      if (nextSlots[1] !== undefined) {
        nextMap.gridEmptySlotB = nextSlots[1];
      } else {
        delete nextMap.gridEmptySlotB;
      }

      updateStyleSection("grid", nextMap);
    },
    [getStyleSectionMap, updateStyleSection]
  );

  const getHighlightTargetFromStyleSection = useCallback(
    (section: string): V2TemplateHighlightTarget => {
      const knownSection = v2_isKnownStyleSectionKey(section, styleSectionLabels)
        ? section
        : null;
      return (
        structureSectionToTarget[section] ??
        (knownSection
          ? styleSectionHighlightTargetMap[knownSection]
          : "cardContainer")
      );
    },
    [
      structureSectionToTarget,
      styleSectionHighlightTargetMap,
      styleSectionLabels,
    ]
  );

  const setSectionHoverHighlight = useCallback(
    (section: string) => {
      setHoverHighlightTarget(getHighlightTargetFromStyleSection(section));
    },
    [getHighlightTargetFromStyleSection, setHoverHighlightTarget]
  );

  const clearSectionHoverHighlight = useCallback(() => {
    setHoverHighlightTarget(null);
  }, [setHoverHighlightTarget]);

  const setSectionActiveHighlight = useCallback(
    (section: string) => {
      setActiveHighlightTarget(getHighlightTargetFromStyleSection(section));
    },
    [getHighlightTargetFromStyleSection, setActiveHighlightTarget]
  );

  const isStyleGroupOpen = useCallback(
    ({
      section,
      group,
      sectionMap,
    }: {
      section: string;
      group: V2BoilerplateGroupConfig;
      sectionMap: Record<string, string | number>;
    }) => {
      const stateKey = `${section}:${group.id}`;
      const explicit = styleGroupExpanded[stateKey];
      if (typeof explicit === "boolean") return explicit;

      const hasAnyValue = group.fields.some((field) => {
        const value = sectionMap[field.key];
        if (value === undefined) return false;
        if (typeof value === "string") return value.trim() !== "";
        return true;
      });

      if (hasAnyValue) return true;
      if (group.id === "fill" || group.id === "stroke" || group.id === "effects") {
        return false;
      }
      return true;
    },
    [styleGroupExpanded]
  );

  const toggleStyleGroupOpen = useCallback((section: string, groupId: string) => {
    const stateKey = `${section}:${groupId}`;
    setStyleGroupExpanded((prev) => ({
      ...prev,
      [stateKey]: !(prev[stateKey] ?? false),
    }));
  }, []);

  const applyStyleExtensionGroupDefaults = useCallback(
    (section: string, groupId: string) => {
      const defaults = v2_STYLE_EXTENSION_DEFAULT_VALUES[groupId];
      if (!defaults) return;

      const currentMap = getStyleSectionMap(section);
      const nextMap: Record<string, string | number> = { ...currentMap };

      Object.entries(defaults).forEach(([key, value]) => {
        const currentValue = nextMap[key];
        const isUnset =
          currentValue === undefined ||
          (typeof currentValue === "string" && currentValue.trim() === "");
        if (isUnset) {
          nextMap[key] = value;
        }
      });

      updateStyleSection(section, nextMap);

      const stateKey = `${section}:${groupId}`;
      setStyleGroupExpanded((prev) => ({
        ...prev,
        [stateKey]: true,
      }));
    },
    [getStyleSectionMap, updateStyleSection]
  );

  const getHorizontalAlignFromStyle = useCallback(
    (
      wrapperMap: Record<string, string | number>,
      textMap: Record<string, string | number>
    ): V2HorizontalAlign => {
      const textAlignRaw = textMap.textAlign;
      if (
        textAlignRaw === "left" ||
        textAlignRaw === "center" ||
        textAlignRaw === "right"
      ) {
        return textAlignRaw;
      }

      const justifyRaw = wrapperMap.justifyContent;
      if (typeof justifyRaw === "string") {
        return v2_JUSTIFY_TO_HORIZONTAL_ALIGN[justifyRaw] ?? "center";
      }
      return "center";
    },
    []
  );

  const getVerticalAlignFromStyle = useCallback(
    (wrapperMap: Record<string, string | number>): V2VerticalAlign => {
      const alignItemsRaw = wrapperMap.alignItems;
      if (typeof alignItemsRaw === "string") {
        return v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN[alignItemsRaw] ?? "center";
      }
      return "center";
    },
    []
  );

  const updateAutoResizeHorizontalAlign = useCallback(
    ({
      wrapperSection,
      textSection,
      align,
    }: {
      wrapperSection: string;
      textSection: string;
      align: V2HorizontalAlign;
    }) => {
      const wrapperMap = getStyleSectionMap(wrapperSection);
      const textMap = getStyleSectionMap(textSection);

      updateStyleSection(wrapperSection, {
        ...wrapperMap,
        display: "flex",
        justifyContent: v2_HORIZONTAL_ALIGN_TO_JUSTIFY[align],
      });

      updateStyleSection(textSection, {
        ...textMap,
        textAlign: align,
      });
    },
    [getStyleSectionMap, updateStyleSection]
  );

  const updateAutoResizeVerticalAlign = useCallback(
    ({
      wrapperSection,
      align,
    }: {
      wrapperSection: string;
      align: V2VerticalAlign;
    }) => {
      const wrapperMap = getStyleSectionMap(wrapperSection);

      updateStyleSection(wrapperSection, {
        ...wrapperMap,
        display: "flex",
        alignItems: v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS[align],
      });
    },
    [getStyleSectionMap, updateStyleSection]
  );

  return {
    getStyleSectionMap,
    addStyleProperty,
    removeStyleProperty,
    updateStylePropertyValue,
    updateGridLayoutMode,
    updateFlex42Align,
    updateFlex42ThreeRow,
    pickGridEmptySlot,
    setSectionHoverHighlight,
    clearSectionHoverHighlight,
    setSectionActiveHighlight,
    isStyleGroupOpen,
    toggleStyleGroupOpen,
    applyStyleExtensionGroupDefaults,
    getHorizontalAlignFromStyle,
    getVerticalAlignFromStyle,
    updateAutoResizeHorizontalAlign,
    updateAutoResizeVerticalAlign,
  };
};

export default useTemplateStyleEditorActions;
