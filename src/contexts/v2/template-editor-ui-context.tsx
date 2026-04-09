"use client";

import {
  TemplateEditorUIActions,
  TemplateEditorUIState,
} from "@/hooks/v2/useTemplateState";
import { createContext, PropsWithChildren, useContext } from "react";

export interface TemplateEditorUIContextValue {
  state: TemplateEditorUIState;
  actions: TemplateEditorUIActions;
}

const TemplateEditorUIContext = createContext<TemplateEditorUIContextValue | null>(
  null
);

export const TemplateEditorUIProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: TemplateEditorUIContextValue }>) => {
  return (
    <TemplateEditorUIContext.Provider value={value}>
      {children}
    </TemplateEditorUIContext.Provider>
  );
};

export const useTemplateEditorUIContext = () => {
  const context = useContext(TemplateEditorUIContext);

  if (!context) {
    throw new Error(
      "useTemplateEditorUIContext must be used within TemplateEditorUIProvider"
    );
  }

  return context;
};

export const useTemplateEditorData = () => {
  const { state, actions } = useTemplateEditorUIContext();

  return {
    profileText: state.profileText,
    memoText: state.memoText,
    imageSrc: state.imageSrc,
    isProfileTextVisible: state.isProfileTextVisible,
    isMemoTextVisible: state.isMemoTextVisible,
    selectedOptions: state.selectedOptions,
    mondayDateStr: state.mondayDateStr,
    weekDates: state.weekDates,
    updateProfileText: actions.updateProfileText,
    updateImageSrc: actions.updateImageSrc,
    updateIsProfileTextVisible: actions.updateIsProfileTextVisible,
    updateMondayDate: actions.updateMondayDate,
    handleImageChange: actions.handleImageChange,
    handleProfileTextChange: actions.handleProfileTextChange,
    handleDateChange: actions.handleDateChange,
    handleOptionClick: actions.handleOptionClick,
  };
};

export const useTemplateEditorUI = () => {
  const { state, actions } = useTemplateEditorUIContext();

  return {
    scale: state.scale,
    isMobile: state.isMobile,
    isProfileTextVisible: state.isProfileTextVisible,
    isMemoTextVisible: state.isMemoTextVisible,
    selectedOptions: state.selectedOptions,
    updateScale: actions.updateScale,
    updateIsMobile: actions.updateIsMobile,
    updateIsProfileTextVisible: actions.updateIsProfileTextVisible,
    handleOptionClick: actions.handleOptionClick,
  };
};

export const useTemplateEditorActions = () => {
  const { actions } = useTemplateEditorUIContext();
  return {
    downloadImage: actions.downloadImage,
  };
};

// Backward-compatible aliases during migration.
export type V2TimeTableUIContextValue = TemplateEditorUIContextValue;
export const V2TimeTableUIProvider = TemplateEditorUIProvider;
export const useV2TimeTableUIContext = useTemplateEditorUIContext;
