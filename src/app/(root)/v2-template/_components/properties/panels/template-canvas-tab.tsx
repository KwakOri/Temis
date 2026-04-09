"use client";

import React from "react";

interface TemplateCanvasTabProps {
  templateWidth: number;
  templateHeight: number;
  defaultTheme: string;
  previewTheme: string;
  themeOptions: string[];
  onUpdateTemplateSize: (key: "width" | "height", value: number) => void;
  onChangeDefaultTheme: (theme: string) => void;
  onChangePreviewTheme: (theme: string) => void;
}

const TemplateCanvasTab: React.FC<TemplateCanvasTabProps> = ({
  templateWidth,
  templateHeight,
  defaultTheme,
  previewTheme,
  themeOptions,
  onUpdateTemplateSize,
  onChangeDefaultTheme,
  onChangePreviewTheme,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">캔버스</h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">width</label>
        <input
          type="number"
          value={templateWidth}
          onChange={(event) =>
            onUpdateTemplateSize("width", Number(event.target.value))
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">height</label>
        <input
          type="number"
          value={templateHeight}
          onChange={(event) =>
            onUpdateTemplateSize("height", Number(event.target.value))
          }
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-500">default theme</label>
        <select
          value={defaultTheme}
          onChange={(event) => onChangeDefaultTheme(event.target.value)}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>

        <label className="text-xs text-gray-500">preview theme</label>
        <select
          value={previewTheme}
          onChange={(event) => onChangePreviewTheme(event.target.value)}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TemplateCanvasTab;
