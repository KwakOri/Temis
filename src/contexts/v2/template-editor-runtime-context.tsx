"use client";

import { TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import { TTheme } from "@/types/time-table/theme";
import { createContext, PropsWithChildren, useContext } from "react";

export interface TemplateEditorRuntimeContextValue {
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
  hoverHighlightTarget: V2TemplateHighlightTarget | null;
  setHoverHighlightTarget: (
    target: V2TemplateHighlightTarget | null
  ) => void;
  activeHighlightTarget: V2TemplateHighlightTarget | null;
  setActiveHighlightTarget: (
    target: V2TemplateHighlightTarget | null
  ) => void;
}

export type V2TimeTableEditorRuntimeContextValue =
  TemplateEditorRuntimeContextValue;

const TemplateEditorRuntimeContext =
  createContext<TemplateEditorRuntimeContextValue | null>(null);

export const TemplateEditorRuntimeProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: TemplateEditorRuntimeContextValue }>) => {
  return (
    <TemplateEditorRuntimeContext.Provider value={value}>
      {children}
    </TemplateEditorRuntimeContext.Provider>
  );
};

export const useTemplateEditorRuntimeContext = () => {
  const context = useContext(TemplateEditorRuntimeContext);

  if (!context) {
    throw new Error(
      "useTemplateEditorRuntimeContext must be used within TemplateEditorRuntimeProvider"
    );
  }

  return context;
};

// Backward-compatible aliases during migration.
export const V2TimeTableEditorRuntimeProvider = TemplateEditorRuntimeProvider;
export const useV2TimeTableEditorRuntimeContext = useTemplateEditorRuntimeContext;
