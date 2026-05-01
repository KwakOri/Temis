"use client";

import { TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { V2RuntimeHighlightTarget } from "@/types/time-table/template-runtime-ui";
import { TTheme } from "@/types/time-table/theme";
import { createContext, PropsWithChildren, useContext } from "react";

export interface TemplateRuntimeContextValue {
  data: TDefaultCard[];
  updateData: (newData: TDefaultCard[]) => void;
  globalData: TGlobalData;
  updateGlobalData: (newGlobalData: TGlobalData) => void;
  currentTheme: TTheme;
  updateTheme: (theme: TTheme) => void;
  resetData: () => void;
  hiddenLayerIds: Record<string, boolean>;
  isLayerHidden: (layerId: string) => boolean;
  toggleLayerHidden: (layerId: string) => void;
  setLayerHidden: (layerId: string, hidden: boolean) => void;
  lockedLayerIds: Record<string, boolean>;
  isLayerLocked: (layerId: string) => boolean;
  toggleLayerLocked: (layerId: string) => void;
  setLayerLocked: (layerId: string, locked: boolean) => void;
  hoverHighlightTarget: V2RuntimeHighlightTarget | null;
  setHoverHighlightTarget: (
    target: V2RuntimeHighlightTarget | null
  ) => void;
  activeHighlightTarget: V2RuntimeHighlightTarget | null;
  setActiveHighlightTarget: (
    target: V2RuntimeHighlightTarget | null
  ) => void;
}

const TemplateRuntimeContext = createContext<TemplateRuntimeContextValue | null>(
  null
);

export const TemplateRuntimeProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: TemplateRuntimeContextValue }>) => {
  return (
    <TemplateRuntimeContext.Provider value={value}>
      {children}
    </TemplateRuntimeContext.Provider>
  );
};

export const useTemplateRuntimeContext = () => {
  const context = useContext(TemplateRuntimeContext);

  if (!context) {
    throw new Error(
      "useTemplateRuntimeContext must be used within TemplateRuntimeProvider"
    );
  }

  return context;
};
