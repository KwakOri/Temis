"use client";

import React from "react";
import { AlignHorizontalJustifyCenter } from "lucide-react";

import {
  v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN,
  v2_JUSTIFY_TO_HORIZONTAL_ALIGN,
} from "../model/alignment-utils";

type V2HorizontalAlign = "left" | "center" | "right";
type V2VerticalAlign = "top" | "center" | "bottom";

const v2_ALIGNMENT_HORIZONTAL_ORDER: V2HorizontalAlign[] = [
  "left",
  "center",
  "right",
];
const v2_ALIGNMENT_VERTICAL_ORDER: V2VerticalAlign[] = ["top", "center", "bottom"];
const v2_HORIZONTAL_ALIGN_LABELS: Record<V2HorizontalAlign, string> = {
  left: "좌측",
  center: "중앙",
  right: "우측",
};
const v2_VERTICAL_ALIGN_LABELS: Record<V2VerticalAlign, string> = {
  top: "상단",
  center: "중앙",
  bottom: "하단",
};

interface TemplateAutoResizeAlignmentEditorProps {
  title: string;
  wrapperSection: string;
  textSection: string;
  getStyleSectionMap: (section: string) => Record<string, string | number>;
  onUpdateAutoResizeHorizontalAlign: (params: {
    wrapperSection: string;
    textSection: string;
    align: V2HorizontalAlign;
  }) => void;
  onUpdateAutoResizeVerticalAlign: (params: {
    wrapperSection: string;
    align: V2VerticalAlign;
  }) => void;
  onSetSectionHoverHighlight: (section: string) => void;
  onClearSectionHoverHighlight: () => void;
  onSetSectionActiveHighlight: (section: string) => void;
}

const TemplateAutoResizeAlignmentEditor: React.FC<
  TemplateAutoResizeAlignmentEditorProps
> = ({
  title,
  wrapperSection,
  textSection,
  getStyleSectionMap,
  onUpdateAutoResizeHorizontalAlign,
  onUpdateAutoResizeVerticalAlign,
  onSetSectionHoverHighlight,
  onClearSectionHoverHighlight,
  onSetSectionActiveHighlight,
}) => {
  const wrapperMap = getStyleSectionMap(wrapperSection);
  const textMap = getStyleSectionMap(textSection);

  const horizontalAlign: V2HorizontalAlign = (() => {
    const textAlignRaw = textMap.textAlign;
    if (
      textAlignRaw === "left" ||
      textAlignRaw === "center" ||
      textAlignRaw === "right"
    ) {
      return textAlignRaw;
    }

    const justifyRaw = wrapperMap.justifyContent;
    if (typeof justifyRaw === "string") {
      return v2_JUSTIFY_TO_HORIZONTAL_ALIGN[justifyRaw] ?? "center";
    }

    return "center";
  })();

  const verticalAlign: V2VerticalAlign = (() => {
    const alignItemsRaw = wrapperMap.alignItems;
    if (typeof alignItemsRaw === "string") {
      return v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN[alignItemsRaw] ?? "center";
    }

    return "center";
  })();

  const applyPointAlignment = ({
    horizontal,
    vertical,
  }: {
    horizontal: V2HorizontalAlign;
    vertical: V2VerticalAlign;
  }) => {
    onUpdateAutoResizeHorizontalAlign({
      wrapperSection,
      textSection,
      align: horizontal,
    });
    onUpdateAutoResizeVerticalAlign({
      wrapperSection,
      align: vertical,
    });
  };

  return (
    <div
      className="rounded border border-[#3a3d44] bg-[#1f2126] p-3 space-y-2"
      onMouseEnter={() => onSetSectionHoverHighlight(wrapperSection)}
      onMouseLeave={onClearSectionHoverHighlight}
      onClick={() => onSetSectionActiveHighlight(wrapperSection)}
    >
      <h5 className="text-xs font-semibold text-gray-100 inline-flex items-center gap-1">
        <AlignHorizontalJustifyCenter className="h-3.5 w-3.5 text-gray-400" />
        {title}
      </h5>
      <p className="text-[11px] text-gray-400">
        점 하나를 클릭하면 가로(`justifyContent` + `textAlign`)와 세로(`alignItems`)가
        함께 반영됩니다.
      </p>

      <div className="rounded border border-[#343842] bg-[#1b1d22] p-2 inline-block">
        <div className="grid grid-cols-3 gap-2">
          {v2_ALIGNMENT_VERTICAL_ORDER.flatMap((vertical) =>
            v2_ALIGNMENT_HORIZONTAL_ORDER.map((horizontal) => {
              const isActive =
                horizontalAlign === horizontal && verticalAlign === vertical;
              return (
                <button
                  key={`${title}-point-${vertical}-${horizontal}`}
                  type="button"
                  onClick={() =>
                    applyPointAlignment({
                      horizontal,
                      vertical,
                    })
                  }
                  aria-label={`${v2_VERTICAL_ALIGN_LABELS[vertical]} ${v2_HORIZONTAL_ALIGN_LABELS[horizontal]}`}
                  className={`h-9 w-9 rounded border inline-flex items-center justify-center transition ${
                    isActive
                      ? "border-blue-400 bg-blue-500/20"
                      : "border-[#3a3d44] bg-[#2a2d33] hover:bg-[#323640]"
                  }`}
                >
                  <span
                    className={`rounded-full ${
                      isActive ? "h-2.5 w-2.5 bg-blue-300" : "h-2 w-2 bg-gray-500"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateAutoResizeAlignmentEditor;
