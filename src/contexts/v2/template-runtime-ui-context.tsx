"use client";

import {
  TemplateEditorUIActions,
  TemplateEditorUIState,
} from "@/hooks/v2/useTemplateState";
import { createContext, PropsWithChildren, useContext } from "react";

export interface TemplateRuntimeUIContextValue {
  state: TemplateEditorUIState;
  actions: TemplateEditorUIActions;
}

const TemplateRuntimeUIContext =
  createContext<TemplateRuntimeUIContextValue | null>(null);

export const TemplateRuntimeUIProvider = ({
  children,
  value,
}: PropsWithChildren<{ value: TemplateRuntimeUIContextValue }>) => {
  return (
    <TemplateRuntimeUIContext.Provider value={value}>
      {children}
    </TemplateRuntimeUIContext.Provider>
  );
};

export const useTemplateRuntimeUIContext = () => {
  const context = useContext(TemplateRuntimeUIContext);

  if (!context) {
    throw new Error(
      "useTemplateRuntimeUIContext must be used within TemplateRuntimeUIProvider"
    );
  }

  return context;
};

export const useTemplateRuntimeData = () => {
  const { state, actions } = useTemplateRuntimeUIContext();

  return {
    profileText: state.profileText,
    memoText: state.memoText,
    imageSrc: state.imageSrc,
    preferProfileDummyImage: state.preferProfileDummyImage,
    isProfileTextVisible: state.isProfileTextVisible,
    isMemoTextVisible: state.isMemoTextVisible,
    selectedOptions: state.selectedOptions,
    mondayDateStr: state.mondayDateStr,
    weekDates: state.weekDates,
    updateProfileText: actions.updateProfileText,
    updateMemoText: actions.updateMemoText,
    updateImageSrc: actions.updateImageSrc,
    updatePreferProfileDummyImage: actions.updatePreferProfileDummyImage,
    updateIsProfileTextVisible: actions.updateIsProfileTextVisible,
    updateMondayDate: actions.updateMondayDate,
    handleImageChange: actions.handleImageChange,
    handleProfileTextChange: actions.handleProfileTextChange,
    handleDateChange: actions.handleDateChange,
    handleOptionClick: actions.handleOptionClick,
  };
};

export const useTemplateRuntimeUI = () => {
  const { state, actions } = useTemplateRuntimeUIContext();

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

export const useTemplateRuntimeActions = () => {
  const { actions } = useTemplateRuntimeUIContext();
  return {
    downloadImage: actions.downloadImage,
  };
};
