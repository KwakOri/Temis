"use client";

import React from "react";

import {
  v2_HORIZONTAL_ALIGN_TO_JUSTIFY,
  v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS,
} from "../model/alignment-utils";
import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "../model/default-style-section-boilerplates";
import { v2_BOILERPLATE_NUMERIC_KEYS } from "../model/boilerplate-presets";
import {
  v2_POSITION_MUTEX_MAP,
  v2_hasRenderableStyleValue,
} from "../model/layout-utils";
import {
  V2BoilerplateFieldConfig,
  V2BoilerplateFieldType,
} from "../model/boilerplate-ui-utils";

type V2BoilerplateConfigMap = Partial<
  Record<string, Record<string, string | number>>
>;
type V2HorizontalAlign = "left" | "center" | "right";
type V2VerticalAlign = "top" | "center" | "bottom";

interface UseTemplateBoilerplateActionsParams {
  boilerplateConfig: V2BoilerplateConfigMap;
  setBoilerplateConfig: React.Dispatch<
    React.SetStateAction<V2BoilerplateConfigMap>
  >;
  lockedStylePropertyKeys: Set<string>;
  getHorizontalAlignFromStyle: (
    wrapperMap: Record<string, string | number>,
    textMap: Record<string, string | number>
  ) => V2HorizontalAlign;
  getVerticalAlignFromStyle: (
    wrapperMap: Record<string, string | number>
  ) => V2VerticalAlign;
}

const useTemplateBoilerplateActions = ({
  boilerplateConfig,
  setBoilerplateConfig,
  lockedStylePropertyKeys,
  getHorizontalAlignFromStyle,
  getVerticalAlignFromStyle,
}: UseTemplateBoilerplateActionsParams) => {
  const getBoilerplateSectionMap = (section: string) => {
    return boilerplateConfig[section] ?? {};
  };

  const updateBoilerplateSection = (
    section: string,
    nextMap: Record<string, string | number>
  ) => {
    setBoilerplateConfig((prev) => ({
      ...prev,
      [section]: nextMap,
    }));
  };

  const parseStyleValue = (rawValue: string): string | number => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return "";
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return trimmed;
  };

  const withExclusiveInsetValue = (
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
  };

  const updateBoilerplatePropertyValue = (
    section: string,
    key: string,
    rawValue: string
  ) => {
    if (lockedStylePropertyKeys.has(key)) return;
    const currentMap = getBoilerplateSectionMap(section);
    const nextValue = parseStyleValue(rawValue);
    updateBoilerplateSection(
      section,
      withExclusiveInsetValue(currentMap, key, nextValue)
    );
  };

  const getBoilerplateFieldType = (
    field: V2BoilerplateFieldConfig
  ): V2BoilerplateFieldType => {
    if (field.type) return field.type;
    if (v2_BOILERPLATE_NUMERIC_KEYS.has(field.key)) return "number";
    return "text";
  };

  const getBoilerplateFieldStep = (field: V2BoilerplateFieldConfig) => {
    if (field.step) return field.step;
    if (field.key === "opacity") return "0.01";
    if (field.key === "lineHeight" || field.key === "letterSpacing") return "0.1";
    if (field.key === "rotateDeg") return "0.1";
    return "1";
  };

  const resetBoilerplateSection = (section: string) => {
    const defaults = v2_DEFAULT_STYLE_SECTION_BOILERPLATES[section] ?? {};
    updateBoilerplateSection(section, {
      ...(JSON.parse(JSON.stringify(defaults)) as Record<string, string | number>),
    });
  };

  const getBoilerplateAutoResizePair = (
    section: string
  ): { wrapperSection: string; textSection: string } | null => {
    if (section === "mainTitleWrapperStyle" || section === "mainTitleTextStyle") {
      return {
        wrapperSection: "mainTitleWrapperStyle",
        textSection: "mainTitleTextStyle",
      };
    }
    if (section === "subTitleWrapperStyle" || section === "subTitleTextStyle") {
      return {
        wrapperSection: "subTitleWrapperStyle",
        textSection: "subTitleTextStyle",
      };
    }
    return null;
  };

  const getBoilerplateHorizontalAlign = ({
    wrapperSection,
    textSection,
  }: {
    wrapperSection: string;
    textSection: string;
  }): V2HorizontalAlign => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    const textMap = getBoilerplateSectionMap(textSection);
    return getHorizontalAlignFromStyle(wrapperMap, textMap);
  };

  const getBoilerplateVerticalAlign = ({
    wrapperSection,
  }: {
    wrapperSection: string;
  }): V2VerticalAlign => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    return getVerticalAlignFromStyle(wrapperMap);
  };

  const updateBoilerplateAutoResizeHorizontalAlign = ({
    wrapperSection,
    textSection,
    align,
  }: {
    wrapperSection: string;
    textSection: string;
    align: V2HorizontalAlign;
  }) => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    const textMap = getBoilerplateSectionMap(textSection);

    updateBoilerplateSection(wrapperSection, {
      ...wrapperMap,
      display: "flex",
      justifyContent: v2_HORIZONTAL_ALIGN_TO_JUSTIFY[align],
    });

    updateBoilerplateSection(textSection, {
      ...textMap,
      textAlign: align,
    });
  };

  const updateBoilerplateAutoResizeVerticalAlign = ({
    wrapperSection,
    align,
  }: {
    wrapperSection: string;
    align: V2VerticalAlign;
  }) => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    updateBoilerplateSection(wrapperSection, {
      ...wrapperMap,
      display: "flex",
      alignItems: v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS[align],
    });
  };

  return {
    getBoilerplateSectionMap,
    updateBoilerplatePropertyValue,
    getBoilerplateFieldType,
    getBoilerplateFieldStep,
    resetBoilerplateSection,
    getBoilerplateAutoResizePair,
    getBoilerplateHorizontalAlign,
    getBoilerplateVerticalAlign,
    updateBoilerplateAutoResizeHorizontalAlign,
    updateBoilerplateAutoResizeVerticalAlign,
  };
};

export default useTemplateBoilerplateActions;
