"use client";

import React from "react";

import {
  V2TemplateColorKey,
  V2TemplateComputedBindingKey,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateNodeBindingRef,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import { V2NodeNewFieldDraft } from "../model/binding-utils";
import TemplateTextNodePropertiesSection from "./template-text-node-properties-section";

interface TemplateBoundTextNodePropertiesPanelProps {
  heading: string;
  label: string;
  colorKey: V2TemplateColorKey;
  fontKey: V2TemplateColorKey;
  visibilityMode: V2TemplateVisibilityMode;
  binding: V2TemplateNodeBindingRef;
  bindingSelectValue: string;
  fields: V2TemplateFormField[];
  computedOptions: readonly V2TemplateComputedBindingKey[];
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  newFieldDraft: V2NodeNewFieldDraft;
  fieldBindingExists: boolean;
  colorKeys: readonly V2TemplateColorKey[];
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  containerSection: string;
  containerSchemaSection?: string;
  wrapperSection: string | null;
  wrapperSchemaSection?: string | null;
  alignmentWrapperSection: string;
  textSection: string | null;
  textSchemaSection?: string | null;
  hasAutoResizeAlignment: boolean;
  headerAction?: React.ReactNode;
  structureControls?: React.ReactNode;
  tailContent?: React.ReactNode;
  renderStyleSectionEditor: (params: {
    title: string;
    section: string;
    schemaSection?: string;
  }) => React.ReactNode;
  renderAutoResizeAlignmentEditor: (params: {
    title: string;
    wrapperSection: string;
    textSection: string;
  }) => React.ReactNode;
  onChangeLabel: (value: string) => void;
  onChangeColorKey: (value: V2TemplateColorKey) => void;
  onChangeFontKey: (value: V2TemplateColorKey) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
  onMouseEnterVisibility: () => void;
  onMouseLeaveVisibility: () => void;
  onClickVisibility: () => void;
  onSelectBinding: (value: string) => void;
  onChangeLiteral: (value: string) => void;
  onChangeEntrySelectorIndex: (index: number) => void;
  onChangeDraftKey: (value: string) => void;
  onChangeDraftScope: (scope: V2TemplateFieldScope) => void;
  onCreateField: () => void;
}

const TemplateBoundTextNodePropertiesPanel: React.FC<
  TemplateBoundTextNodePropertiesPanelProps
> = ({
  heading,
  label,
  colorKey,
  fontKey,
  visibilityMode,
  binding,
  bindingSelectValue,
  fields,
  computedOptions,
  scopeOptions,
  newFieldDraft,
  fieldBindingExists,
  colorKeys,
  visibilityOptions,
  containerSection,
  containerSchemaSection,
  wrapperSection,
  wrapperSchemaSection,
  alignmentWrapperSection,
  textSection,
  textSchemaSection,
  hasAutoResizeAlignment,
  headerAction,
  structureControls,
  tailContent,
  renderStyleSectionEditor,
  renderAutoResizeAlignmentEditor,
  onChangeLabel,
  onChangeColorKey,
  onChangeFontKey,
  onChangeVisibilityMode,
  onMouseEnterVisibility,
  onMouseLeaveVisibility,
  onClickVisibility,
  onSelectBinding,
  onChangeLiteral,
  onChangeEntrySelectorIndex,
  onChangeDraftKey,
  onChangeDraftScope,
  onCreateField,
}) => {
  return (
    <TemplateTextNodePropertiesSection
      heading={heading}
      headerAction={headerAction}
      structureControls={structureControls}
      label={label}
      colorKey={colorKey}
      fontKey={fontKey}
      visibilityMode={visibilityMode}
      binding={binding}
      bindingSelectValue={bindingSelectValue}
      fields={fields}
      computedOptions={computedOptions}
      scopeOptions={scopeOptions}
      newFieldDraft={newFieldDraft}
      fieldBindingExists={fieldBindingExists}
      colorKeys={colorKeys}
      visibilityOptions={visibilityOptions}
      containerStyleEditor={renderStyleSectionEditor({
        title: "container style",
        section: containerSection,
        schemaSection: containerSchemaSection,
      })}
      wrapperStyleEditor={
        wrapperSection && wrapperSection !== containerSection
          ? renderStyleSectionEditor({
              title: "wrapper > style",
              section: wrapperSection,
              schemaSection: wrapperSchemaSection ?? containerSchemaSection,
            })
          : null
      }
      alignmentEditor={
        hasAutoResizeAlignment && textSection
          ? renderAutoResizeAlignmentEditor({
              title: "content > alignment",
              wrapperSection: alignmentWrapperSection,
              textSection,
            })
          : null
      }
      textStyleEditor={
        textSection
          ? renderStyleSectionEditor({
              title: "content > style",
              section: textSection,
              schemaSection: textSchemaSection ?? containerSchemaSection,
            })
          : null
      }
      tailContent={tailContent}
      onChangeLabel={onChangeLabel}
      onChangeColorKey={onChangeColorKey}
      onChangeFontKey={onChangeFontKey}
      onChangeVisibilityMode={onChangeVisibilityMode}
      onMouseEnterVisibility={onMouseEnterVisibility}
      onMouseLeaveVisibility={onMouseLeaveVisibility}
      onClickVisibility={onClickVisibility}
      onSelectBinding={onSelectBinding}
      onChangeLiteral={onChangeLiteral}
      onChangeEntrySelectorIndex={onChangeEntrySelectorIndex}
      onChangeDraftKey={onChangeDraftKey}
      onChangeDraftScope={onChangeDraftScope}
      onCreateField={onCreateField}
    />
  );
};

export default TemplateBoundTextNodePropertiesPanel;
