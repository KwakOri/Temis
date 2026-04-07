import { V2TemplateHighlightTarget } from "@/types/time-table/v2_template_editor_ui";
import { CSSProperties } from "react";

const v2_RED_600_RGB = "220 38 38";
const v2_HIGHLIGHT_OUTLINE_WIDTH = 5;
const v2_HIGHLIGHT_OUTLINE_OFFSET = 2;

export const v2_getHighlightStyle = ({
  target,
  hoverTarget,
  activeTarget,
}: {
  target: V2TemplateHighlightTarget;
  hoverTarget: V2TemplateHighlightTarget | null;
  activeTarget: V2TemplateHighlightTarget | null;
}): CSSProperties => {
  if (activeTarget === target) {
    return {
      outline: `${v2_HIGHLIGHT_OUTLINE_WIDTH}px dashed rgb(${v2_RED_600_RGB} / 1)`,
      outlineOffset: v2_HIGHLIGHT_OUTLINE_OFFSET,
    };
  }

  if (hoverTarget === target) {
    return {
      outline: `${v2_HIGHLIGHT_OUTLINE_WIDTH}px dashed rgb(${v2_RED_600_RGB} / 0.5)`,
      outlineOffset: v2_HIGHLIGHT_OUTLINE_OFFSET,
    };
  }

  return {};
};
