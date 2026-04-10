"use client";

import React from "react";

import {
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
  dayKeyOptions: Array<{ value: V2TemplateDayKey; label: string }>;
  onUpdateSceneComponentInstanceDayKey: (
    nodeId: string,
    dayKey: V2TemplateDayKey
  ) => void;
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
  dayKeyOptions,
  onUpdateSceneComponentInstanceDayKey,
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

    return (
      <TemplateSceneCardCollectionProperties
        node={node}
        componentOptions={sceneCardCollectionComponentOptions}
        visibilityOptions={visibilityOptions}
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
      />
    );
  };

  const renderSceneComponentInstanceProperties = (
    node: V2TemplateSceneComponentInstanceNode
  ) => {
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
        </div>
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
