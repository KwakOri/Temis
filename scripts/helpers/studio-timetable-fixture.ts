import type {
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "../../src/types/template-studio";
import type {
  StudioTimetableGraphDocument,
  StudioTimetableGraphNode,
  StudioTimetableNodeExtension,
} from "../../src/types/studio-timetable-graph";
import { createStudioTimetableGraphDocument } from "../../src/utils/template-studio/timetable-graph-document";
import { normalizeStudioTimetableDateBinding } from "../../src/utils/template-studio/timetable-bindings";

/** Test recipes only. Production never converts saved composition documents. */
export const createTimetableNodeFixture = (
  source: StudioTimetableCompositionObject,
) => {
  const object = structuredClone(source);
  normalizeStudioTimetableDateBinding(object);
  const style = { ...object.style };
  const extension: StudioTimetableNodeExtension = {
    presetId: object.presetId,
    profileRole: object.profileRole,
    structuredRole: object.structuredRole,
    generator:
      object.kind === "generatedDayCards" ? { kind: "dayCards" } : undefined,
    inlineAssetLayout: [
      "assetMode",
      "assetPosition",
      "assetGap",
      "assetSize",
    ].some((key) => style[key] !== undefined)
      ? {
          mode: style.assetMode as "visible" | "hidden",
          position: style.assetPosition as "left" | "right",
          gap: style.assetGap as number,
          size: style.assetSize as number,
        }
      : undefined,
  };
  for (const key of [
    "assetMode",
    "assetPosition",
    "assetGap",
    "assetSize",
    "dateRangeFormat",
    "dateRangeTemplate",
  ])
    delete style[key];
  const foreground = object.assetSlots?.asset;
  const node: StudioTimetableGraphNode = {
    id: object.id,
    label: object.label,
    type:
      object.kind === "generatedDayCards"
        ? "group"
        : object.kind === "topObject" || object.kind === "profileBlock"
          ? "image"
          : object.kind,
    parentId: object.parentId ?? null,
    childIds: object.childIds ?? [],
    layoutMode: object.layoutMode,
    binding: object.binding,
    hidden: object.hidden,
    locked: object.locked,
    meta: object.meta,
    variantSet: object.variantSet
      ? {
          options: object.variantSet.options,
          defaultValue: object.variantSet.defaultValue,
          mode: object.variantSet.mode,
          inputId: object.variantSet.inputId,
          rootByValue: object.variantSet.rootByValue,
        }
      : undefined,
    assetSlots: {},
  };
  const background =
    object.assetSlots?.background ??
    (object.backgroundAssetId
      ? { assetId: object.backgroundAssetId, fit: object.backgroundFit }
      : undefined);
  if (background) node.assetSlots!.asset = background;
  if (foreground && node.type !== "image")
    node.assetSlots!.inlineDecoration = foreground;
  if (node.type === "image") {
    delete node.assetSlots!.inlineDecoration;
    node.binding = foreground?.inputId
      ? { kind: "inputImage", inputId: foreground.inputId }
      : foreground?.assetId
        ? { kind: "staticAsset", assetId: foreground.assetId }
        : undefined;
    node.fit = foreground?.fit;
  }
  return { node, style, extension };
};

export const createTimetableGraphFixture = (
  recipe: StudioTemplateDocument,
): StudioTimetableGraphDocument => {
  if (recipe.version === 8) return recipe as StudioTimetableGraphDocument;
  const base = createStudioTimetableGraphDocument();
  const { composition, ...domain } =
    recipe.domains?.timetable ?? base.domains.timetable;
  const next: StudioTimetableGraphDocument = {
    ...structuredClone(recipe),
    version: 8,
    graph: structuredClone(recipe.graph),
    styles: structuredClone(recipe.styles),
    domains: {
      timetable: {
        ...base.domains.timetable,
        ...structuredClone(domain),
        rootNodeIds: [...(composition?.rootObjectIds ?? [])],
        nodeExtensions: {},
      },
    },
  };
  for (const object of Object.values(composition?.objects ?? {})) {
    const { node, style, extension } = createTimetableNodeFixture(object);
    node.styleId = `fixture-style:${node.id}`;
    next.graph.nodes[node.id] = node;
    next.styles[node.styleId] = style;
    next.domains.timetable.nodeExtensions[node.id] = extension;
  }
  next.graph.rootNodeIds.push(...next.domains.timetable.rootNodeIds);
  return JSON.parse(JSON.stringify(next)) as StudioTimetableGraphDocument;
};
