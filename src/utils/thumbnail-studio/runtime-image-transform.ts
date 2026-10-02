import type {
  StudioImageFit,
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import type { StudioResizeGeometry } from "@/utils/template-studio/transform-commands";
import { parseStudioImageObjectPosition } from "./image-object-position";

/** Image geometry in fractions of its fixed template slot. */
export interface StudioRuntimeImageTransform extends StudioResizeGeometry {
  rotateDeg: number;
}

export interface StudioRuntimeImageOverride {
  fit?: StudioImageFit;
  objectPosition?: string;
  transforms?: Record<string, StudioRuntimeImageTransform>;
}

export type StudioRuntimeImageOverrides = Record<
  string,
  StudioRuntimeImageOverride
>;

/** Only visible image bindings are targets; backgrounds and template decorations are excluded. */
export const getThumbnailRuntimeImageNodes = (
  document: StudioTemplateDocument,
  inputId: string,
) =>
  Object.values(document.graph.nodes).filter((node) => {
    if (
      node.type !== "image" ||
      node.binding?.kind !== "inputImage" ||
      node.binding.inputId !== inputId
    )
      return false;
    const visited = new Set<string>();
    let current: typeof node | undefined = node;
    while (current) {
      if (current.hidden || visited.has(current.id)) return false;
      visited.add(current.id);
      if (!current.parentId)
        return document.graph.rootNodeIds.includes(current.id);
      const parent: StudioGraphNode | undefined =
        document.graph.nodes[current.parentId];
      if (!parent?.childIds.includes(current.id)) return false;
      current = parent;
    }
    return false;
  });

/** The visible image rectangle produced by CSS object-fit/object-position. */
export const getRuntimeImageFitGeometry = ({
  width,
  height,
  naturalWidth,
  naturalHeight,
  fit,
  objectPosition,
}: {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  fit: StudioImageFit;
  objectPosition?: string;
}): StudioResizeGeometry => {
  const position = parseStudioImageObjectPosition(objectPosition);
  const ratio =
    fit === "cover"
      ? Math.max(width / naturalWidth, height / naturalHeight)
      : Math.min(width / naturalWidth, height / naturalHeight);
  const imageWidth = fit === "fill" ? width : naturalWidth * ratio;
  const imageHeight = fit === "fill" ? height : naturalHeight * ratio;
  return {
    left: ((width - imageWidth) * position.x) / 100,
    top: ((height - imageHeight) * position.y) / 100,
    width: imageWidth,
    height: imageHeight,
  };
};

export const toRuntimeImageTransform = (
  geometry: StudioResizeGeometry,
  slot: { width: number; height: number },
  rotateDeg: number,
): StudioRuntimeImageTransform => ({
  left: geometry.left / slot.width,
  top: geometry.top / slot.height,
  width: geometry.width / slot.width,
  height: geometry.height / slot.height,
  rotateDeg,
});

export const fromRuntimeImageTransform = (
  transform: StudioRuntimeImageTransform,
  slot: { width: number; height: number },
): StudioResizeGeometry => ({
  left: transform.left * slot.width,
  top: transform.top * slot.height,
  width: transform.width * slot.width,
  height: transform.height * slot.height,
});
