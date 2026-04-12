"use client";

import React, { useEffect } from "react";

import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  v2_isKnownStyleSectionKey,
  v2_parseStyleSectionKey,
} from "../model/style-section-utils";

interface UseTemplatePropertiesFocusEffectsParams {
  activeTab: string;
  inspectorRefs: Array<React.RefObject<HTMLDivElement | null>>;
  setHoverHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  setActiveHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  focusLayerId: string | null;
  focusLayerNonce: number;
  focusStyleSection: string | null;
  focusStyleSectionNonce: number;
  layerIdToNode: Record<
    string,
    { id: string; target?: V2TemplateHighlightTarget }
  >;
  sectionToLayerId: Record<string, string>;
  sectionToTarget: Record<string, V2TemplateHighlightTarget>;
  styleSectionLabels: Record<string, string>;
  styleSectionHighlightTargetMap: Record<string, V2TemplateHighlightTarget>;
  setSelectedPropertiesLayerId: (layerId: string) => void;
  setSelectedPropertiesTarget: (target: V2TemplateHighlightTarget) => void;
}

const useTemplatePropertiesFocusEffects = ({
  activeTab,
  inspectorRefs,
  setHoverHighlightTarget,
  setActiveHighlightTarget,
  focusLayerId,
  focusLayerNonce,
  focusStyleSection,
  focusStyleSectionNonce,
  layerIdToNode,
  sectionToLayerId,
  sectionToTarget,
  styleSectionLabels,
  styleSectionHighlightTargetMap,
  setSelectedPropertiesLayerId,
  setSelectedPropertiesTarget,
}: UseTemplatePropertiesFocusEffectsParams) => {
  useEffect(() => {
    if (activeTab !== "style") {
      setHoverHighlightTarget(null);
    }
  }, [activeTab, setHoverHighlightTarget]);

  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        inspectorRefs.some(
          (inspectorRef) => inspectorRef.current?.contains(target) ?? false
        )
      ) {
        return;
      }
      setActiveHighlightTarget(null);
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [inspectorRefs, setActiveHighlightTarget]);

  useEffect(() => {
    if (!focusLayerId) return;
    const layerNode = layerIdToNode[focusLayerId];
    if (!layerNode) return;

    setSelectedPropertiesLayerId(layerNode.id);
    if (layerNode.target) {
      setSelectedPropertiesTarget(layerNode.target);
      setActiveHighlightTarget(layerNode.target);
    }
  }, [
    focusLayerId,
    focusLayerNonce,
    layerIdToNode,
    setActiveHighlightTarget,
    setSelectedPropertiesLayerId,
    setSelectedPropertiesTarget,
  ]);

  useEffect(() => {
    const nextSection = v2_parseStyleSectionKey(focusStyleSection);
    if (!nextSection) return;
    const knownSection = v2_isKnownStyleSectionKey(nextSection, styleSectionLabels)
      ? nextSection
      : null;
    const nextTarget =
      sectionToTarget[nextSection] ??
      (knownSection
        ? styleSectionHighlightTargetMap[knownSection]
        : "cardContainer");
    const nextLayerId = sectionToLayerId[nextSection];

    if (nextLayerId) {
      setSelectedPropertiesLayerId(nextLayerId);
    }
    setSelectedPropertiesTarget(nextTarget);
    setActiveHighlightTarget(nextTarget);
  }, [
    focusStyleSection,
    focusStyleSectionNonce,
    sectionToLayerId,
    sectionToTarget,
    setActiveHighlightTarget,
    setSelectedPropertiesLayerId,
    setSelectedPropertiesTarget,
    styleSectionHighlightTargetMap,
    styleSectionLabels,
  ]);
};

export default useTemplatePropertiesFocusEffects;
