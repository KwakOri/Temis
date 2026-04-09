"use client";

import React from "react";

import {
  V2TemplateCardNode,
  V2TemplateCardNodeBinding,
  V2TemplateColorKey,
  V2TemplateComputedBindingKey,
  V2TemplateFieldScope,
  V2TemplateRenderConfig,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import {
  v2_getNodeBindingSelectValue,
  v2_getNodeNewFieldDraft,
  v2_hasNodeBindingField,
  type V2NodeNewFieldDraft,
} from "../model/binding-utils";
import { v2_resolveTextNodeSections } from "../model/style-section-utils";
import TemplateCardAutoResizeOptions from "../components/template-card-auto-resize-options";
import TemplateBoundTextNodePropertiesPanel from "../components/template-bound-text-node-properties-panel";
import { v2_isEntryFieldBindingKey } from "@/utils/time-table/template-render-config";

type V2StyleSectionId = string;

interface UseTemplateBoundTextNodePropertyPanelsParams {
  renderConfig: V2TemplateRenderConfig;
  styleKeyToSectionMap: Partial<Record<string, string>>;
  fixedCardNodeIds: Set<string>;
  colorKeys: readonly V2TemplateColorKey[];
  computedOptions: readonly V2TemplateComputedBindingKey[];
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  newFieldDraftByNodeId: Record<string, V2NodeNewFieldDraft>;
  renderStyleSectionEditor: (params: {
    title: string;
    section: V2StyleSectionId;
  }) => React.ReactNode;
  renderAutoResizeAlignmentEditor: (params: {
    title: string;
    wrapperSection: V2StyleSectionId;
    textSection: V2StyleSectionId;
  }) => React.ReactNode;
  renderSceneNodeStructureControls: (params: {
    node: V2TemplateSceneTextNode;
    allowChildren: boolean;
  }) => React.ReactNode;
  parseBindingFromSelectValue: (
    value: string,
    currentBinding: V2TemplateCardNodeBinding
  ) => V2TemplateCardNodeBinding | null;
  onSetSectionHoverHighlight: (section: V2StyleSectionId) => void;
  onClearSectionHoverHighlight: () => void;
  onSetSectionActiveHighlight: (section: V2StyleSectionId) => void;
  onUpdateCardOptions: (
    optionsKey: string,
    patch: Partial<{ maxFontSize: number; multiline: boolean }>
  ) => void;
  onUpdateMaxFontSize: (
    key: keyof V2TemplateRenderConfig["maxFontSizes"],
    value: number
  ) => void;
  onRemoveCardNode: (nodeId: string) => void;
  onUpdateCardNodeMeta: (params: {
    nodeId: string;
    label?: string;
    colorKey?: V2TemplateColorKey;
    fontKey?: V2TemplateColorKey;
  }) => void;
  onUpdateCardNodeVisibilityMode: (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => void;
  onUpdateCardNodeBinding: (
    nodeId: string,
    binding: V2TemplateCardNodeBinding
  ) => void;
  onUpdateNodeNewFieldDraft: (
    nodeId: string,
    patch: Partial<V2NodeNewFieldDraft>
  ) => void;
  onCreateFieldForCardNodeBinding: (node: V2TemplateCardNode) => void;
  onUpdateSceneTextNodeMeta: (params: {
    nodeId: string;
    label?: string;
    colorKey?: V2TemplateColorKey;
    fontKey?: V2TemplateColorKey;
  }) => void;
  onUpdateSceneTextNodeVisibilityMode: (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => void;
  onUpdateSceneTextNodeBinding: (
    nodeId: string,
    binding: V2TemplateCardNodeBinding
  ) => void;
  onCreateFieldForSceneNodeBinding: (node: V2TemplateSceneTextNode) => void;
}

const useTemplateBoundTextNodePropertyPanels = ({
  renderConfig,
  styleKeyToSectionMap,
  fixedCardNodeIds,
  colorKeys,
  computedOptions,
  scopeOptions,
  visibilityOptions,
  newFieldDraftByNodeId,
  renderStyleSectionEditor,
  renderAutoResizeAlignmentEditor,
  renderSceneNodeStructureControls,
  parseBindingFromSelectValue,
  onSetSectionHoverHighlight,
  onClearSectionHoverHighlight,
  onSetSectionActiveHighlight,
  onUpdateCardOptions,
  onUpdateMaxFontSize,
  onRemoveCardNode,
  onUpdateCardNodeMeta,
  onUpdateCardNodeVisibilityMode,
  onUpdateCardNodeBinding,
  onUpdateNodeNewFieldDraft,
  onCreateFieldForCardNodeBinding,
  onUpdateSceneTextNodeMeta,
  onUpdateSceneTextNodeVisibilityMode,
  onUpdateSceneTextNodeBinding,
  onCreateFieldForSceneNodeBinding,
}: UseTemplateBoundTextNodePropertyPanelsParams) => {
  const renderCardNodeAutoResizeOptions = ({
    node,
    containerSection,
  }: {
    node: V2TemplateCardNode;
    containerSection: V2StyleSectionId;
  }) => {
    if (!node.optionsKey) return null;

    const options = renderConfig.layout.card[node.optionsKey];
    const maxFontSizeFallback = v2_isEntryFieldBindingKey(node.binding, "subTitle")
      ? renderConfig.maxFontSizes.SUB_TITLE
      : renderConfig.maxFontSizes.MAIN_TITLE;
    const maxFontSizeCandidate = Number(options?.maxFontSize);
    const maxFontSize =
      Number.isFinite(maxFontSizeCandidate) && maxFontSizeCandidate > 0
        ? maxFontSizeCandidate
        : maxFontSizeFallback;
    const multiline =
      typeof options?.multiline === "boolean"
        ? options.multiline
        : options?.multiline === undefined
          ? true
          : String(options.multiline).toLowerCase() === "true";

    return (
      <TemplateCardAutoResizeOptions
        maxFontSize={maxFontSize}
        multiline={multiline}
        onHoverContainer={() => onSetSectionHoverHighlight(containerSection)}
        onLeaveContainer={onClearSectionHoverHighlight}
        onActivateContainer={() => onSetSectionActiveHighlight(containerSection)}
        onChangeMaxFontSize={(value) => {
          onUpdateCardOptions(node.optionsKey!, { maxFontSize: value });
          if (v2_isEntryFieldBindingKey(node.binding, "mainTitle")) {
            onUpdateMaxFontSize("MAIN_TITLE", value);
          }
          if (v2_isEntryFieldBindingKey(node.binding, "subTitle")) {
            onUpdateMaxFontSize("SUB_TITLE", value);
          }
        }}
        onChangeMultiline={(value) =>
          onUpdateCardOptions(node.optionsKey!, {
            multiline: value,
          })
        }
      />
    );
  };

  const renderCardNodeProperties = (
    section: V2StyleSectionId,
    node: V2TemplateCardNode
  ) => {
    const {
      containerSection,
      textSection,
      wrapperSection,
      alignmentWrapperSection,
      hasAutoResizeAlignment,
    } = v2_resolveTextNodeSections({
      containerStyleKey: node.containerStyleKey,
      textStyleKey: node.textStyleKey,
      wrapperStyleKey: node.wrapperStyleKey,
      fallbackSection: section,
      styleKeyToSectionMap,
      isFlexibleText: node.kind === "flexibleText",
    });
    const isRemovable = !fixedCardNodeIds.has(node.id);
    const bindingSelectValue = v2_getNodeBindingSelectValue(node.binding);
    const fieldBindingExists = v2_hasNodeBindingField(
      node.binding,
      renderConfig.formSchema.fields
    );
    const newFieldDraft = v2_getNodeNewFieldDraft(newFieldDraftByNodeId, node.id);

    const headerAction = isRemovable ? (
      <button
        type="button"
        onClick={() => onRemoveCardNode(node.id)}
        className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
      >
        오브젝트 삭제
      </button>
    ) : null;

    return (
      <TemplateBoundTextNodePropertiesPanel
        heading={`Card / ${node.label}`}
        headerAction={headerAction}
        label={node.label}
        colorKey={node.colorKey}
        fontKey={node.fontKey}
        visibilityMode={node.visibilityMode ?? "always"}
        binding={node.binding}
        bindingSelectValue={bindingSelectValue}
        fields={renderConfig.formSchema.fields}
        computedOptions={computedOptions}
        scopeOptions={scopeOptions}
        newFieldDraft={newFieldDraft}
        fieldBindingExists={fieldBindingExists}
        colorKeys={colorKeys}
        visibilityOptions={visibilityOptions}
        containerSection={containerSection}
        wrapperSection={wrapperSection}
        alignmentWrapperSection={alignmentWrapperSection}
        textSection={textSection}
        hasAutoResizeAlignment={hasAutoResizeAlignment}
        tailContent={
          node.kind === "flexibleText"
            ? renderCardNodeAutoResizeOptions({
                node,
                containerSection,
              })
            : null
        }
        renderStyleSectionEditor={renderStyleSectionEditor}
        renderAutoResizeAlignmentEditor={renderAutoResizeAlignmentEditor}
        onChangeLabel={(value) =>
          onUpdateCardNodeMeta({
            nodeId: node.id,
            label: value,
          })
        }
        onChangeColorKey={(value) =>
          onUpdateCardNodeMeta({
            nodeId: node.id,
            colorKey: value,
          })
        }
        onChangeFontKey={(value) =>
          onUpdateCardNodeMeta({
            nodeId: node.id,
            fontKey: value,
          })
        }
        onChangeVisibilityMode={(value) =>
          onUpdateCardNodeVisibilityMode(node.id, value)
        }
        onMouseEnterVisibility={() => onSetSectionHoverHighlight(containerSection)}
        onMouseLeaveVisibility={onClearSectionHoverHighlight}
        onClickVisibility={() => onSetSectionActiveHighlight(containerSection)}
        onSelectBinding={(value) => {
          const nextBinding = parseBindingFromSelectValue(value, node.binding);
          if (!nextBinding) return;
          onUpdateCardNodeBinding(node.id, nextBinding);
        }}
        onChangeLiteral={(value) =>
          onUpdateCardNodeBinding(node.id, {
            mode: "literal",
            value,
          })
        }
        onChangeDraftKey={(value) => onUpdateNodeNewFieldDraft(node.id, { key: value })}
        onChangeDraftScope={(scope) =>
          onUpdateNodeNewFieldDraft(node.id, { scope })
        }
        onCreateField={() => onCreateFieldForCardNodeBinding(node)}
      />
    );
  };

  const renderSceneTextNodeProperties = (
    section: V2StyleSectionId,
    node: V2TemplateSceneTextNode
  ) => {
    const {
      containerSection,
      textSection,
      wrapperSection,
      alignmentWrapperSection,
      hasAutoResizeAlignment,
    } = v2_resolveTextNodeSections({
      containerStyleKey: node.containerStyleKey,
      textStyleKey: node.textStyleKey,
      wrapperStyleKey: node.wrapperStyleKey,
      fallbackSection: section,
      styleKeyToSectionMap,
      isFlexibleText: node.kind === "flexibleText",
    });
    const bindingSelectValue = v2_getNodeBindingSelectValue(node.binding);
    const fieldBindingExists = v2_hasNodeBindingField(
      node.binding,
      renderConfig.formSchema.fields
    );
    const newFieldDraft = v2_getNodeNewFieldDraft(newFieldDraftByNodeId, node.id);

    return (
      <TemplateBoundTextNodePropertiesPanel
        heading={`Scene / ${node.label}`}
        structureControls={renderSceneNodeStructureControls({
          node,
          allowChildren: false,
        })}
        label={node.label}
        colorKey={node.colorKey}
        fontKey={node.fontKey}
        visibilityMode={node.visibilityMode ?? "always"}
        binding={node.binding}
        bindingSelectValue={bindingSelectValue}
        fields={renderConfig.formSchema.fields}
        computedOptions={computedOptions}
        scopeOptions={scopeOptions}
        newFieldDraft={newFieldDraft}
        fieldBindingExists={fieldBindingExists}
        colorKeys={colorKeys}
        visibilityOptions={visibilityOptions}
        containerSection={containerSection}
        wrapperSection={wrapperSection}
        alignmentWrapperSection={alignmentWrapperSection}
        textSection={textSection}
        hasAutoResizeAlignment={hasAutoResizeAlignment}
        renderStyleSectionEditor={renderStyleSectionEditor}
        renderAutoResizeAlignmentEditor={renderAutoResizeAlignmentEditor}
        onChangeLabel={(value) =>
          onUpdateSceneTextNodeMeta({
            nodeId: node.id,
            label: value,
          })
        }
        onChangeColorKey={(value) =>
          onUpdateSceneTextNodeMeta({
            nodeId: node.id,
            colorKey: value,
          })
        }
        onChangeFontKey={(value) =>
          onUpdateSceneTextNodeMeta({
            nodeId: node.id,
            fontKey: value,
          })
        }
        onChangeVisibilityMode={(value) =>
          onUpdateSceneTextNodeVisibilityMode(node.id, value)
        }
        onMouseEnterVisibility={() => onSetSectionHoverHighlight(containerSection)}
        onMouseLeaveVisibility={onClearSectionHoverHighlight}
        onClickVisibility={() => onSetSectionActiveHighlight(containerSection)}
        onSelectBinding={(value) => {
          const nextBinding = parseBindingFromSelectValue(value, node.binding);
          if (!nextBinding) return;
          onUpdateSceneTextNodeBinding(node.id, nextBinding);
        }}
        onChangeLiteral={(value) =>
          onUpdateSceneTextNodeBinding(node.id, {
            mode: "literal",
            value,
          })
        }
        onChangeDraftKey={(value) => onUpdateNodeNewFieldDraft(node.id, { key: value })}
        onChangeDraftScope={(scope) =>
          onUpdateNodeNewFieldDraft(node.id, { scope })
        }
        onCreateField={() => onCreateFieldForSceneNodeBinding(node)}
      />
    );
  };

  return {
    renderCardNodeProperties,
    renderSceneTextNodeProperties,
  };
};

export default useTemplateBoundTextNodePropertyPanels;
