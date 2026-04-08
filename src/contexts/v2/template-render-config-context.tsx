"use client";

import {
  V2TemplateAssetMap,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_getThemedAssetUrl } from "@/utils/time-table/template-render-config";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
} from "react";

export interface TemplateRenderConfigContextValue {
  templateId: string | null;
  source: "db" | "default";
  isLoading: boolean;
  renderConfig: V2TemplateRenderConfig;
  setRenderConfig?: Dispatch<SetStateAction<V2TemplateRenderConfig>>;
}

export type V2TemplateRenderConfigContextValue = TemplateRenderConfigContextValue;

const TemplateRenderConfigContext =
  createContext<TemplateRenderConfigContextValue | null>(null);

export const TemplateRenderConfigProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: TemplateRenderConfigContextValue }>) => {
  return (
    <TemplateRenderConfigContext.Provider value={value}>
      {children}
    </TemplateRenderConfigContext.Provider>
  );
};

export const useTemplateRenderConfigContext = () => {
  const context = useContext(TemplateRenderConfigContext);

  if (!context) {
    throw new Error(
      "useTemplateRenderConfigContext must be used within TemplateRenderConfigProvider"
    );
  }

  return context;
};

export const getAssetUrlFromConfig = ({
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

// Backward-compatible aliases during migration.
export const V2TemplateRenderConfigProvider = TemplateRenderConfigProvider;
export const useV2TemplateRenderConfigContext = useTemplateRenderConfigContext;
export const v2_getAssetUrlFromConfig = getAssetUrlFromConfig;
