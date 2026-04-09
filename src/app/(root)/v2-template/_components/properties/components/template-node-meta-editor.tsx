"use client";

import React from "react";

import {
  V2TemplateColorKey,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";

interface TemplateNodeMetaEditorProps {
  label: string;
  colorKey: V2TemplateColorKey;
  fontKey: V2TemplateColorKey;
  visibilityMode: V2TemplateVisibilityMode;
  colorKeys: readonly V2TemplateColorKey[];
  visibilityOptions: Array<{
    value: V2TemplateVisibilityMode;
    label: string;
  }>;
  onChangeLabel: (value: string) => void;
  onChangeColorKey: (value: V2TemplateColorKey) => void;
  onChangeFontKey: (value: V2TemplateColorKey) => void;
  onChangeVisibilityMode: (value: V2TemplateVisibilityMode) => void;
  onMouseEnterVisibility?: () => void;
  onMouseLeaveVisibility?: () => void;
  onClickVisibility?: () => void;
}

const TemplateNodeMetaEditor: React.FC<TemplateNodeMetaEditorProps> = ({
  label,
  colorKey,
  fontKey,
  visibilityMode,
  colorKeys,
  visibilityOptions,
  onChangeLabel,
  onChangeColorKey,
  onChangeFontKey,
  onChangeVisibilityMode,
  onMouseEnterVisibility,
  onMouseLeaveVisibility,
  onClickVisibility,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">오브젝트 이름</label>
        <input
          value={label}
          onChange={(event) => onChangeLabel(event.target.value)}
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">컬러 테마 토큰</label>
        <select
          value={colorKey}
          onChange={(event) =>
            onChangeColorKey(event.target.value as V2TemplateColorKey)
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {colorKeys.map((key) => (
            <option key={`node-color-${key}`} value={key}>
              {key}
            </option>
          ))}
        </select>
        <label className="text-xs text-gray-400">폰트 테마 토큰</label>
        <select
          value={fontKey}
          onChange={(event) =>
            onChangeFontKey(event.target.value as V2TemplateColorKey)
          }
          className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        >
          {colorKeys.map((key) => (
            <option key={`node-font-${key}`} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
      <div
        className="grid grid-cols-2 gap-2 items-center"
        onMouseEnter={onMouseEnterVisibility}
        onMouseLeave={onMouseLeaveVisibility}
        onClick={onClickVisibility}
      >
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
            <option key={`node-visible-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default TemplateNodeMetaEditor;
