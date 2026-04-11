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
import TemplateNodeBindingEditor from "./template-node-binding-editor";
import TemplateNodeMetaEditor from "./template-node-meta-editor";

interface TemplateTextNodePropertiesSectionProps {
  heading: string;
  headerAction?: React.ReactNode;
  structureControls?: React.ReactNode;
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
  containerStyleEditor: React.ReactNode;
  wrapperStyleEditor?: React.ReactNode;
  alignmentEditor?: React.ReactNode;
  textStyleEditor?: React.ReactNode;
  tailContent?: React.ReactNode;
  onChangeLabel: (value: string) => void;
  onChangeColorKey: (value: V2TemplateColorKey) => void;
  onChangeFontKey: (value: V2TemplateColorKey) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
  onMouseEnterVisibility?: () => void;
  onMouseLeaveVisibility?: () => void;
  onClickVisibility?: () => void;
  onSelectBinding: (value: string) => void;
  onChangeLiteral: (value: string) => void;
  onChangeEntrySelectorIndex: (index: number) => void;
  onChangeDraftKey: (value: string) => void;
  onChangeDraftScope: (scope: V2TemplateFieldScope) => void;
  onCreateField: () => void;
}

const TemplateTextNodePropertiesSection: React.FC<
  TemplateTextNodePropertiesSectionProps
> = ({
  heading,
  headerAction,
  structureControls,
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
  containerStyleEditor,
  wrapperStyleEditor,
  alignmentEditor,
  textStyleEditor,
  tailContent,
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
    <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-sm text-gray-200">{heading}</h4>
        {headerAction}
      </div>
      {structureControls}
      <TemplateNodeMetaEditor
        label={label}
        colorKey={colorKey}
        fontKey={fontKey}
        visibilityMode={visibilityMode}
        colorKeys={colorKeys}
        visibilityOptions={visibilityOptions}
        onChangeLabel={onChangeLabel}
        onChangeColorKey={onChangeColorKey}
        onChangeFontKey={onChangeFontKey}
        onChangeVisibilityMode={onChangeVisibilityMode}
        onMouseEnterVisibility={onMouseEnterVisibility}
        onMouseLeaveVisibility={onMouseLeaveVisibility}
        onClickVisibility={onClickVisibility}
      />
      <TemplateNodeBindingEditor
        binding={binding}
        bindingSelectValue={bindingSelectValue}
        fields={fields}
        computedOptions={computedOptions}
        scopeOptions={scopeOptions}
        newFieldDraft={newFieldDraft}
        fieldBindingExists={fieldBindingExists}
        onSelectBinding={onSelectBinding}
        onChangeLiteral={onChangeLiteral}
        onChangeEntrySelectorIndex={onChangeEntrySelectorIndex}
        onChangeDraftKey={onChangeDraftKey}
        onChangeDraftScope={onChangeDraftScope}
        onCreateField={onCreateField}
      />
      {containerStyleEditor}
      {wrapperStyleEditor}
      {alignmentEditor}
      {textStyleEditor}
      {tailContent}
    </div>
  );
};

export default TemplateTextNodePropertiesSection;
