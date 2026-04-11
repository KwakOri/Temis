"use client";

import React from "react";

import {
  v2_TEMPLATE_DAY_KEYS,
  V2TemplateAssetMap,
  V2TemplateDayKey,
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneComponentInstanceNode,
  V2TemplateSceneGroupNode,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import TemplateSceneAssetProperties from "../components/template-scene-asset-properties";
import TemplateSceneCardCollectionProperties from "../components/template-scene-card-collection-properties";
import TemplateSceneGroupProperties from "../components/template-scene-group-properties";
import TemplateSceneNodeStructureControls from "../components/template-scene-node-structure-controls";
import { v2_parseStyleSectionKey } from "../model/style-section-utils";

type V2SceneNodeSectionId = string;
type V2SceneNodeInsertKind =
  | "text"
  | "flexibleText"
  | "asset"
  | "group"
  | "cardCollection";

type V2StructureControlNode =
  | V2TemplateSceneTextNode
  | V2TemplateSceneAssetNode
  | V2TemplateSceneGroupNode
  | V2TemplateSceneCardCollectionNode
  | V2TemplateSceneComponentInstanceNode;

interface UseTemplateSceneNodePropertyPanelsParams {
  assetKeys: Array<keyof V2TemplateAssetMap>;
  assetLabels: Record<keyof V2TemplateAssetMap, string>;
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
  onAddSceneSiblingNode: (params: {
    anchorNodeId: string;
    kind: V2SceneNodeInsertKind;
  }) => void;
  onAddSceneChildNode: (params: {
    parentNodeId: string;
    kind: V2SceneNodeInsertKind;
  }) => void;
  onUpdateSceneNodeLabel: (nodeId: string, label: string) => void;
  onUpdateSceneAssetNodeMeta: (params: {
    nodeId: string;
    assetKey?: keyof V2TemplateAssetMap;
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
  dayKeyOptions: Array<{ value: V2TemplateDayKey; label: string }>;
  onUpdateSceneComponentInstanceDayKey: (
    nodeId: string,
    dayKey: V2TemplateDayKey
  ) => void;
  onUpdateSceneComponentInstanceComponentId: (
    nodeId: string,
    componentId: string
  ) => void;
  onExtractSceneComponentInstanceCopy: (params: {
    nodeId: string;
    targetParentId?: string | null;
    targetIndex?: number;
  }) => void;
}

const useTemplateSceneNodePropertyPanels = ({
  assetKeys,
  assetLabels,
  sceneCardCollectionComponentOptions,
  visibilityOptions,
  isSceneCustomNode,
  renderStyleSectionEditor,
  onMoveSceneNode,
  onRelocateSceneNode,
  getSceneNodeParentId,
  getSceneGroupParentOptions,
  onRemoveSceneNode,
  onAddSceneSiblingNode,
  onAddSceneChildNode,
  onUpdateSceneNodeLabel,
  onUpdateSceneAssetNodeMeta,
  onUpdateSceneNodeVisibilityMode,
  onUpdateSceneCardCollectionComponentId,
  onSyncSceneCardCollectionChildComponentIds,
  dayKeyOptions,
  onUpdateSceneComponentInstanceDayKey,
  onUpdateSceneComponentInstanceComponentId,
  onExtractSceneComponentInstanceCopy,
}: UseTemplateSceneNodePropertyPanelsParams) => {
  const renderSceneNodeStructureControls = ({
    node,
    allowChildren,
  }: {
    node: V2StructureControlNode;
    allowChildren: boolean;
  }) => {
    const canDelete = isSceneCustomNode(node.id);

    return (
      <TemplateSceneNodeStructureControls
        nodeId={node.id}
        allowChildren={allowChildren}
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
        onAddSibling={(kind) =>
          onAddSceneSiblingNode({
            anchorNodeId: node.id,
            kind,
          })
        }
        onAddChild={(kind) =>
          onAddSceneChildNode({
            parentNodeId: node.id,
            kind,
          })
        }
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
        visibilityOptions={visibilityOptions}
        structureControls={renderSceneNodeStructureControls({
          node,
          allowChildren: false,
        })}
        styleEditor={styleEditor}
        onChangeLabel={(value) => onUpdateSceneNodeLabel(node.id, value)}
        onChangeAssetKey={(value) =>
          onUpdateSceneAssetNodeMeta({
            nodeId: node.id,
            assetKey: value,
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
          allowChildren: true,
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
            allowChildren: false,
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

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">
          Scene Component Instance / {node.label}
        </h4>
        {renderSceneNodeStructureControls({
          node,
          allowChildren: false,
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
