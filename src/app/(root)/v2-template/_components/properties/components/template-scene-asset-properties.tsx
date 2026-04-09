"use client";

import React from "react";

import {
  V2TemplateAssetMap,
  V2TemplateSceneAssetNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";

interface TemplateSceneAssetPropertiesProps {
  node: V2TemplateSceneAssetNode;
  assetKeys: Array<keyof V2TemplateAssetMap>;
  assetLabels: Record<keyof V2TemplateAssetMap, string>;
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  structureControls: React.ReactNode;
  styleEditor: React.ReactNode;
  onChangeLabel: (value: string) => void;
  onChangeAssetKey: (value: keyof V2TemplateAssetMap) => void;
  onChangeFit: (value: NonNullable<V2TemplateSceneAssetNode["fit"]>) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
  onChangeAlt: (value: string) => void;
}

const TemplateSceneAssetProperties: React.FC<TemplateSceneAssetPropertiesProps> = ({
  node,
  assetKeys,
  assetLabels,
  visibilityOptions,
  structureControls,
  styleEditor,
  onChangeLabel,
  onChangeAssetKey,
  onChangeFit,
  onChangeVisibilityMode,
  onChangeAlt,
}) => {
  return (
    <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
      <h4 className="font-semibold text-sm text-gray-200">Scene Asset / {node.label}</h4>
      {structureControls}
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">오브젝트 이름</label>
        <input
          value={node.label}
          onChange={(event) => onChangeLabel(event.target.value)}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        />
        <label className="text-xs text-gray-400">에셋 키</label>
        <select
          value={node.assetKey}
          onChange={(event) =>
            onChangeAssetKey(event.target.value as keyof V2TemplateAssetMap)
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {assetKeys.map((assetKey) => (
            <option key={`scene-asset-key-${assetKey}`} value={assetKey}>
              {assetLabels[assetKey]}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-400">Fit</label>
        <select
          value={node.fit ?? "cover"}
          onChange={(event) =>
            onChangeFit(event.target.value as NonNullable<V2TemplateSceneAssetNode["fit"]>)
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          <option value="cover">cover</option>
          <option value="contain">contain</option>
          <option value="fill">fill</option>
        </select>
        <label className="text-xs text-gray-400">표시 조건</label>
        <select
          value={node.visibilityMode ?? "always"}
          onChange={(event) =>
            onChangeVisibilityMode(event.target.value as V2TemplateVisibilityMode)
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {visibilityOptions.map((option) => (
            <option key={`scene-asset-visible-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">alt</label>
        <input
          value={node.alt ?? ""}
          onChange={(event) => onChangeAlt(event.target.value)}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          placeholder="이미지 alt 텍스트"
        />
        <label className="text-xs text-gray-400">style key</label>
        <div className="px-2 py-2 rounded border border-[#3a3d44] bg-[#121418] text-xs text-gray-300">
          {node.styleKey ?? "-"}
        </div>
      </div>
      {styleEditor}
    </div>
  );
};

export default TemplateSceneAssetProperties;
