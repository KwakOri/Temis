import { useMemo, useState } from "react";

import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import { V2TemplateLayerNode } from "@/types/time-table/template-render-config";
import { v2_collectStructureTargetSectionMaps } from "../model/structure-utils";
import {
  v2_isKnownStyleSectionKey,
  v2_parseStyleSectionKey,
} from "../model/style-section-utils";
import { V2StyleSectionKey } from "../model/template-properties-constants";

interface UseTemplatePropertiesSelectionContextParams {
  runtimeLayerTree: V2TemplateLayerNode[];
  runtimeComponentLayerTrees?: V2TemplateLayerNode[];
  styleSectionLabels: Record<V2StyleSectionKey, string>;
  highlightTargetLabels: Record<V2TemplateHighlightTarget, string>;
}

const useTemplatePropertiesSelectionContext = ({
  runtimeLayerTree,
  runtimeComponentLayerTrees = [],
  styleSectionLabels,
  highlightTargetLabels,
}: UseTemplatePropertiesSelectionContextParams) => {
  const [selectedPropertiesTarget, setSelectedPropertiesTarget] =
    useState<V2TemplateHighlightTarget>("grid");
  const [selectedPropertiesLayerId, setSelectedPropertiesLayerId] =
    useState<string>("grid");
  const [selectedPropertiesEditorMode, setSelectedPropertiesEditorMode] =
    useState<"instance" | "master">("instance");

  const structurePropertiesMaps = useMemo(
    () =>
      v2_collectStructureTargetSectionMaps([
        ...runtimeLayerTree,
        ...runtimeComponentLayerTrees,
      ]),
    [runtimeComponentLayerTrees, runtimeLayerTree]
  );

  const selectedPropertiesLayerNode = useMemo(
    () => structurePropertiesMaps.layerIdToNode[selectedPropertiesLayerId] ?? null,
    [selectedPropertiesLayerId, structurePropertiesMaps.layerIdToNode]
  );

  const selectedPropertiesSection = useMemo(() => {
    const rawSection = selectedPropertiesLayerNode?.sectionKey;
    return v2_parseStyleSectionKey(rawSection) ?? null;
  }, [selectedPropertiesLayerNode]);

  const selectedPropertiesLabel = useMemo(() => {
    if (selectedPropertiesLayerNode?.label) {
      return selectedPropertiesLayerNode.label;
    }
    if (!selectedPropertiesSection) {
      return highlightTargetLabels[selectedPropertiesTarget];
    }
    const knownSection = v2_isKnownStyleSectionKey(
      selectedPropertiesSection,
      styleSectionLabels
    )
      ? selectedPropertiesSection
      : null;
    return (
      structurePropertiesMaps.sectionToLabel[selectedPropertiesSection] ??
      (knownSection ? styleSectionLabels[knownSection] : selectedPropertiesSection)
    );
  }, [
    highlightTargetLabels,
    selectedPropertiesLayerNode,
    selectedPropertiesSection,
    selectedPropertiesTarget,
    structurePropertiesMaps.sectionToLabel,
    styleSectionLabels,
  ]);

  return {
    selectedPropertiesTarget,
    setSelectedPropertiesTarget,
    selectedPropertiesLayerId,
    setSelectedPropertiesLayerId,
    selectedPropertiesEditorMode,
    setSelectedPropertiesEditorMode,
    structurePropertiesMaps,
    selectedPropertiesLayerNode,
    selectedPropertiesSection,
    selectedPropertiesLabel,
  };
};

export default useTemplatePropertiesSelectionContext;
