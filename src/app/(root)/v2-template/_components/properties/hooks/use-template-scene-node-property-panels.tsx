"use client";

import React from "react";

import {
  V2TemplateCardNode,
  V2TemplateCardNodeBinding,
  V2TemplateComputedBindingKey,
  v2_TEMPLATE_DAY_KEYS,
  V2TemplateAssetRef,
  V2TemplateSceneAssetRole,
  V2TemplateBuiltinAssetKey,
  V2TemplateDayKey,
  V2TemplateFormField,
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneComponentInstanceNode,
  V2TemplateSceneGroupNode,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import TemplateSceneAssetProperties from "../components/template-scene-asset-properties";
import TemplateBindingPicker from "../components/template-binding-picker";
import TemplateSceneCardCollectionProperties from "../components/template-scene-card-collection-properties";
import TemplateSceneGroupProperties from "../components/template-scene-group-properties";
import TemplateSceneNodeStructureControls from "../components/template-scene-node-structure-controls";
import {
  v2_getNodeBindingSelectValue,
  v2_hasNodeBindingField,
} from "../model/binding-utils";
import { v2_parseStyleSectionKey } from "../model/style-section-utils";

type V2SceneNodeSectionId = string;

type V2StructureControlNode =
  | V2TemplateSceneTextNode
  | V2TemplateSceneAssetNode
  | V2TemplateSceneGroupNode
  | V2TemplateSceneCardCollectionNode
  | V2TemplateSceneComponentInstanceNode;

interface UseTemplateSceneNodePropertyPanelsParams {
  assetKeys: V2TemplateBuiltinAssetKey[];
  assetLabels: Record<V2TemplateBuiltinAssetKey, string>;
  extraAssetKeys: string[];
  sceneCardCollectionComponentOptions: Array<{ value: string; label: string }>;
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  isSceneCustomNode: (nodeId: string) => boolean;
  renderStyleSectionEditor: ({
    title,
    section,
  }: {
    title: string;
    section: V2SceneNodeSectionId;
  }) => React.ReactNode;
  onMoveSceneNode: (params: { nodeId: string; direction: "up" | "down" }) => void;
  onRelocateSceneNode: (params: {
    nodeId: string;
    targetParentId: string | null;
  }) => void;
  getSceneNodeParentId: (nodeId: string) => string | null;
  getSceneGroupParentOptions: (
    nodeId: string
  ) => Array<{ value: string | null; label: string }>;
  onRemoveSceneNode: (nodeId: string) => void;
  onUpdateSceneNodeLabel: (nodeId: string, label: string) => void;
  onUpdateSceneAssetNodeMeta: (params: {
    nodeId: string;
    assetRef?: V2TemplateAssetRef | null;
    assetRole?: V2TemplateSceneAssetRole | null;
    fit?: V2TemplateSceneAssetNode["fit"];
    alt?: string;
  }) => void;
  onUpdateSceneNodeVisibilityMode: (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => void;
  onUpdateSceneCardCollectionComponentId: (
    nodeId: string,
    componentId: string
  ) => void;
  onSyncSceneCardCollectionChildComponentIds: (nodeId: string) => void;
  formFields: V2TemplateFormField[];
  computedOptions: readonly V2TemplateComputedBindingKey[];
  parseBindingFromSelectValue: (
    value: string,
    currentBinding: V2TemplateCardNodeBinding
  ) => V2TemplateCardNodeBinding | null;
  getComponentBindableNodes: (componentId: string) => V2TemplateCardNode[];
  dayKeyOptions: Array<{ value: V2TemplateDayKey; label: string }>;
  onUpdateSceneComponentInstanceDayKey: (
    nodeId: string,
    dayKey: V2TemplateDayKey
  ) => void;
  onUpdateSceneComponentInstanceInstanceId: (
    nodeId: string,
    instanceId: string
  ) => void;
  onUpdateSceneComponentInstanceComponentId: (
    nodeId: string,
    componentId: string
  ) => void;
  onUpdateSceneComponentInstanceBindingOverride: (params: {
    nodeId: string;
    cardNodeId: string;
    binding: V2TemplateCardNodeBinding;
  }) => void;
  onRemoveSceneComponentInstanceBindingOverride: (params: {
    nodeId: string;
    cardNodeId: string;
  }) => void;
  onExtractSceneComponentInstanceCopy: (params: {
    nodeId: string;
    targetParentId?: string | null;
    targetIndex?: number;
  }) => void;
  onMoveSceneComponentInstanceToRoot: (nodeId: string) => void;
}

const v2_isSameBinding = (
  left: V2TemplateCardNodeBinding,
  right: V2TemplateCardNodeBinding
): boolean => {
  if (left.mode !== right.mode) return false;
  if (left.mode === "field" && right.mode === "field") {
    const leftEntryIndex =
      left.scope === "entry" && left.entrySelector?.mode === "index"
        ? left.entrySelector.index
        : undefined;
    const rightEntryIndex =
      right.scope === "entry" && right.entrySelector?.mode === "index"
        ? right.entrySelector.index
        : undefined;
    return (
      left.scope === right.scope &&
      left.key === right.key &&
      leftEntryIndex === rightEntryIndex
    );
  }
  if (left.mode === "computed" && right.mode === "computed") {
    return left.key === right.key;
  }
  if (left.mode === "literal" && right.mode === "literal") {
    return left.value === right.value;
  }
  return false;
};

const v2_SCENE_COMPONENT_INSTANCE_ALLOW_BINDING_OVERRIDE = false;

const useTemplateSceneNodePropertyPanels = ({
  assetKeys,
  assetLabels,
  extraAssetKeys,
  sceneCardCollectionComponentOptions,
  visibilityOptions,
  isSceneCustomNode,
  renderStyleSectionEditor,
  onMoveSceneNode,
  onRelocateSceneNode,
  getSceneNodeParentId,
  getSceneGroupParentOptions,
  onRemoveSceneNode,
  onUpdateSceneNodeLabel,
  onUpdateSceneAssetNodeMeta,
  onUpdateSceneNodeVisibilityMode,
  onUpdateSceneCardCollectionComponentId,
  onSyncSceneCardCollectionChildComponentIds,
  formFields,
  computedOptions,
  parseBindingFromSelectValue,
  getComponentBindableNodes,
  dayKeyOptions,
  onUpdateSceneComponentInstanceDayKey,
  onUpdateSceneComponentInstanceInstanceId,
  onUpdateSceneComponentInstanceComponentId,
  onUpdateSceneComponentInstanceBindingOverride,
  onRemoveSceneComponentInstanceBindingOverride,
  onExtractSceneComponentInstanceCopy,
  onMoveSceneComponentInstanceToRoot,
}: UseTemplateSceneNodePropertyPanelsParams) => {
  const renderSceneNodeStructureControls = ({
    node,
  }: {
    node: V2StructureControlNode;
  }) => {
    const canDelete = isSceneCustomNode(node.id);

    return (
      <TemplateSceneNodeStructureControls
        nodeId={node.id}
        canDelete={canDelete}
        currentParentId={getSceneNodeParentId(node.id)}
        parentOptions={getSceneGroupParentOptions(node.id)}
        onMoveUp={() => onMoveSceneNode({ nodeId: node.id, direction: "up" })}
        onMoveDown={() =>
          onMoveSceneNode({ nodeId: node.id, direction: "down" })
        }
        onRelocate={(targetParentId) =>
          onRelocateSceneNode({
            nodeId: node.id,
            targetParentId,
          })
        }
        onDelete={() => onRemoveSceneNode(node.id)}
      />
    );
  };

  const renderSceneAssetNodeProperties = (
    node: V2TemplateSceneAssetNode,
    section: V2SceneNodeSectionId | null
  ) => {
    const styleSection = section ?? v2_parseStyleSectionKey(node.styleKey);
    const styleEditor = styleSection ? (
      renderStyleSectionEditor({
        title: "asset style",
        section: styleSection,
      })
    ) : (
      <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
        이 에셋 노드는 연결된 style section이 없습니다.
      </div>
    );

    return (
      <TemplateSceneAssetProperties
        node={node}
        assetKeys={assetKeys}
        assetLabels={assetLabels}
        extraAssetKeys={extraAssetKeys}
        visibilityOptions={visibilityOptions}
        structureControls={renderSceneNodeStructureControls({
          node,
        })}
        styleEditor={styleEditor}
        onChangeLabel={(value) => onUpdateSceneNodeLabel(node.id, value)}
        onChangeAssetRef={(value) =>
          onUpdateSceneAssetNodeMeta({
            nodeId: node.id,
            assetRef: value,
          })
        }
        onChangeAssetRole={(value) =>
          onUpdateSceneAssetNodeMeta({
            nodeId: node.id,
            assetRole: value,
          })
        }
        onChangeFit={(value) =>
          onUpdateSceneAssetNodeMeta({
            nodeId: node.id,
            fit: value,
          })
        }
        onChangeVisibilityMode={(value) =>
          onUpdateSceneNodeVisibilityMode(node.id, value)
        }
        onChangeAlt={(value) =>
          onUpdateSceneAssetNodeMeta({
            nodeId: node.id,
            alt: value,
          })
        }
      />
    );
  };

  const renderSceneGroupNodeProperties = (node: V2TemplateSceneGroupNode) => {
    const childCount = node.children.length;
    return (
      <TemplateSceneGroupProperties
        label={node.label}
        childCount={childCount}
        visibilityMode={node.visibilityMode ?? "always"}
        visibilityOptions={visibilityOptions}
        structureControls={renderSceneNodeStructureControls({
          node,
        })}
        onChangeLabel={(value) => onUpdateSceneNodeLabel(node.id, value)}
        onChangeVisibilityMode={(value) =>
          onUpdateSceneNodeVisibilityMode(node.id, value)
        }
      />
    );
  };

  const renderSceneCardCollectionProperties = (
    node: V2TemplateSceneCardCollectionNode,
    section: V2SceneNodeSectionId | null
  ) => {
    const layoutStyleEditor = section
      ? renderStyleSectionEditor({ title: "layout style", section })
      : null;
    const dayKeys = (node.children ?? []).map((child) => child.dayKey);
    const duplicateDayKeys = Array.from(
      new Set(
        dayKeys.filter(
          (dayKey, index) => dayKeys.indexOf(dayKey) !== index
        )
      )
    );
    const missingDayKeys = v2_TEMPLATE_DAY_KEYS.filter(
      (dayKey) => !dayKeys.includes(dayKey)
    );
    const mismatchedChildComponentCount =
      typeof node.componentId === "string" && node.componentId.length > 0
        ? (node.children ?? []).filter((child) => child.componentId !== node.componentId)
            .length
        : 0;

    return (
      <div className="space-y-2">
        <TemplateSceneCardCollectionProperties
          node={node}
          componentOptions={sceneCardCollectionComponentOptions}
          visibilityOptions={visibilityOptions}
          mismatchedChildComponentCount={mismatchedChildComponentCount}
          structureControls={renderSceneNodeStructureControls({
            node,
          })}
          layoutStyleEditor={layoutStyleEditor}
          onChangeLabel={(value) => onUpdateSceneNodeLabel(node.id, value)}
          onChangeComponentId={(value) =>
            onUpdateSceneCardCollectionComponentId(node.id, value)
          }
          onChangeVisibilityMode={(value) =>
            onUpdateSceneNodeVisibilityMode(node.id, value)
          }
          onSyncChildComponentIds={() =>
            onSyncSceneCardCollectionChildComponentIds(node.id)
          }
        />
        {duplicateDayKeys.length > 0 || missingDayKeys.length > 0 ? (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-100 space-y-1">
            {duplicateDayKeys.length > 0 ? (
              <p>
                중복 dayKey: {duplicateDayKeys.join(", ")}
              </p>
            ) : null}
            {missingDayKeys.length > 0 ? (
              <p>
                미할당 dayKey: {missingDayKeys.join(", ")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded border border-[#3b5b8b] bg-[#14233d] px-2.5 py-2 text-[11px] text-[#9ec1ff]">
            7개 dayKey가 모두 유효하게 매핑되었습니다.
          </div>
        )}
      </div>
    );
  };

  const renderSceneComponentInstanceProperties = (
    node: V2TemplateSceneComponentInstanceNode
  ) => {
    const selectedComponentId = sceneCardCollectionComponentOptions.some(
      (option) => option.value === node.componentId
    )
      ? node.componentId
      : "";
    const hasComponentOptions = sceneCardCollectionComponentOptions.length > 0;
    const bindableNodes =
      v2_SCENE_COMPONENT_INSTANCE_ALLOW_BINDING_OVERRIDE &&
      selectedComponentId.length > 0
        ? getComponentBindableNodes(selectedComponentId)
        : [];

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">
          Scene Component Instance / {node.label}
        </h4>
        {renderSceneNodeStructureControls({
          node,
        })}
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">오브젝트 이름</label>
          <input
            value={node.label}
            onChange={(event) => onUpdateSceneNodeLabel(node.id, event.target.value)}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          />
          <label className="text-xs text-gray-400">표시 조건</label>
          <select
            value={node.visibilityMode ?? "always"}
            onChange={(event) =>
              onUpdateSceneNodeVisibilityMode(
                node.id,
                event.target.value as V2TemplateVisibilityMode
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {visibilityOptions.map((option) => (
              <option key={`scene-component-instance-visible-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="text-xs text-gray-400">day key</label>
          <select
            value={node.dayKey}
            onChange={(event) =>
              onUpdateSceneComponentInstanceDayKey(
                node.id,
                event.target.value as V2TemplateDayKey
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {dayKeyOptions.map((option) => (
              <option key={`scene-component-instance-daykey-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
          <label className="text-xs text-gray-400">instance key</label>
          <input
            value={node.instanceId}
            onChange={(event) =>
              onUpdateSceneComponentInstanceInstanceId(
                node.id,
                event.target.value
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            placeholder="instance key"
          />
          <label className="text-xs text-gray-400">컴포넌트</label>
          <select
            value={selectedComponentId}
            onChange={(event) =>
              onUpdateSceneComponentInstanceComponentId(
                node.id,
                event.target.value
              )
            }
            disabled={!hasComponentOptions}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            <option value="" disabled>
              {hasComponentOptions
                ? "컴포넌트를 선택하세요"
                : "사용 가능한 컴포넌트가 없습니다"}
            </option>
            {sceneCardCollectionComponentOptions.map((option) => (
              <option
                key={`scene-component-instance-component-${option.value}`}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {selectedComponentId.length === 0 ? (
          <p className="text-xs text-amber-300">
            연결된 컴포넌트가 없어 인스턴스를 렌더할 수 없습니다.
          </p>
        ) : null}
        {v2_SCENE_COMPONENT_INSTANCE_ALLOW_BINDING_OVERRIDE &&
        selectedComponentId.length > 0 ? (
          <div className="rounded border border-[#334154] bg-[#141c28] p-2.5 space-y-2">
            <p className="text-[11px] font-semibold text-[#c3d7ff]">
              인스턴스 바인딩 오버라이드
            </p>
            <p className="text-[11px] text-[#8fa6cf]">
              아래 텍스트 오브젝트는 마스터 바인딩을 유지하며, 필요한 항목만
              인스턴스 단위로 덮어쓸 수 있습니다.
            </p>
            <div className="space-y-2">
              {bindableNodes.map((bindableNode) => {
                const overrideBinding = node.bindingOverrides?.[bindableNode.id];
                const effectiveBinding = overrideBinding ?? bindableNode.binding;
                const bindingSelectValue =
                  v2_getNodeBindingSelectValue(effectiveBinding);
                const fieldBindingExists = v2_hasNodeBindingField(
                  effectiveBinding,
                  formFields
                );
                const hasOverride = Boolean(overrideBinding);
                return (
                  <div
                    key={`component-instance-binding-${node.id}-${bindableNode.id}`}
                    className="rounded border border-[#2f3a4c] bg-[#101722] p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#d9e5ff]">
                        {bindableNode.label}
                      </span>
                      {hasOverride ? (
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveSceneComponentInstanceBindingOverride({
                              nodeId: node.id,
                              cardNodeId: bindableNode.id,
                            })
                          }
                          className="rounded border border-[#48608f] bg-[#1a2a45] px-1.5 py-0.5 text-[10px] font-semibold text-[#c3d7ff] hover:bg-[#22365a]"
                        >
                          override 해제
                        </button>
                      ) : null}
                    </div>
                    <TemplateBindingPicker
                      binding={effectiveBinding}
                      bindingSelectValue={bindingSelectValue}
                      fields={formFields}
                      computedOptions={computedOptions}
                      onSelectBinding={(value) => {
                        const nextBinding = parseBindingFromSelectValue(
                          value,
                          effectiveBinding
                        );
                        if (!nextBinding) return;
                        if (v2_isSameBinding(nextBinding, bindableNode.binding)) {
                          onRemoveSceneComponentInstanceBindingOverride({
                            nodeId: node.id,
                            cardNodeId: bindableNode.id,
                          });
                          return;
                        }
                        onUpdateSceneComponentInstanceBindingOverride({
                          nodeId: node.id,
                          cardNodeId: bindableNode.id,
                          binding: nextBinding,
                        });
                      }}
                      triggerClassName="w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-left text-xs text-gray-100 hover:bg-[#323640]"
                      modalTitle={`${bindableNode.label} 바인딩 선택`}
                      modalDescription="마스터 바인딩을 유지하거나 인스턴스 전용 오버라이드를 선택합니다."
                    />
                    {effectiveBinding.mode === "literal" ? (
                      <input
                        value={effectiveBinding.value}
                        onChange={(event) => {
                          const nextBinding: V2TemplateCardNodeBinding = {
                            mode: "literal",
                            value: event.target.value,
                          };
                          if (v2_isSameBinding(nextBinding, bindableNode.binding)) {
                            onRemoveSceneComponentInstanceBindingOverride({
                              nodeId: node.id,
                              cardNodeId: bindableNode.id,
                            });
                            return;
                          }
                          onUpdateSceneComponentInstanceBindingOverride({
                            nodeId: node.id,
                            cardNodeId: bindableNode.id,
                            binding: nextBinding,
                          });
                        }}
                        className="w-full px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                        placeholder="표시할 고정 텍스트"
                      />
                    ) : null}
                    {effectiveBinding.mode === "field" &&
                    effectiveBinding.scope === "entry" ? (
                      <div className="grid grid-cols-2 items-center gap-2">
                        <label className="text-[11px] text-[#8fa6cf]">Entry 인덱스</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={
                            effectiveBinding.entrySelector?.mode === "index"
                              ? effectiveBinding.entrySelector.index
                              : 0
                          }
                          onChange={(event) => {
                            const index = Math.max(
                              0,
                              Math.floor(Number(event.target.value || "0"))
                            );
                            const nextBinding: V2TemplateCardNodeBinding = {
                              ...effectiveBinding,
                              entrySelector: {
                                mode: "index",
                                index,
                              },
                            };
                            if (v2_isSameBinding(nextBinding, bindableNode.binding)) {
                              onRemoveSceneComponentInstanceBindingOverride({
                                nodeId: node.id,
                                cardNodeId: bindableNode.id,
                              });
                              return;
                            }
                            onUpdateSceneComponentInstanceBindingOverride({
                              nodeId: node.id,
                              cardNodeId: bindableNode.id,
                              binding: nextBinding,
                            });
                          }}
                          className="w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                        />
                      </div>
                    ) : null}
                    {effectiveBinding.mode === "field" && !fieldBindingExists ? (
                      <p className="text-[11px] text-red-300">
                        현재 바인딩된 필드가 입력 스키마에 없습니다.
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {bindableNodes.length === 0 ? (
                <div className="rounded border border-[#2f3a4c] bg-[#101722] px-2 py-1.5 text-[11px] text-[#8fa6cf]">
                  선택된 컴포넌트에서 바인딩 가능한 텍스트 오브젝트를 찾지
                  못했습니다.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onMoveSceneComponentInstanceToRoot(node.id)}
          className="w-full rounded border border-[#3a5f9e] bg-[#182643] px-2 py-1.5 text-xs font-semibold text-[#a8c7ff] hover:bg-[#1d2e51]"
        >
          Move To Root
        </button>
        <button
          type="button"
          onClick={() =>
            onExtractSceneComponentInstanceCopy({
              nodeId: node.id,
              targetParentId: null,
            })
          }
          className="w-full rounded border border-[#3f6ad8] bg-[#1a2b57] px-2 py-1.5 text-xs font-semibold text-[#b9ccff] hover:bg-[#22376f]"
        >
          Extract Copy To Root
        </button>
      </div>
    );
  };

  return {
    renderSceneNodeStructureControls,
    renderSceneAssetNodeProperties,
    renderSceneGroupNodeProperties,
    renderSceneCardCollectionProperties,
    renderSceneComponentInstanceProperties,
  };
};

export default useTemplateSceneNodePropertyPanels;
