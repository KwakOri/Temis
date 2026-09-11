import type {
  StudioAsset,
  StudioBinding,
  StudioGraphNode,
  StudioGraphNodeType,
  StudioShapeFill,
  StudioStyleRecord,
  StudioTextAppearance,
} from "@/types/template-studio";
import type {
  FigmaNormalizedNode,
  FigmaTransientAsset,
  StudioFigmaGridCandidate,
  StudioFigmaNodeReview,
} from "@/types/template-studio-figma";
import {
  adjustFigmaRectForCssCenterRotation,
} from "@/utils/template-studio/figma-import/figma-rotation";
import { isFigmaVectorType } from "@/utils/template-studio/figma-import/figma-visual";
import { createStudioId } from "@/utils/template-studio/id";

type Frame = { left: number; top: number; width: number; height: number };
type FigmaStyle = Record<string, unknown>;

const DATA_IMAGE_SOURCE = /^data:image\/(?:png|jpeg|webp|gif|svg\+xml);base64,[a-z0-9+/=\s]+$/i;
const GROUP_TYPES = new Set(["FRAME", "GROUP", "COMPONENT", "INSTANCE", "SECTION"]);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const clampOpacity = (value: unknown): number | undefined => {
  const numeric = asFiniteNumber(value);
  return numeric === undefined ? undefined : Math.min(1, Math.max(0, numeric));
};

const safeFrame = (value: FigmaNormalizedNode["absoluteBounds"] | undefined): Frame => ({
  left: asFiniteNumber(value?.left) ?? 0,
  top: asFiniteNumber(value?.top) ?? 0,
  width: Math.max(0, asFiniteNumber(value?.width) ?? 0),
  height: Math.max(0, asFiniteNumber(value?.height) ?? 0),
});

const getNodeFrame = (node: FigmaNormalizedNode): Frame => {
  const bounds = safeFrame(node.absoluteBounds ?? node.frame);
  return { ...bounds, width: node.localSize?.width ?? bounds.width, height: node.localSize?.height ?? bounds.height };
};

const getNodeLocalPosition = (
  node: FigmaNormalizedNode,
  parentFrame: Frame,
): { left: number; top: number } => {
  const relativeTransform = node.relativeTransform;
  const relativeLeft = relativeTransform?.[0]?.[2];
  const relativeTop = relativeTransform?.[1]?.[2];
  if (asFiniteNumber(relativeLeft) !== undefined && asFiniteNumber(relativeTop) !== undefined) {
    return { left: relativeLeft!, top: relativeTop! };
  }
  const frame = getNodeFrame(node);
  return {
    left: frame.left - parentFrame.left,
    top: frame.top - parentFrame.top,
  };
};

const safeLabel = (value: string, fallback: string): string => {
  const label = value
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return label || fallback;
};

const getStyle = (node: FigmaNormalizedNode): FigmaStyle => node.style ?? {};

const solidPaintColor = (fills: unknown[] | undefined): string | undefined => {
  const paint = fills
    ?.map(asRecord)
    .find((fill) => fill?.type === "SOLID" && fill.visible !== false);
  const color = asRecord(paint?.color);
  const red = asFiniteNumber(color?.r);
  const green = asFiniteNumber(color?.g);
  const blue = asFiniteNumber(color?.b);
  if (red === undefined || green === undefined || blue === undefined) return undefined;

  const channel = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255);
  const opacity = (clampOpacity(paint?.opacity) ?? 1) * (clampOpacity(color?.a) ?? 1);
  const rgb = [channel(red), channel(green), channel(blue)];
  if (opacity === 1) {
    return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  }
  return `rgba(${rgb.join(", ")}, ${opacity})`;
};

const hasImagePaint = (fills: unknown[] | undefined): boolean =>
  fills?.some((fill) => asRecord(fill)?.type === "IMAGE") === true;

