"use client";

import React from "react";

import {
  V2TemplateAssetRef,
  V2TemplateBuiltinAssetKey,
  V2TemplateCardNode,
  V2TemplateCardNodeBinding,
  V2TemplateColorKey,
  V2TemplateComputedBindingKey,
  V2TemplateDayKey,
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
import {
  v2_resolveCardStyleSection,
  v2_resolveTextNodeSections,
} from "../model/style-section-utils";
import TemplateCardAutoResizeOptions from "../components/template-card-auto-resize-options";
import TemplateBoundTextNodePropertiesPanel from "../components/template-bound-text-node-properties-panel";

type V2StyleSectionId = string;

interface UseTemplateBoundTextNodePropertyPanelsParams {
  renderConfig: V2TemplateRenderConfig;
  styleKeyToSectionMap: Partial<Record<string, string>>;
  fixedCardNodeIds: Set<string>;
  colorKeys: readonly V2TemplateColorKey[];
  computedOptions: readonly V2TemplateComputedBindingKey[];
  scopeOptions: Array<{ value: V2TemplateFieldScope; label: string }>;
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  assetKeys: V2TemplateBuiltinAssetKey[];
  assetLabels: Record<V2TemplateBuiltinAssetKey, string>;
  extraAssetKeys: string[];
  dayKeyOptions: Array<{ value: V2TemplateDayKey; label: string }>;
  newFieldDraftByNodeId: Record<string, V2NodeNewFieldDraft>;
  renderStyleSectionEditor: (params: {
    title: string;
    section: V2StyleSectionId;
    schemaSection?: V2StyleSectionId;
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
  onRemoveCardNode: (nodeId: string) => void;
  onUpdateCardNodeMeta: (params: {
    nodeId: string;
    label?: string;
    colorKey?: V2TemplateColorKey;
    fontKey?: V2TemplateColorKey;
  }) => void;
  onUpdateCardImageNodeAssetRef: (params: {
    nodeId: string;
    assetRef: V2TemplateAssetRef | null;
  }) => void;
  onUpdateCardImageNodeAssetRefByDayKey: (params: {
    nodeId: string;
    dayKey: V2TemplateDayKey;
    assetRef: V2TemplateAssetRef | null;
  }) => void;
  onUpdateCardImageNodeFit: (params: {
    nodeId: string;
    fit: "cover" | "contain" | "fill";
  }) => void;
  onUpdateCardImageNodeAlt: (params: { nodeId: string; alt: string }) => void;
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
  assetKeys,
  assetLabels,
  extraAssetKeys,
  dayKeyOptions,
  newFieldDraftByNodeId,
  renderStyleSectionEditor,
  renderAutoResizeAlignmentEditor,
  renderSceneNodeStructureControls,
  parseBindingFromSelectValue,
  onSetSectionHoverHighlight,
  onClearSectionHoverHighlight,
  onSetSectionActiveHighlight,
  onUpdateCardOptions,
  onRemoveCardNode,
  onUpdateCardNodeMeta,
  onUpdateCardImageNodeAssetRef,
  onUpdateCardImageNodeAssetRefByDayKey,
  onUpdateCardImageNodeFit,
  onUpdateCardImageNodeAlt,
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
    const multiline =
      typeof options?.multiline === "boolean"
        ? options.multiline
        : options?.multiline === undefined
          ? true
          : String(options.multiline).toLowerCase() === "true";

    return (
      <TemplateCardAutoResizeOptions
        multiline={multiline}
        onHoverContainer={() => onSetSectionHoverHighlight(containerSection)}
        onLeaveContainer={onClearSectionHoverHighlight}
        onActivateContainer={() => onSetSectionActiveHighlight(containerSection)}
        onChangeMultiline={(value) =>
          onUpdateCardOptions(node.optionsKey!, {
            multiline: value,
          })
        }
      />
    );
  };

  const v2_toAssetSelectValue = (assetRef: V2TemplateAssetRef | undefined): string => {
    if (!assetRef) return "__none__";
    return assetRef.source === "extra"
      ? `extra:${assetRef.key}`
      : `builtin:${assetRef.key}`;
  };

  const v2_fromAssetSelectValue = (rawValue: string): V2TemplateAssetRef | null => {
    if (rawValue === "__none__") return null;
    if (rawValue.startsWith("extra:")) {
      const key = rawValue.slice("extra:".length).trim();
      if (!key) return null;
      return {
        source: "extra",
        key,
      };
    }
    const key = rawValue.replace(/^builtin:/, "") as V2TemplateBuiltinAssetKey;
    return {
      source: "builtin",
      key,
    };
  };

  const renderCardNodeProperties = (
    section: V2StyleSectionId,
    node: V2TemplateCardNode
  ) => {
    if (node.kind === "image") {
      const containerSection = v2_resolveCardStyleSection(
        node.containerStyleKey,
        section,
        styleKeyToSectionMap
      );
      const isRemovable = !fixedCardNodeIds.has(node.id);
      const selectedAssetValue = v2_toAssetSelectValue(node.assetRef);
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
        <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm text-gray-200">
              Card / {node.label}
            </h4>
            {headerAction}
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <label className="text-xs text-gray-400">오브젝트 이름</label>
            <input
              value={node.label}
              onChange={(event) =>
                onUpdateCardNodeMeta({
                  nodeId: node.id,
                  label: event.target.value,
                })
              }
              className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            />
            <label className="text-xs text-gray-400">기본 에셋</label>
            <select
              value={selectedAssetValue}
              onChange={(event) =>
                onUpdateCardImageNodeAssetRef({
                  nodeId: node.id,
                  assetRef: v2_fromAssetSelectValue(event.target.value),
                })
              }
              className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            >
              <option value="__none__">선택 안함</option>
              <optgroup label="Built-in">
                {assetKeys.map((assetKey) => (
                  <option key={`card-image-asset-${assetKey}`} value={`builtin:${assetKey}`}>
                    {assetLabels[assetKey]}
                  </option>
                ))}
              </optgroup>
              {extraAssetKeys.length > 0 ? (
                <optgroup label="추가 요소">
                  {extraAssetKeys.map((assetKey) => (
                    <option
                      key={`card-image-extra-asset-${assetKey}`}
                      value={`extra:${assetKey}`}
                    >
                      {assetKey}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <label className="text-xs text-gray-400">표시 조건</label>
            <select
              value={node.visibilityMode ?? "always"}
              onChange={(event) =>
                onUpdateCardNodeVisibilityMode(
                  node.id,
                  event.target.value as V2TemplateVisibilityMode
                )
              }
              className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            >
              {visibilityOptions.map((option) => (
                <option key={`card-image-visible-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className="text-xs text-gray-400">fit</label>
            <select
              value={node.fit ?? "cover"}
              onChange={(event) =>
                onUpdateCardImageNodeFit({
                  nodeId: node.id,
                  fit: event.target.value as "cover" | "contain" | "fill",
                })
              }
              className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            >
              <option value="cover">cover</option>
              <option value="contain">contain</option>
              <option value="fill">fill</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <label className="text-xs text-gray-400">alt</label>
            <input
              value={node.alt ?? ""}
              onChange={(event) =>
                onUpdateCardImageNodeAlt({
                  nodeId: node.id,
                  alt: event.target.value,
                })
              }
              className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
              placeholder="이미지 alt 텍스트"
            />
            <label className="text-xs text-gray-400">style key</label>
            <div className="px-2 py-2 rounded border border-[#3a3d44] bg-[#121418] text-xs text-gray-300">
              {node.containerStyleKey}
            </div>
          </div>
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-300">
              요일별 에셋 오버라이드
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {dayKeyOptions.map((option) => {
                const dayAssetRef = node.assetRefByDayKey?.[option.value];
                return (
                  <React.Fragment key={`card-image-day-asset-${option.value}`}>
                    <label className="text-xs text-gray-400">{option.label}</label>
                    <select
                      value={v2_toAssetSelectValue(dayAssetRef)}
                      onChange={(event) =>
                        onUpdateCardImageNodeAssetRefByDayKey({
                          nodeId: node.id,
                          dayKey: option.value,
                          assetRef: v2_fromAssetSelectValue(event.target.value),
                        })
                      }
                      className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
                    >
                      <option value="__none__">기본 에셋 사용</option>
                      <optgroup label="Built-in">
                        {assetKeys.map((assetKey) => (
                          <option
                            key={`card-image-day-asset-${option.value}-${assetKey}`}
                            value={`builtin:${assetKey}`}
                          >
                            {assetLabels[assetKey]}
                          </option>
                        ))}
                      </optgroup>
                      {extraAssetKeys.length > 0 ? (
                        <optgroup label="추가 요소">
                          {extraAssetKeys.map((assetKey) => (
                            <option
                              key={`card-image-day-extra-asset-${option.value}-${assetKey}`}
                              value={`extra:${assetKey}`}
                            >
                              {assetKey}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          {renderStyleSectionEditor({
            title: `${node.label}.ContainerStyle`,
            section: node.containerStyleKey,
            schemaSection: containerSection,
          })}
        </div>
      );
    }

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
        containerSection={node.containerStyleKey}
        containerSchemaSection={containerSection}
        wrapperSection={node.wrapperStyleKey ?? null}
        wrapperSchemaSection={wrapperSection}
        alignmentWrapperSection={node.wrapperStyleKey ?? node.containerStyleKey}
        textSection={node.textStyleKey ?? null}
        textSchemaSection={textSection}
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
        onChangeEntrySelectorIndex={(index) => {
          if (node.binding.mode !== "field" || node.binding.scope !== "entry") {
            return;
          }
          onUpdateCardNodeBinding(node.id, {
            ...node.binding,
            entrySelector: {
              mode: "index",
              index: Math.max(0, Math.floor(index)),
            },
          });
        }}
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
        containerSection={node.containerStyleKey}
        containerSchemaSection={containerSection}
        wrapperSection={node.wrapperStyleKey ?? null}
        wrapperSchemaSection={wrapperSection}
        alignmentWrapperSection={node.wrapperStyleKey ?? node.containerStyleKey}
        textSection={node.textStyleKey ?? null}
        textSchemaSection={textSection}
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
        onChangeEntrySelectorIndex={(index) => {
          if (node.binding.mode !== "field" || node.binding.scope !== "entry") {
            return;
          }
          onUpdateSceneTextNodeBinding(node.id, {
            ...node.binding,
            entrySelector: {
              mode: "index",
              index: Math.max(0, Math.floor(index)),
            },
          });
        }}
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
