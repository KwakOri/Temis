"use client";

import React from "react";

import { V2TemplateCardInstanceTransform } from "@/types/time-table/template-render-config";
import TemplateCardComponentProperties from "../components/template-card-component-properties";
import TemplateSimplePropertiesSection from "../components/template-simple-properties-section";
import { v2_getPropertiesStyleEditorTitle } from "../model/style-section-title-utils";
import { v2_isKnownStyleSectionKey } from "../model/style-section-utils";

type V2StyleSectionId = string;

interface UseTemplateSimplePropertiesPanelParams {
  sectionToLabel: Record<string, string>;
  styleSectionLabels: Record<string, string>;
  bindableNodeLabels: string[];
  cardInstanceMode: "component" | "detached";
  cardInstanceTransforms: Record<string, V2TemplateCardInstanceTransform>;
  onChangeCardInstanceMode: (mode: "component" | "detached") => void;
  onAppendCardTextNode: () => void;
  onAppendCardFlexibleTextNode: () => void;
  onUpdateCardInstanceTransform: (
    cardIndex: number,
    key: "offsetX" | "offsetY" | "rotateDeg" | "scale" | "opacity",
    value: number
  ) => void;
  renderStyleSectionEditor: (params: {
    title: string;
    section: V2StyleSectionId;
  }) => React.ReactNode;
}

const useTemplateSimplePropertiesPanel = ({
  sectionToLabel,
  styleSectionLabels,
  bindableNodeLabels,
  cardInstanceMode,
  cardInstanceTransforms,
  onChangeCardInstanceMode,
  onAppendCardTextNode,
  onAppendCardFlexibleTextNode,
  onUpdateCardInstanceTransform,
  renderStyleSectionEditor,
}: UseTemplateSimplePropertiesPanelParams) => {
  const renderCardComponentProperties = (section: V2StyleSectionId) => {
    if (section !== "cardContainer") return null;

    return (
      <TemplateCardComponentProperties
        instanceMode={cardInstanceMode}
        instanceTransforms={cardInstanceTransforms}
        onChangeInstanceMode={onChangeCardInstanceMode}
        onAppendTextNode={onAppendCardTextNode}
        onAppendFlexibleTextNode={onAppendCardFlexibleTextNode}
        onUpdateInstanceTransform={onUpdateCardInstanceTransform}
      />
    );
  };

  const renderSimplePropertiesSection = (section: V2StyleSectionId) => {
    const knownSection = v2_isKnownStyleSectionKey(section, styleSectionLabels)
      ? section
      : null;
    const heading =
      sectionToLabel[section] ??
      (knownSection ? styleSectionLabels[knownSection] : section);
    const styleTitle = v2_getPropertiesStyleEditorTitle(section);

    return (
      <TemplateSimplePropertiesSection
        heading={heading}
        section={section}
        bindableNodeLabels={bindableNodeLabels}
        cardComponentProperties={renderCardComponentProperties(section)}
        styleEditor={renderStyleSectionEditor({ title: styleTitle, section })}
      />
    );
  };

  return {
    renderSimplePropertiesSection,
  };
};

export default useTemplateSimplePropertiesPanel;
