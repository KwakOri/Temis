import type {
  StudioImageInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioRuntimeInputValue } from "@/utils/template-studio/input-values";
import { createStudioId } from "@/utils/template-studio/id";
import { applyThumbnailStudioAddInput } from "./input-commands";
import { applyThumbnailStudioBindNodeToInput } from "./binding-commands";
import { createStudioThumbnailNode } from "./node-defaults";
import type { StudioRuntimeImageOverrides } from "./runtime-image-transform";

export interface ThumbnailAddonImage {
  id: string;
  inputId: string;
  name?: string;
  src: string;
  blob: Blob;
  intrinsicSize: { width: number; height: number };
}

export const isThumbnailUserImagesInput = (input: {
  type: string;
  preset?: string;
}): input is StudioImageInputDefinition & { preset: "user_images" } =>
  input.type === "image" && input.preset === "user_images";

/** Upgrade only explicitly named legacy image slots, preserving bindings and defaults. */
export const upgradeThumbnailUserImages = (
  document: StudioTemplateDocument,
): boolean => {
  if (document.metadata.kind !== "thumbnail") return false;
  let changed = false;
  for (const input of Object.values(document.inputs)) {
    if (
      input.type === "image" &&
      !input.preset &&
      /^user_images?$/i.test(input.label.trim()) &&
      Object.values(document.graph.nodes).some(
        (node) =>
          node.type === "image" &&
          node.binding?.kind === "inputImage" &&
          node.binding.inputId === input.id,
      )
    ) {
      input.preset = "user_images";
      changed = true;
    }
  }
  return changed;
};

/** Insert a single authored layer, or convert the selected image in place. */
export const applyThumbnailUserImagesPreset = (
  document: StudioTemplateDocument,
  selectedNodeId?: string | null,
): string => {
  const selected = selectedNodeId
    ? document.graph.nodes[selectedNodeId]
    : undefined;
  const node =
    selected?.type === "image" && !selected.locked ? selected : undefined;
  const existing =
    node?.binding?.kind === "inputImage"
      ? document.inputs[node.binding.inputId]
      : undefined;
  const input =
    existing?.type === "image"
      ? existing
      : (applyThumbnailStudioAddInput(
          document,
          "image",
        ) as StudioImageInputDefinition);
  input.preset = "user_images";
  input.label = "user_images";
  input.policy = {
    allowReplace: true,
    allowFitChange: true,
    allowFocusChange: true,
    allowCrop: false,
  };
  if (node) {
    if (node.binding?.kind === "staticAsset" && node.binding.assetId)
      input.defaultUrl = document.assets[node.binding.assetId]?.src;
    applyThumbnailStudioBindNodeToInput(document, node.id, input.id);
    node.label = "user_images";
    return node.id;
  }
  const nodeId = createStudioId("node");
  const styleId = createStudioId("style");
  const created = createStudioThumbnailNode({
    nodeId,
    styleId,
    type: "image",
    label: "user_images",
    plan: {
      parentId: null,
      left: 0,
      top: 0,
      width: document.canvas.width,
      height: document.canvas.height,
    },
  });
  created.node.binding = { kind: "inputImage", inputId: input.id };
  document.graph.nodes[nodeId] = created.node;
  document.styles[styleId] = created.style;
  document.graph.rootNodeIds.push(nodeId);
  return nodeId;
};

export const moveThumbnailAddonImage = (
  images: ThumbnailAddonImage[],
  id: string,
  delta: -1 | 1,
): ThumbnailAddonImage[] => {
  const index = images.findIndex((image) => image.id === id);
  if (index < 0) return images;
  const siblings = images.filter(
    (image) => image.inputId === images[index].inputId,
  );
  const target =
    siblings[siblings.findIndex((image) => image.id === id) + delta];
  if (!target) return images;
  const next = [...images];
  const targetIndex = images.indexOf(target);
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
};

/** Reorder only siblings, leaving other authored image groups in their own slots. */
export const reorderThumbnailAddonImage = (
  images: ThumbnailAddonImage[],
  id: string,
  targetId: string,
): ThumbnailAddonImage[] => {
  const image = images.find((item) => item.id === id);
  const target = images.find((item) => item.id === targetId);
  if (!image || !target || image === target || image.inputId !== target.inputId)
    return images;
  const siblings = images.filter((item) => item.inputId === image.inputId);
  const from = siblings.indexOf(image);
  const to = siblings.indexOf(target);
  siblings.splice(from, 1);
  siblings.splice(to, 0, image);
  let index = 0;
  return images.map((item) =>
    item.inputId === image.inputId ? siblings[index++] : item,
  );
};

