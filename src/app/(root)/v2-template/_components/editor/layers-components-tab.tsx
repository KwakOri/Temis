import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Component,
  Copy,
  Folder,
  Grid3X3,
  ImageIcon,
  Layers,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import React, { useState } from "react";

import {
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
} from "@/types/time-table/template-render-config";

export type V2LayersComponentItem = {
  id: string;
  label: string;
  rootNodeId: string;
  rootLayerId: string | null;
  firstInstanceLayerId: string | null;
  kind: "template" | "custom";
  instanceMode: "component" | "detached";
  instanceCount: number;
};

interface V2LayersComponentsTabProps {
  componentCatalog: V2LayersComponentItem[];
  componentLayerTreeByComponentId: Record<string, V2TemplateLayerNode | null>;
  selectedComponentId: string | null;
  selectedLayerId: string | null;
  onCreateComponent: () => void;
  onSelectComponentMaster: (componentItem: V2LayersComponentItem) => void;
  onSelectComponentLayer: (payload: {
    componentItem: V2LayersComponentItem;
    layerId: string;
  }) => void;
  onDetachComponent: (componentId: string) => void;
  onDuplicateComponent: (componentId: string) => void;
  onDeleteComponent: (componentItem: V2LayersComponentItem) => void;
  onJumpToFirstInstance: (componentItem: V2LayersComponentItem) => void;
}

const v2_LAYER_ICON_MAP: Record<
  V2TemplateLayerIconKey,
  React.ComponentType<{ className?: string }>
> = {
  group: Folder,
  grid: Grid3X3,
  calendar: CalendarDays,
  image: ImageIcon,
  layers: Layers,
  text: Type,
};

