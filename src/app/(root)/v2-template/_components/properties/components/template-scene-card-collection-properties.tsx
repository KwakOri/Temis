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
  timetableControls?: React.ReactNode;
  onChangeLabel: (value: string) => void;
  onChangeComponentId: (value: string) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
  onSyncChildComponentIds: () => void;
}

const TemplateSceneCardCollectionProperties: React.FC<
  TemplateSceneCardCollectionPropertiesProps
> = ({
  node,
  visibilityOptions,
  structureControls,
  layoutStyleEditor,
  timetableControls,
  onChangeLabel,
  onChangeVisibilityMode,
}) => {
  if (timetableControls) {
    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3">
        {timetableControls}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
      <h4 className="font-semibold text-sm text-gray-200">
        Timetable Grid / {node.label}
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
      </div>
      {timetableControls}
      {layoutStyleEditor}
    </div>
  );
};

export default TemplateSceneCardCollectionProperties;
