"use client";

import React, { useEffect } from "react";

import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "../model/default-style-section-boilerplates";
import {
  v2_isKnownStyleSectionKey,
  v2_parseStyleSectionKey,
} from "../model/style-section-utils";

type V2BoilerplateConfigMap = Partial<
  Record<string, Record<string, string | number>>
>;

interface UseTemplateBoilerplateUiEffectsParams {
  storageKey: string;
  styleSectionLabels: Record<string, string>;
  boilerplateConfig: V2BoilerplateConfigMap;
  setBoilerplateConfig: React.Dispatch<
    React.SetStateAction<V2BoilerplateConfigMap>
  >;
  isBoilerplateSettingsOpen: boolean;
  setIsBoilerplateSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const useTemplateBoilerplateUiEffects = ({
  storageKey,
  styleSectionLabels,
  boilerplateConfig,
  setBoilerplateConfig,
  isBoilerplateSettingsOpen,
  setIsBoilerplateSettingsOpen,
}: UseTemplateBoilerplateUiEffectsParams) => {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;

      const nextConfig: V2BoilerplateConfigMap = JSON.parse(
        JSON.stringify(v2_DEFAULT_STYLE_SECTION_BOILERPLATES)
      );

      Object.entries(parsed).forEach(([rawSection, value]) => {
        const section = v2_parseStyleSectionKey(rawSection);
        if (!section) return;
        if (!v2_isKnownStyleSectionKey(section, styleSectionLabels)) return;
        if (!value || typeof value !== "object" || Array.isArray(value)) return;

        const sanitized: Record<string, string | number> = {};
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
          if (typeof item === "string") {
            sanitized[key] = item;
            return;
          }
          if (typeof item === "number" && Number.isFinite(item)) {
            sanitized[key] = item;
          }
        });

        nextConfig[section] = sanitized;
      });

      setBoilerplateConfig(nextConfig);
    } catch (error) {
      console.error("Failed to restore style boilerplates", error);
    }
  }, [setBoilerplateConfig, storageKey, styleSectionLabels]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(boilerplateConfig));
    } catch (error) {
      console.error("Failed to persist style boilerplates", error);
    }
  }, [boilerplateConfig, storageKey]);

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