const hasUnsupportedEffects = (node: FigmaNormalizedNode): boolean => {
  const style = getStyle(node);
  return (node.effects?.length ?? 0) > 0 ||
    (node.strokes?.length ?? 0) > 0 ||
    ["effects", "strokes", "strokeWeight", "dropShadow", "textShadow"]
      .some((key) => style[key] !== undefined && style[key] !== null);
};

const getBorderRadius = (node: FigmaNormalizedNode): number | undefined => {
  const value = asFiniteNumber(node.cornerRadius) ?? asFiniteNumber(getStyle(node).cornerRadius);
  return value === undefined ? undefined : Math.max(0, value);
};

const getOverflow = (node: FigmaNormalizedNode): "hidden" | "visible" | undefined => {
  const value = node.clipsContent ?? getStyle(node).clipsContent;
  return value === true ? "hidden" : value === false ? "visible" : undefined;
};

const cloneBinding = (binding: StudioBinding): StudioBinding => {
  switch (binding.kind) {
    case "staticText":
      return { kind: "staticText", value: binding.value };
    case "builtinField":
      return { ...binding };
    case "inputText":
    case "inputImage":
    case "staticAsset":
      return { ...binding };
    case "selectText":
      return { ...binding };
    case "selectAsset":
      return { ...binding, assetByOption: { ...binding.assetByOption } };
  }
};

const getTextStyle = (node: FigmaNormalizedNode, style: StudioStyleRecord): void => {
  const figmaStyle = getStyle(node);
  const fontFamily = figmaStyle.fontFamily;
  if (typeof fontFamily === "string" && fontFamily.trim()) {
    style.fontFamily = fontFamily.trim();
  }
  const fontSize = asFiniteNumber(figmaStyle.fontSize);
  if (fontSize !== undefined && fontSize > 0) style.fontSize = fontSize;
  const fontWeight = figmaStyle.fontWeight;
  if (typeof fontWeight === "number" && Number.isFinite(fontWeight)) {
    style.fontWeight = fontWeight;
  } else if (typeof fontWeight === "string" && /^(normal|bold|[1-9]00)$/i.test(fontWeight.trim())) {
    style.fontWeight = fontWeight.trim();
  }
  const rawFontStyle = figmaStyle.fontStyle;
  if (rawFontStyle === "normal" || rawFontStyle === "italic" || rawFontStyle === "oblique") {
    style.fontStyle = rawFontStyle;
  } else if (figmaStyle.italic === true) {
    style.fontStyle = "italic";
  }
  const letterSpacing = asFiniteNumber(figmaStyle.letterSpacing);
  if (letterSpacing !== undefined) style.letterSpacing = letterSpacing;
  const lineHeightPx = asFiniteNumber(figmaStyle.lineHeightPx);
  if (lineHeightPx !== undefined && lineHeightPx > 0) {
    style.lineHeight = `${lineHeightPx}px`;
  } else {
    const lineHeightPercent = asFiniteNumber(figmaStyle.lineHeightPercentFontSize);
    if (lineHeightPercent !== undefined && lineHeightPercent > 0) {
      style.lineHeight = lineHeightPercent / 100;
    } else {
      const lineHeight = asFiniteNumber(figmaStyle.lineHeight);
      if (lineHeight !== undefined && lineHeight > 0) style.lineHeight = lineHeight;
    }
  }

  const horizontal = node.textAlignHorizontal ?? figmaStyle.textAlignHorizontal;
  if (horizontal === "LEFT" || horizontal === "CENTER" || horizontal === "RIGHT" || horizontal === "JUSTIFIED") {
    style.textAlign = horizontal === "JUSTIFIED" ? "justify" : horizontal.toLowerCase();
    style.display = "flex";
    style.justifyContent = horizontal === "LEFT"
      ? "flex-start"
      : horizontal === "RIGHT"
        ? "flex-end"
        : "center";
  }
  const vertical = node.textAlignVertical ?? figmaStyle.textAlignVertical;
  if (vertical === "TOP" || vertical === "CENTER" || vertical === "BOTTOM") {
    style.display = "flex";
    style.alignItems = vertical === "TOP"
      ? "flex-start"
      : vertical === "BOTTOM"
        ? "flex-end"
        : "center";
  }
};

