"use client";

import { V2TemplateRenderConfig } from "@/types/time-table/template-render-config";

export const v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME =
  "absolute flex justify-center items-center";

export const v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME =
  "leading-none text-center";

export const v2_createDefaultTextNodeLayoutPatch = ({
  containerStyleKey,
  textStyleKey,
  wrapperStyleKey,
  optionsKey,
  isFlexibleText,
}: {
  containerStyleKey: string;
  textStyleKey: string;
  wrapperStyleKey?: string;
  optionsKey?: string;
  isFlexibleText: boolean;
}): Record<string, NonNullable<V2TemplateRenderConfig["layout"]["scene"][string]>> => {
  const basePatch: Record<
    string,
    NonNullable<V2TemplateRenderConfig["layout"]["scene"][string]>
  > = {
    [containerStyleKey]: {
      position: "absolute",
      top: 0,
      left: 0,
      width: isFlexibleText ? 320 : 240,
      height: isFlexibleText ? 96 : 64,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    [textStyleKey]: {
      fontSize: isFlexibleText ? 42 : 32,
      lineHeight: 1,
      textAlign: "center",
      ...(isFlexibleText ? { fontWeight: 700 } : {}),
    },
  };

  if (!isFlexibleText) return basePatch;

  if (wrapperStyleKey) {
    basePatch[wrapperStyleKey] = {
      justifyContent: "center",
      alignItems: "center",
    };
  }

  if (optionsKey) {
    basePatch[optionsKey] = {
      maxFontSize: 56,
      multiline: true,
    };
  }

  return basePatch;
};
