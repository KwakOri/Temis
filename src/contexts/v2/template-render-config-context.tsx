"use client";

import {
  V2TemplateAssetRef,
  V2TemplateAssetMap,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_getThemedAssetUrl } from "@/utils/v2/template-render-config";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
} from "react";

export interface TemplateRenderConfigContextValue {
  templateId: string | null;
  source: "db" | "empty";
  isLoading: boolean;
  renderConfig: V2TemplateRenderConfig;
  setRenderConfig?: Dispatch<SetStateAction<V2TemplateRenderConfig>>;
  figmaImport?: {
    rootFigmaUrl: string;
    setRootFigmaUrl: (value: string) => void;
    withAssets: boolean;
    setWithAssets: (value: boolean) => void;
    isImporting: boolean;
    canImport: boolean;
    message: string | null;
    pendingSettingChanges: Array<{
      key: "multi" | "offlineMemo" | "artist" | "memo";
      action: "enable" | "disable";
      label: string;
      title: string;
      description: string;
    }>;
    confirmPendingImport: () => void;
    cancelPendingImport: () => void;
    importToCurrentTemplate: () => void;
    reset: () => void;
  };
}

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

export const resolveAssetUrlFromConfig = ({
  renderConfig,
  assetRef,
  currentTheme,
}: {
  renderConfig: V2TemplateRenderConfig;
  assetRef?: V2TemplateAssetRef;
  currentTheme: string;
}): string | null => {
  if (!assetRef) return null;
  if (assetRef.source === "builtin") {
    return getAssetUrlFromConfig({
      renderConfig,
      key: assetRef.key,
      currentTheme,
    });
  }
  const extraAssetMap = renderConfig.extraAssets[assetRef.key];
  if (!extraAssetMap) return null;
  return v2_getThemedAssetUrl(
    extraAssetMap,
    currentTheme,
    renderConfig.defaultTheme
  );
};