const textAppearanceFor = (color: string | undefined): StudioTextAppearance | undefined =>
  color ? { fill: { type: "solid", color, opacity: 1 }, strokes: [] } : undefined;

const normalizedLayerName = (value: string): string =>
  value.trim().replace(/[\s_-]+/g, "").toLowerCase();

const isExplicitEntryGroup = (node: FigmaNormalizedNode): boolean =>
  GROUP_TYPES.has(node.type) && /^(?:entry|entrygroup|entryslot|cardentry)$/.test(normalizedLayerName(node.name));

const makeAsset = (
  source: FigmaTransientAsset,
  node: FigmaNormalizedNode,
): StudioAsset | null => {
  if (!DATA_IMAGE_SOURCE.test(source.src)) return null;
  const frame = source.kind === "imageFill"
    ? getNodeFrame(node)
    : safeFrame(node.absoluteRenderBounds ?? node.absoluteBounds ?? node.frame);
  return {
    id: createStudioId("asset"),
    label: safeLabel(node.name, "Imported Figma asset"),
    src: source.src,
    mimeType: source.mimeType,
    byteSize: source.byteSize,
    ...(frame.width > 0 ? { width: frame.width } : {}),
    ...(frame.height > 0 ? { height: frame.height } : {}),
  };
};

export const convertFigmaGridCandidate = (input: {
  root: FigmaNormalizedNode;
  reviews: StudioFigmaNodeReview[];
  exportedAssets: FigmaTransientAsset[];
}): StudioFigmaGridCandidate => {
  const rootFrame = getNodeFrame(input.root);
  const reviewsBySourceId = new Map(input.reviews.map((review) => [review.sourceNodeId, review]));
  const assetsBySourceId = new Map(input.exportedAssets.map((asset) => [asset.sourceNodeId, asset]));
  const warnings: string[] = [];
  const nodes: Record<string, StudioGraphNode> = {};
  const styles: Record<string, StudioStyleRecord> = {};
  const assets: StudioAsset[] = [];
  const reviewNodeIds: Record<string, string> = {};
  const sourceCharacters: Record<string, string> = {};
  const directEntryChildren = (input.root.children ?? []).filter(isExplicitEntryGroup);
  const explicitEntrySourceId = directEntryChildren[0]?.id;
  if (directEntryChildren.length > 1) {
    warnings.push("Multiple direct Entry groups were found; only the first receives entry slot index 0.");
  }

  const convertNode = (
    source: FigmaNormalizedNode,
    parentId: string | null,
    parentFrame: Frame,
    isRoot = false,
  ): string => {
    const nodeId = createStudioId("node");
    const styleId = createStudioId("style");
    const frame = getNodeFrame(source);
    const rotateDeg = source.rotateDeg;
    const localPosition = getNodeLocalPosition(source, parentFrame);
    const correctedFrame = adjustFigmaRectForCssCenterRotation({
      left: localPosition.left,
      top: localPosition.top,
      width: frame.width,
      height: frame.height,
      rotateDeg,
      rotatedWidth: source.absoluteBounds?.width ?? source.absoluteRenderBounds?.width,
      rotatedHeight: source.absoluteBounds?.height ?? source.absoluteRenderBounds?.height,
    });
    const style: StudioStyleRecord = {
      position: "absolute",
      left: isRoot ? 0 : correctedFrame.left,
      top: isRoot ? 0 : correctedFrame.top,
      width: frame.width,
      height: frame.height,
    };
    const opacity = clampOpacity(source.opacity);
    if (opacity !== undefined) style.opacity = opacity;
    if (rotateDeg !== undefined && rotateDeg !== 0) style.rotateDeg = rotateDeg;
    const color = solidPaintColor(source.fills);
    const borderRadius = getBorderRadius(source);
    if (borderRadius !== undefined) style.borderRadius = borderRadius;
    const overflow = getOverflow(source);
    if (overflow) style.overflow = overflow;

    const review = reviewsBySourceId.get(source.id);
    const sourceHasChildren = (source.children?.length ?? 0) > 0;
    const sourceAsset = assetsBySourceId.get(source.id);
    const unsupportedEffects = hasUnsupportedEffects(source);
    if (unsupportedEffects) {
      warnings.push(`Unsupported Figma effects/strokes on "${safeLabel(source.name, "Figma layer")}" were not serialized.`);
    }

    let type: StudioGraphNodeType;
    if (isRoot || (sourceHasChildren && !isFigmaVectorType(source.type)) || source.id === explicitEntrySourceId) {
      type = "group";
    } else if ((unsupportedEffects && sourceAsset) || isFigmaVectorType(source.type) || source.type === "SLICE") {
      type = "image";
    } else if (source.type !== "TEXT" && (source.type === "IMAGE" || hasImagePaint(source.fills))) {
      type = "image";
    } else if (GROUP_TYPES.has(source.type)) {
      type = "group";
    } else if (source.type === "TEXT") {
      type = review?.suggestedStudioType === "flexibleText" ? "flexibleText" : "text";
      getTextStyle(source, style);
      if (color) style.color = color;
    } else if (color) {
      type = "shape";
    } else {
      type = "shape";
      warnings.push(`Unsupported Figma layer "${safeLabel(source.name, "Figma layer")}" was preserved as an empty shape.`);
    }
    if (color && type !== "text" && type !== "flexibleText" && type !== "image") {
      style.backgroundColor = color;
    }

    const node: StudioGraphNode = {
      id: nodeId,
      type,
      label: safeLabel(source.name, type === "group" ? "Figma group" : "Figma layer"),
      parentId,
      childIds: [],
      styleId,
    };
    if (reviewsBySourceId.has(source.id)) reviewNodeIds[source.id] = nodeId;
    if (source.characters !== undefined) sourceCharacters[source.id] = source.characters;
    if (source.visible === false) node.hidden = true;
    if (source.id === explicitEntrySourceId) node.meta = { entrySlot: { index: 0 } };
    if (type === "shape" && color) {
      node.shapeFill = { type: "solid", color } satisfies StudioShapeFill;
    }
    if (type === "text" || type === "flexibleText") {
      if (!review || review.suggestedRole === "unknown") {
        node.binding = { kind: "staticText", value: source.characters ?? "" };
        warnings.push(`Text "${node.label}" remains static and needs review.`);
      } else {
        node.binding = cloneBinding(review.suggestedBinding);
      }
      node.textAppearance = textAppearanceFor(color);
    }
    if (type === "image") {
      const sourceAssetRecord = sourceAsset ? makeAsset(sourceAsset, source) : null;
      if (sourceAssetRecord) {
        assets.push(sourceAssetRecord);
        node.binding = { kind: "staticAsset", assetId: sourceAssetRecord.id };
        node.fit = "cover";
        if (sourceAsset?.kind !== "imageFill") {
          // Figma's full-node pixels already contain opacity, rotation and effects.
          const rendered = safeFrame(source.absoluteRenderBounds ?? source.absoluteBounds ?? source.frame);
          const renderedPosition = source.relativeTransform
            ? localPosition
            : { left: rendered.left - parentFrame.left, top: rendered.top - parentFrame.top };
          Object.assign(style, { left: renderedPosition.left, top: renderedPosition.top, width: rendered.width, height: rendered.height });
          delete style.rotateDeg;
          delete style.opacity;
          delete style.borderRadius;
          delete style.overflow;
        }
      } else {
        warnings.push(`Image "${node.label}" has no downloaded data-url asset and was left unbound.`);
      }
    }

    styles[styleId] = style;
    nodes[nodeId] = node;
    node.childIds = (type === "image" ? [] : source.children ?? []).map((child) =>
      convertNode(child, nodeId, frame),
    );
    if (type === "group" && hasImagePaint(source.fills)) {
      const backgroundAsset = sourceAsset?.kind === "imageFill" ? makeAsset(sourceAsset, source) : null;
      if (backgroundAsset) {
        assets.push(backgroundAsset);
        const backgroundId = createStudioId("node");
        const backgroundStyleId = createStudioId("style");
        const paints = source.fills?.map(asRecord).filter((fill) => fill?.type === "IMAGE" && fill.visible !== false) ?? [];
        const paint = paints[0];
        styles[backgroundStyleId] = {
          position: "absolute", left: 0, top: 0, width: frame.width, height: frame.height,
          ...(borderRadius !== undefined ? { borderRadius } : {}),
          ...(clampOpacity(paint?.opacity) !== undefined ? { opacity: clampOpacity(paint?.opacity) } : {}),
        };
        nodes[backgroundId] = {
          id: backgroundId, type: "image", label: `${node.label} background`, parentId: nodeId,
          childIds: [], styleId: backgroundStyleId,
          binding: { kind: "staticAsset", assetId: backgroundAsset.id },
          fit: paint?.scaleMode === "FIT" ? "contain" : "cover",
        };
        node.childIds.unshift(backgroundId);
        if (paints.length > 1 || (paint?.scaleMode && !["FILL", "FIT"].includes(String(paint.scaleMode))) || paint?.imageTransform || paint?.filters || paint?.rotation) {
          warnings.push(`Image fill on "${node.label}" uses unsupported cropping, tiling or paint adjustments; its first source image was retained with approximate fit.`);
        }
      } else {
        warnings.push(`Image background on "${node.label}" has no downloaded fill asset; semantic children were retained.`);
      }
    }
    return nodeId;
  };

  const rootNodeId = convertNode(input.root, null, rootFrame, true);
  const rootNode = nodes[rootNodeId]!;
  if (!explicitEntrySourceId) {
    const entryGroupId = createStudioId("entry_group");
    const entryStyleId = createStudioId("style");
    const childIds = [...rootNode.childIds];
    styles[entryStyleId] = {
      position: "absolute",
      left: 0,
      top: 0,
      width: rootFrame.width,
      height: rootFrame.height,
      overflow: "visible",
    };
    nodes[entryGroupId] = {
      id: entryGroupId,
      type: "group",
      label: "Entry",
      parentId: rootNodeId,
      childIds,
      styleId: entryStyleId,
      meta: { entrySlot: { index: 0 } },
    };
    childIds.forEach((childId) => {
      const child = nodes[childId];
      if (child) child.parentId = entryGroupId;
    });
    rootNode.childIds = [entryGroupId];
  }

  const effectiveReviews = input.reviews.map((review): StudioFigmaNodeReview => {
    const node = nodes[reviewNodeIds[review.sourceNodeId] ?? ""];
    return {
      ...review,
      sourceCharacters: sourceCharacters[review.sourceNodeId] ?? review.sourceCharacters,
      ...(node ? {
        suggestedStudioType: node.type as StudioFigmaNodeReview["suggestedStudioType"],
        suggestedBinding: node.binding ? cloneBinding(node.binding) : cloneBinding(review.suggestedBinding),
      } : {}),
    };
  });
  return {
    candidateId: createStudioId("candidate"),
    label: safeLabel(input.root.name, "Imported Figma card"),
    frame: { ...rootFrame, left: 0, top: 0 },
    component: { nodes, styles, rootNodeId, assets },
    reviews: effectiveReviews,
    reviewNodeIds,
    reviewDefaults: Object.fromEntries(effectiveReviews.map((review) => [review.sourceNodeId, structuredClone(review)])),
    warnings,
  };
};
