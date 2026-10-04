"use client";
import React from "react";
import type {
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  getStudioTextAlignment,
  type StudioTextAlignment,
} from "@/utils/template-studio/object-style";
import {
  getStudioTextWrapMode,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
} from "@/utils/template-studio/text-wrap";
import { getStudioFontWeightOptions } from "@/utils/template-studio/web-fonts";
import {
  StudioFontWeightField,
  StudioLineBreakField,
  StudioNumberField,
  StudioTextAlignmentField,
} from "./studio-inspector-fields";
import { StudioHexColorPicker } from "./studio-hex-color-picker";

export function StudioTextTypographyControls({
  document,
  style,
  fontFamilies,
  flexibleText,
  defaultLineHeight = 1.2,
  colorLabel,
  onUpdateStyle,
  onUpdateTextAlignment,
}: {
  document: StudioTemplateDocument;
  style: StudioStyleRecord;
  fontFamilies: string[];
  flexibleText: boolean;
  defaultLineHeight?: number;
  colorLabel: string;
  onUpdateStyle: (key: string, value: string | number | undefined) => void;
  onUpdateTextAlignment: (value: StudioTextAlignment) => void;
}) {
  const fontFamily = String(style.fontFamily ?? "Inter");
  return (
    <div className="grid gap-2">
      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
        <span>Font</span>
        <select
          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
          value={fontFamily}
          onChange={(event) =>
            onUpdateStyle("fontFamily", event.currentTarget.value)
          }
        >
          {fontFamilies.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-[1.3fr_1fr] gap-2">
        <StudioNumberField
          label="Size"
          value={Number(style.fontSize ?? 16)}
          onChange={(value) => onUpdateStyle("fontSize", value)}
        />
        <StudioFontWeightField
          options={getStudioFontWeightOptions(document, fontFamily)}
          value={style.fontWeight ?? 700}
          onChange={(value) => onUpdateStyle("fontWeight", value)}
        />
      </div>
      <StudioTextAlignmentField
        value={getStudioTextAlignment(style)}
        onChange={onUpdateTextAlignment}
      />
      {flexibleText ? (
        <StudioLineBreakField
          value={getStudioTextWrapMode(style)}
          onChange={(mode) =>
            onUpdateStyle(STUDIO_TEXT_WRAP_MODE_STYLE_KEY, mode)
          }
        />
      ) : null}
      <StudioNumberField
        label="Line Height"
        value={Number(style.lineHeight ?? defaultLineHeight)}
        onChange={(value) => onUpdateStyle("lineHeight", value)}
      />
      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
        <span>Color</span>
        <StudioHexColorPicker
          ariaLabel={colorLabel}
          value={String(style.color ?? "#111827")}
          onChange={(value) => onUpdateStyle("color", value)}
        />
      </label>
    </div>
  );
}