/** Before/after refer to the top-first layer panel; stored stacking order is bottom-first. */
export const dropThumbnailAddonImage = (
  images: ThumbnailAddonImage[],
  id: string,
  targetId: string,
  position: "before" | "after",
): ThumbnailAddonImage[] => {
  const image = images.find((item) => item.id === id);
  const target = images.find((item) => item.id === targetId);
  if (!image || !target || image === target || image.inputId !== target.inputId)
    return images;
  const siblings = images.filter((item) => item.inputId === image.inputId);
  const next = siblings.filter((item) => item !== image);
  next.splice(next.indexOf(target) + (position === "before" ? 1 : 0), 0, image);
  if (next.every((item, index) => item === siblings[index])) return images;
  let index = 0;
  return images.map((item) =>
    item.inputId === image.inputId ? next[index++] : item,
  );
};

/** Runtime expansion stays inside the authored layer's stacking context. Never persist this graph. */
export const expandThumbnailUserImages = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  images: ThumbnailAddonImage[],
  overrides: StudioRuntimeImageOverrides,
) => {
  const expanded = {
    ...document,
    graph: { ...document.graph, nodes: { ...document.graph.nodes } },
    styles: { ...document.styles },
    inputs: { ...document.inputs },
  };
  const values = { ...runtimeValues, global: { ...runtimeValues.global } };
  const imageOverrides = { ...overrides };
  for (const node of Object.values(document.graph.nodes)) {
    if (
      node.type !== "image" ||
      node.binding?.kind !== "inputImage" ||
      !isThumbnailUserImagesInput(
        document.inputs[node.binding.inputId] ?? { type: "" },
      )
    )
      continue;
    const inputId = node.binding.inputId;
    if (overrides[inputId]?.removed) values.global[inputId] = "";
    const backgroundId = `${node.id}:background`;
    const groupStyleId = `${node.id}:user-images-group`;
    expanded.styles[groupStyleId] = {
      ...document.styles[node.styleId ?? ""],
      isolation: "isolate",
      overflow: "hidden",
    };
    const layers = [
      { id: inputId, nodeId: backgroundId, name: undefined },
      ...images
        .filter((image) => image.inputId === inputId)
        .map((image) => ({
          id: image.id,
          nodeId: `${node.id}:${image.id}`,
          name: image.name,
        })),
    ];
    expanded.graph.nodes[node.id] = {
      ...node,
      type: "group",
      binding: undefined,
      styleId: groupStyleId,
      childIds: [...layers.map((layer) => layer.nodeId), ...node.childIds],
    };
    for (const layer of layers) {
      const styleId = `${layer.nodeId}:style`;
      expanded.styles[styleId] = {
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      };
      expanded.graph.nodes[layer.nodeId] = {
        id: layer.nodeId,
        type: "image",
        hidden:
          layer.id === inputId &&
          !getStudioRuntimeInputValue(expanded.inputs[inputId], values),
        label:
          layer.id === inputId ? "배경 이미지" : layer.name || "애드온 이미지",
        parentId: node.id,
        childIds: [],
        styleId,
        layoutMode: "fillParent",
        fit: node.fit,
        binding: { kind: "inputImage", inputId: layer.id },
      };
      if (layer.id === inputId) {
        const override = overrides[inputId];
        if (override?.transforms?.[node.id])
          imageOverrides[inputId] = {
            ...override,
            transforms: {
              ...override.transforms,
              [backgroundId]: override.transforms[node.id],
            },
          };
      }
    }
    for (const image of images.filter((image) => image.inputId === inputId)) {
      expanded.inputs[image.id] = {
        id: image.id,
        type: "image",
        scope: "global",
        label: image.name || "애드온 이미지",
        policy: {
          allowFitChange: true,
          allowFocusChange: true,
          allowReplace: true,
          allowCrop: false,
        },
      };
      values.global[image.id] = image.src;
      imageOverrides[image.id] = {
        placementMode: "manual",
        intrinsicSize: image.intrinsicSize,
        ...overrides[image.id],
      };
    }
  }
  return {
    document: expanded,
    runtimeValues: values,
    runtimeImageOverrides: imageOverrides,
  };
};
