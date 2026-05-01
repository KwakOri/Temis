"use client";

import React from "react";

import {
  V2TemplateAssetRef,
  V2TemplateBuiltinAssetKey,
  V2TemplateSceneAssetNode,
  V2TemplateSceneAssetRole,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";

interface TemplateSceneAssetPropertiesProps {
  node: V2TemplateSceneAssetNode;
  assetKeys: V2TemplateBuiltinAssetKey[];
  assetLabels: Record<V2TemplateBuiltinAssetKey, string>;
  extraAssetKeys: string[];
  visibilityOptions: Array<{ value: V2TemplateVisibilityMode; label: string }>;
  structureControls: React.ReactNode;
  styleEditor: React.ReactNode;
  onChangeLabel: (value: string) => void;
  onChangeAssetRef: (value: V2TemplateAssetRef | null) => void;
  onChangeAssetRole: (value: V2TemplateSceneAssetRole) => void;
  onChangeFit: (value: NonNullable<V2TemplateSceneAssetNode["fit"]>) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
  onChangeAlt: (value: string) => void;
}

const TemplateSceneAssetProperties: React.FC<TemplateSceneAssetPropertiesProps> = ({
  node,
  assetKeys,
  assetLabels,
  extraAssetKeys,
  visibilityOptions,
  structureControls,
  styleEditor,
  onChangeLabel,
  onChangeAssetRef,
  onChangeAssetRole,
  onChangeFit,
  onChangeVisibilityMode,
  onChangeAlt,
}) => {
  const selectedAssetValue = node.assetRef
    ? node.assetRef.source === "extra"
      ? `extra:${node.assetRef.key}`
      : `builtin:${node.assetRef.key}`
    : "__none__";

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
          value={selectedAssetValue}
          onChange={(event) => {
            const rawValue = event.target.value;
            if (rawValue === "__none__") {
              onChangeAssetRef(null);
              return;
            }
            if (rawValue.startsWith("extra:")) {
              const key = rawValue.slice("extra:".length).trim();
              if (!key) return;
              onChangeAssetRef({
                source: "extra",
                key,
              });
              return;
            }

            const key = rawValue.replace(/^builtin:/, "") as V2TemplateBuiltinAssetKey;
            onChangeAssetRef({
              source: "builtin",
              key,
            });
          }}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          <option value="__none__">선택 안함</option>
          <optgroup label="Built-in">
            {assetKeys.map((assetKey) => (
              <option
                key={`scene-asset-key-${assetKey}`}
                value={`builtin:${assetKey}`}
              >
                {assetLabels[assetKey]}
              </option>
            ))}
          </optgroup>
          {extraAssetKeys.length > 0 ? (
            <optgroup label="추가 요소">
              {extraAssetKeys.map((assetKey) => (
                <option
                  key={`scene-extra-asset-key-${assetKey}`}
                  value={`extra:${assetKey}`}
                >
                  {assetKey}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <label className="text-xs text-gray-400">역할</label>
        <select
          value={node.assetRole ?? "general"}
          onChange={(event) =>
            onChangeAssetRole(event.target.value as V2TemplateSceneAssetRole)
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          <option value="general">general</option>
          <option value="background">background</option>
          <option value="guideOverlay">guideOverlay</option>
          <option value="frameArtwork">frameArtwork</option>
          <option value="frameObject">frameObject</option>
          <option value="profileImage">profileImage</option>
          <option value="profileFrame">profileFrame</option>
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
