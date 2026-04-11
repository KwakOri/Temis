"use client";

import React from "react";

import {
  V2TemplateSceneCardCollectionNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";

interface TemplateSceneCardCollectionPropertiesProps {
  node: V2TemplateSceneCardCollectionNode;
  componentOptions: Array<{ value: string; label: string }>;
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  mismatchedChildComponentCount: number;
  structureControls: React.ReactNode;
  layoutStyleEditor: React.ReactNode;
  onChangeLabel: (value: string) => void;
  onChangeComponentId: (value: string) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
  onSyncChildComponentIds: () => void;
}

const TemplateSceneCardCollectionProperties: React.FC<
  TemplateSceneCardCollectionPropertiesProps
> = ({
  node,
  componentOptions,
  visibilityOptions,
  mismatchedChildComponentCount,
  structureControls,
  layoutStyleEditor,
  onChangeLabel,
  onChangeComponentId,
  onChangeVisibilityMode,
  onSyncChildComponentIds,
}) => {
  const selectedComponentId =
    typeof node.componentId === "string" &&
    componentOptions.some((option) => option.value === node.componentId)
      ? node.componentId
      : "";
  const hasComponentOptions = componentOptions.length > 0;

  return (
    <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
      <h4 className="font-semibold text-sm text-gray-200">
        Scene Card Collection / {node.label}
      </h4>
      {structureControls}
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">오브젝트 이름</label>
        <input
          value={node.label}
          onChange={(event) => onChangeLabel(event.target.value)}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        />
        <label className="text-xs text-gray-400">표시 조건</label>
        <select
          value={node.visibilityMode ?? "always"}
          onChange={(event) =>
            onChangeVisibilityMode(event.target.value as V2TemplateVisibilityMode)
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {visibilityOptions.map((option) => (
            <option key={`scene-card-collection-visible-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-400">컴포넌트</label>
        <select
          value={selectedComponentId}
          onChange={(event) => onChangeComponentId(event.target.value)}
          disabled={!hasComponentOptions}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          <option value="" disabled>
            {hasComponentOptions
              ? "컴포넌트를 선택하세요"
              : "사용 가능한 컴포넌트가 없습니다"}
          </option>
          {componentOptions.map((option) => (
            <option
              key={`scene-card-collection-component-${option.value}`}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {selectedComponentId.length === 0 ? (
        <p className="text-xs text-amber-300">
          연결된 컴포넌트가 없어 컬렉션이 렌더되지 않습니다. 컴포넌트를 선택해 주세요.
        </p>
      ) : (
        <div className="rounded border border-[#3a3d44] bg-[#141821] px-2.5 py-2 text-[11px] text-gray-300 space-y-2">
          <p>
            자식 인스턴스 중{" "}
            <span className="font-semibold text-amber-300">
              {mismatchedChildComponentCount}개
            </span>
            가 다른 컴포넌트를 참조합니다.
          </p>
          <button
            type="button"
            onClick={onSyncChildComponentIds}
            disabled={mismatchedChildComponentCount === 0}
            className="w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-left text-[11px] font-medium text-gray-100 transition hover:bg-[#333844] disabled:cursor-not-allowed disabled:opacity-50"
          >
            자식 인스턴스 컴포넌트 동기화
          </button>
        </div>
      )}
      {layoutStyleEditor}
    </div>
  );
};

export default TemplateSceneCardCollectionProperties;
