"use client";

import {
  V2TemplateAssetMap,
  V2TemplateRenderConfig,
} from "@/types/time-table/v2_template_render_config";
import { v2_getThemedAssetUrl } from "@/utils/time-table/v2_template_render_config";
import { createContext, PropsWithChildren, useContext } from "react";

export interface V2TemplateRenderConfigContextValue {
  templateId: string | null;
  source: "db" | "default";
  isLoading: boolean;
  renderConfig: V2TemplateRenderConfig;
}

const V2TemplateRenderConfigContext =
  createContext<V2TemplateRenderConfigContextValue | null>(null);

export const V2TemplateRenderConfigProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: V2TemplateRenderConfigContextValue }>) => {
  return (
    <V2TemplateRenderConfigContext.Provider value={value}>
      {children}
    </V2TemplateRenderConfigContext.Provider>
  );
};

export const useV2TemplateRenderConfigContext = () => {
  const context = useContext(V2TemplateRenderConfigContext);

  if (!context) {
    throw new Error(
      "useV2TemplateRenderConfigContext must be used within V2TemplateRenderConfigProvider"
    );
  }

  return context;
};

export const v2_getAssetUrlFromConfig = ({
  renderConfig,
  key,
  currentTheme,
}: {
  renderConfig: V2TemplateRenderConfig;
  key: keyof V2TemplateAssetMap;
  currentTheme: string;
}): string | null => {
  return v2_getThemedAssetUrl(
    renderConfig.assets[key],
    currentTheme,
    renderConfig.defaultTheme
  );
};
