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
    memoText: state.memoText,
    imageSrc: state.imageSrc,
    preferProfileDummyImage: state.preferProfileDummyImage,
    isArtistVisible: state.isArtistVisible,
    isMemoTextVisible: state.isMemoTextVisible,
    selectedOptions: state.selectedOptions,
    mondayDateStr: state.mondayDateStr,
    weekDates: state.weekDates,
    updateMemoText: actions.updateMemoText,
    updateImageSrc: actions.updateImageSrc,
    updatePreferProfileDummyImage: actions.updatePreferProfileDummyImage,
    updateIsArtistVisible: actions.updateIsArtistVisible,
    updateMondayDate: actions.updateMondayDate,
    handleImageChange: actions.handleImageChange,
    handleDateChange: actions.handleDateChange,
    handleOptionClick: actions.handleOptionClick,
  };
};

export const useTemplateRuntimeUI = () => {
  const { state, actions } = useTemplateRuntimeUIContext();

  return {
    scale: state.scale,
    isMobile: state.isMobile,
    isArtistVisible: state.isArtistVisible,
    isMemoTextVisible: state.isMemoTextVisible,
    selectedOptions: state.selectedOptions,
    updateScale: actions.updateScale,
    updateIsMobile: actions.updateIsMobile,
    updateIsArtistVisible: actions.updateIsArtistVisible,
    handleOptionClick: actions.handleOptionClick,
  };
};

export const useTemplateRuntimeActions = () => {
  const { actions } = useTemplateRuntimeUIContext();
  return {
    downloadImage: actions.downloadImage,
  };
};
