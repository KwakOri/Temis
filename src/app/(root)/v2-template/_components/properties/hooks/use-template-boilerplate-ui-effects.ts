"use client";

import React, { useEffect } from "react";

interface UseTemplateBoilerplateUiEffectsParams {
  isBoilerplateSettingsOpen: boolean;
  setIsBoilerplateSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const useTemplateBoilerplateUiEffects = ({
  isBoilerplateSettingsOpen,
  setIsBoilerplateSettingsOpen,
}: UseTemplateBoilerplateUiEffectsParams) => {
  useEffect(() => {
    if (!isBoilerplateSettingsOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBoilerplateSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isBoilerplateSettingsOpen, setIsBoilerplateSettingsOpen]);
};

export default useTemplateBoilerplateUiEffects;
