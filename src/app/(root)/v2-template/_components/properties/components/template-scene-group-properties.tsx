"use client";

import React from "react";

import { V2TemplateVisibilityMode } from "@/types/time-table/template-render-config";

interface TemplateSceneGroupPropertiesProps {
  label: string;
  childCount: number;
  visibilityMode: V2TemplateVisibilityMode;
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  structureControls: React.ReactNode;
  extraControls?: React.ReactNode;
  styleEditor?: React.ReactNode;
  onChangeLabel: (value: string) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
}

const TemplateSceneGroupProperties: React.FC<TemplateSceneGroupPropertiesProps> = ({
  label,
  childCount,
  visibilityMode,
  visibilityOptions,
  structureControls,
  extraControls,
  styleEditor,
  onChangeLabel,
  onChangeVisibilityMode,
}) => {
  return (
    <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
      <h4 className="font-semibold text-sm text-gray-200">Scene Group / {label}</h4>
      {structureControls}
      {extraControls}
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">오브젝트 이름</label>
        <input
          value={label}
          onChange={(event) => onChangeLabel(event.target.value)}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        />
        <label className="text-xs text-gray-400">표시 조건</label>
        <select
          value={visibilityMode}
          onChange={(event) =>
            onChangeVisibilityMode(
              event.target.value as V2TemplateVisibilityMode
            )
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {visibilityOptions.map((option) => (
            <option key={`scene-group-visible-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-400">하위 노드 수</label>
        <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
          하위 노드: {childCount}개
        </div>
      </div>
      {styleEditor}
    </div>
  );
};

export default TemplateSceneGroupProperties;
