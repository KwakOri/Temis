"use client";

import { TDefaultCard, TGlobalData } from "@/types/time-table/data";
import { V2TemplateHighlightTarget } from "@/types/time-table/v2_template_editor_ui";
import { TTheme } from "@/types/time-table/theme";
import { createContext, PropsWithChildren, useContext } from "react";

export interface V2TimeTableEditorRuntimeContextValue {
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

const V2TimeTableEditorRuntimeContext =
  createContext<V2TimeTableEditorRuntimeContextValue | null>(null);

export const V2TimeTableEditorRuntimeProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: V2TimeTableEditorRuntimeContextValue }>) => {
  return (
    <V2TimeTableEditorRuntimeContext.Provider value={value}>
      {children}
    </V2TimeTableEditorRuntimeContext.Provider>
  );
};

export const useV2TimeTableEditorRuntimeContext = () => {
  const context = useContext(V2TimeTableEditorRuntimeContext);

  if (!context) {
    throw new Error(
      "useV2TimeTableEditorRuntimeContext must be used within V2TimeTableEditorRuntimeProvider"
    );
  }

  return context;
};