const V2LayersComponentsTab: React.FC<V2LayersComponentsTabProps> = ({
  componentCatalog,
  componentLayerTreeByComponentId,
  selectedComponentId,
  selectedLayerId,
  onCreateComponent,
  onSelectComponentMaster,
  onSelectComponentLayer,
  onDetachComponent,
  onDuplicateComponent,
  onDeleteComponent,
  onJumpToFirstInstance,
}) => {
  const [expandedLayerTreeNodeMap, setExpandedLayerTreeNodeMap] = useState<
    Record<string, boolean>
  >({});
  const toggleLayerTreeNode = (key: string) => {
    setExpandedLayerTreeNodeMap((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? false),
    }));
  };

  const renderComponentLayerNode = ({
    componentItem,
    node,
    depth = 0,
  }: {
    componentItem: V2LayersComponentItem;
    node: V2TemplateLayerNode;
    depth?: number;
  }): React.ReactNode => {
    const hasChildren = Boolean(node.children?.length);
    const nodeKey = `${componentItem.id}:${node.id}`;
    const isOpen = expandedLayerTreeNodeMap[nodeKey] ?? depth === 0;
    const ChevronIcon = isOpen ? ChevronDown : ChevronRight;
    const iconByKey =
      node.icon !== undefined ? v2_LAYER_ICON_MAP[node.icon] : undefined;
    const Icon = node.kind === "group" ? Folder : iconByKey ?? Layers;
    const isSelectedLayer = selectedLayerId === node.id;

    return (
      <div key={nodeKey} className="space-y-1">
        <div
          className="flex items-center gap-1.5"
          style={{ paddingLeft: `${depth * 10}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#7f92b5] hover:bg-[#23314a]"
              onClick={(event) => {
                event.stopPropagation();
                toggleLayerTreeNode(nodeKey);
              }}
              aria-label={`${node.label} 레이어 ${isOpen ? "접기" : "펼치기"}`}
            >
              <ChevronIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="inline-block h-5 w-5 shrink-0" />
          )}
          <button
            type="button"
            className={`flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left text-[11px] transition ${
              isSelectedLayer
                ? "bg-[#21314f] text-[#e2ecff]"
                : "text-[#c7d6f4] hover:bg-[#23314a]"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onSelectComponentLayer({
                componentItem,
                layerId: node.id,
              });
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#8ea7d2]" />
            <span className="truncate">{node.label}</span>
          </button>
        </div>
        {hasChildren && isOpen
          ? node.children?.map((child) =>
              renderComponentLayerNode({
                componentItem,
                node: child,
                depth: depth + 1,
              })
            )
          : null}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1 rounded border border-[#3f6ad8] bg-[#1a2b57] px-2 py-1.5 text-[11px] font-semibold text-[#b9ccff] hover:bg-[#22376f]"
        onClick={onCreateComponent}
      >
        <Plus className="h-3.5 w-3.5" />
        New Component
      </button>
      {componentCatalog.length === 0 ? (
        <div className="rounded border border-[#2f394d] bg-[#151c28] px-2 py-2 text-[11px] text-[#8ca2c8]">
          등록된 컴포넌트가 없습니다.
        </div>
      ) : (
        componentCatalog.map((componentItem) => (
          <div
            key={componentItem.id}
            className={`space-y-2 rounded border px-2 py-2 transition ${
              selectedComponentId === componentItem.id
                ? "border-[#4f8cff] bg-[#18243a]"
                : "border-[#2f394d] bg-[#151c28]"
            }`}
          >
            <button
              type="button"
              className={`flex w-full items-center gap-2 rounded px-1 py-1 text-left transition ${
                selectedComponentId === componentItem.id
                  ? "bg-[#1d2d49]"
                  : "hover:bg-[#1d2636]"
              }`}
              onClick={() => {
                onSelectComponentMaster(componentItem);
              }}
            >
              <Component className="h-3.5 w-3.5 shrink-0 text-[#9ab3dd]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#d3e2ff]">
                  {componentItem.label}
                </p>
                <p className="truncate text-[10px] text-[#7f92b5]">
                  {componentItem.kind} / {componentItem.instanceMode}
                </p>
                <p className="truncate text-[10px] text-[#7f92b5]">
                  instances: {componentItem.instanceCount}
                </p>
              </div>
              <span className="shrink-0 rounded border border-[#3f6ad8] bg-[#1a2b57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b9ccff]">
                Master
              </span>
            </button>
            {componentItem.instanceMode !== "detached" ? (
              <button
                type="button"
                className="w-full rounded border border-[#8a4f4f] bg-[#2a1b1b] px-2 py-1 text-[11px] font-semibold text-[#f2b7b7] hover:bg-[#352020]"
                onClick={(event) => {
                  event.stopPropagation();
                  onDetachComponent(componentItem.id);
                }}
              >
                Detach (되돌릴 수 없음)
              </button>
            ) : (
              <div className="w-full rounded border border-[#3b5b8b] bg-[#14233d] px-2 py-1 text-[11px] font-semibold text-[#9ec1ff]">
                Detached
              </div>
            )}
            <button
              type="button"
              className="w-full rounded border border-[#3f6ad8] bg-[#1a2b57] px-2 py-1 text-[11px] font-semibold text-[#b9ccff] hover:bg-[#22376f]"
              onClick={(event) => {
                event.stopPropagation();
                onSelectComponentMaster(componentItem);
              }}
            >
              마스터 편집 열기
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 rounded border border-[#3a5f9e] bg-[#182643] px-2 py-1 text-[11px] font-semibold text-[#a8c7ff] hover:bg-[#1d2e51]"
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicateComponent(componentItem.id);
                }}
              >
                <Copy className="h-3 w-3" />
                Duplicate
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1 rounded border border-[#8a4f4f] bg-[#2a1b1b] px-2 py-1 text-[11px] font-semibold text-[#f2b7b7] hover:bg-[#352020]"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteComponent(componentItem);
                }}
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
            {componentItem.firstInstanceLayerId ? (
              <button
                type="button"
                className="w-full rounded border border-[#3a5f9e] bg-[#182643] px-2 py-1 text-[11px] font-semibold text-[#a8c7ff] hover:bg-[#1d2e51]"
                onClick={(event) => {
                  event.stopPropagation();
                  onJumpToFirstInstance(componentItem);
                }}
              >
                첫 인스턴스 이동
              </button>
            ) : null}
            {componentLayerTreeByComponentId[componentItem.id] ? (
              <div className="rounded border border-[#2f394d] bg-[#111923] px-2 py-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8fa6cf]">
                  Component Layers
                </p>
                <div className="space-y-1">
                  {renderComponentLayerNode({
                    componentItem,
                    node: componentLayerTreeByComponentId[componentItem.id]!,
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded border border-[#8a4f4f] bg-[#2a1b1b] px-2 py-1 text-[11px] text-[#f2b7b7]">
                마스터 레이어를 찾을 수 없습니다.
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default V2LayersComponentsTab;
