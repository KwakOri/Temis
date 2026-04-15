"use client";

import React from "react";

import {
  V2TemplateCardNode,
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneComponentInstanceNode,
  V2TemplateSceneGroupNode,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";

interface TemplateSelectedPropertiesPanelRouterProps {
  selectedLayerNode: { id: string } | null;
  selectedSection: string | null;
  cardNodeByLayerId: Map<string, V2TemplateCardNode>;
  sceneNodeByLayerId: Map<
    string,
    | V2TemplateSceneTextNode
    | V2TemplateSceneAssetNode
    | V2TemplateSceneGroupNode
    | V2TemplateSceneCardCollectionNode
    | V2TemplateSceneComponentInstanceNode
  >;
  renderCardNodeProperties: (
    section: string,
    node: V2TemplateCardNode
  ) => React.ReactNode;
  renderSceneTextNodeProperties: (
    section: string,
    node: V2TemplateSceneTextNode
  ) => React.ReactNode;
  renderSceneAssetNodeProperties: (
    node: V2TemplateSceneAssetNode,
    section: string | null
  ) => React.ReactNode;
  renderSceneGroupNodeProperties: (
    node: V2TemplateSceneGroupNode
  ) => React.ReactNode;
  renderSceneCardCollectionProperties: (
    node: V2TemplateSceneCardCollectionNode,
    section: string | null
  ) => React.ReactNode;
  renderSceneComponentInstanceProperties: (
    node: V2TemplateSceneComponentInstanceNode
  ) => React.ReactNode;
  renderSimplePropertiesSection: (section: string) => React.ReactNode;
  renderEmptyPropertiesPanel?: () => React.ReactNode;
}

const TemplateSelectedPropertiesPanelRouter: React.FC<
  TemplateSelectedPropertiesPanelRouterProps
> = ({
  selectedLayerNode,
  selectedSection,
  cardNodeByLayerId,
  sceneNodeByLayerId,
  renderCardNodeProperties,
  renderSceneTextNodeProperties,
  renderSceneAssetNodeProperties,
  renderSceneGroupNodeProperties,
  renderSceneCardCollectionProperties,
  renderSceneComponentInstanceProperties,
  renderSimplePropertiesSection,
  renderEmptyPropertiesPanel,
}) => {
  if (!selectedLayerNode) {
    return renderEmptyPropertiesPanel ? <>{renderEmptyPropertiesPanel()}</> : null;
  }

  const cardNode = cardNodeByLayerId.get(selectedLayerNode.id);
  if (cardNode) {
    return <>{renderCardNodeProperties(selectedSection ?? "cardContainer", cardNode)}</>;
  }

  const sceneNode = sceneNodeByLayerId.get(selectedLayerNode.id);
  if (sceneNode) {
    if (sceneNode.kind === "text" || sceneNode.kind === "flexibleText") {
      return (
        <>
          {renderSceneTextNodeProperties(
            selectedSection ?? sceneNode.containerStyleKey,
            sceneNode
          )}
        </>
      );
    }
    if (sceneNode.kind === "asset") {
      return <>{renderSceneAssetNodeProperties(sceneNode, selectedSection)}</>;
    }
    if (sceneNode.kind === "group") {
      return <>{renderSceneGroupNodeProperties(sceneNode)}</>;
    }
    if (sceneNode.kind === "cardCollection") {
      return (
        <>
          {renderSceneCardCollectionProperties(sceneNode, selectedSection)}
        </>
      );
    }
    if (sceneNode.kind === "componentInstance") {
      return <>{renderSceneComponentInstanceProperties(sceneNode)}</>;
    }
  }

  if (!selectedSection) {
    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 text-xs text-gray-400">
        선택한 레이어에는 스타일 섹션이 연결되어 있지 않습니다.
      </div>
    );
  }

  return <>{renderSimplePropertiesSection(selectedSection)}</>;
};

export default TemplateSelectedPropertiesPanelRouter;
