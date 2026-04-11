"use client";

import React from "react";

import {
  V2TemplateCardInstanceTransform,
  V2TemplateDayKey,
} from "@/types/time-table/template-render-config";
import TemplateCardComponentProperties from "../components/template-card-component-properties";
import TemplateSimplePropertiesSection from "../components/template-simple-properties-section";
import { v2_getPropertiesStyleEditorTitle } from "../model/style-section-title-utils";
import { v2_isKnownStyleSectionKey } from "../model/style-section-utils";

type V2StyleSectionId = string;

interface UseTemplateSimplePropertiesPanelParams {
  sectionToLabel: Record<string, string>;
  styleSectionLabels: Record<string, string>;
  bindableNodeLabels: string[];
  editorMode: "instance" | "master";
  cardContainerSectionKey: string;
  cardInstanceMode: "component" | "detached";
  cardInstanceTransforms: Record<string, V2TemplateCardInstanceTransform>;
  cardComponentInstances: Array<{
    instanceId: string;
    label: string;
    dayKey?: V2TemplateDayKey;
  }>;
  cardComponentInstanceDiagnostics: {
    duplicateInstanceIds: string[];
    duplicateDayKeys: V2TemplateDayKey[];
    missingDayKeys: V2TemplateDayKey[];
  };
  onChangeCardInstanceMode: (mode: "component" | "detached") => void;
  onAppendCardTextNode: () => void;
  onAppendCardFlexibleTextNode: () => void;
  onUpdateCardInstanceTransform: (
    instanceId: string,
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
  editorMode,
  cardContainerSectionKey,
  cardInstanceMode,
  cardInstanceTransforms,
  cardComponentInstances,
  cardComponentInstanceDiagnostics,
  onChangeCardInstanceMode,
  onAppendCardTextNode,
  onAppendCardFlexibleTextNode,
  onUpdateCardInstanceTransform,
  renderStyleSectionEditor,
}: UseTemplateSimplePropertiesPanelParams) => {
  const renderCardComponentProperties = (section: V2StyleSectionId) => {
    if (section !== cardContainerSectionKey) return null;
    if (editorMode === "instance") {
      return (
        <div className="rounded-lg border border-[#3d4f74] bg-[#15223d] px-3 py-2 text-[11px] text-[#a9c4ff]">
          인스턴스 모드에서는 마스터 구조를 수정할 수 없습니다. Components 탭에서
          Master를 선택해 편집해 주세요.
        </div>
      );
    }

    return (
      <TemplateCardComponentProperties
        instanceMode={cardInstanceMode}
        instanceTransforms={cardInstanceTransforms}
        instances={cardComponentInstances}
        diagnostics={cardComponentInstanceDiagnostics}
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
