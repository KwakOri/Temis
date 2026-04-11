import { Component, Copy, Plus, Trash2 } from "lucide-react";
import React from "react";

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
  selectedComponentId: string | null;
  onCreateComponent: () => void;
  onSelectComponentMaster: (componentItem: V2LayersComponentItem) => void;
  onDetachComponent: (componentId: string) => void;
  onDuplicateComponent: (componentId: string) => void;
  onDeleteComponent: (componentItem: V2LayersComponentItem) => void;
  onJumpToFirstInstance: (componentItem: V2LayersComponentItem) => void;
}

const V2LayersComponentsTab: React.FC<V2LayersComponentsTabProps> = ({
  componentCatalog,
  selectedComponentId,
  onCreateComponent,
  onSelectComponentMaster,
  onDetachComponent,
  onDuplicateComponent,
  onDeleteComponent,
  onJumpToFirstInstance,
}) => {
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
          </div>
        ))
      )}
    </div>
  );
};

export default V2LayersComponentsTab;
