import type { StudioTimetableObjectPresetId } from "@/types/template-studio";
import type {
  StudioTimetableGraphDocument,
  StudioTimetableGraphNode,
} from "@/types/studio-timetable-graph";
import { createSampleStudioDocument } from "./sample-document";
import {
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
  insertStudioTimetableGraphPreset,
} from "./timetable-graph-presets";
import {
  STUDIO_PRESET_DEFINITIONS,
  isStudioTimetableGraphPreset,
} from "./preset-registry";
import { createStudioId } from "./id";
import {
  ensureStudioArtistProfileTextInput,
  ensureStudioWeeklyMemoInput,
  ensureStudioTimetableVariantInput,
  isStudioTimetableVariantInputCompatible,
  ensureStudioPresetImageInput,
  STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
} from "./preset-inputs";
import { validateStudioDocument } from "./validator";
import { validateStudioTeamDefinition } from "./team-timetable";

const clone = <T>(value: T): T => structuredClone(value);
const uniqueId = (prefix: string, occupied: Record<string, unknown>) => {
  let id = createStudioId(prefix);
  while (id in occupied) id = createStudioId(prefix);
  return id;
};

/** New v8 documents start from the current card-design recipe, never saved JSON. */
export const createStudioTimetableGraphDocument =
  (): StudioTimetableGraphDocument => {
    const base = createSampleStudioDocument();
    const { composition: discardedRecipe, ...timetable } =
      base.domains!.timetable!;
    void discardedRecipe;
    const generatorId = STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID;
    const styleId = uniqueId("style", base.styles);
    return {
      ...base,
      version: 8,
      graph: {
        rootNodeIds: [...base.graph.rootNodeIds, generatorId],
        nodes: {
          ...base.graph.nodes,
          [generatorId]: {
            id: generatorId,
            type: "group",
            label: "Day Card Containers",
            parentId: null,
            childIds: [],
            styleId,
          },
        },
      },
      styles: { ...base.styles, [styleId]: { opacity: 1, rotateDeg: 0 } },
      domains: {
        timetable: {
          ...timetable,
          rootNodeIds: [generatorId],
          nodeExtensions: {
            [generatorId]: {
              presetId: "dayCards",
              generator: { kind: "dayCards" },
            },
          },
        },
      },
    };
  };

/** All state branches belong to the weekly surface, including hidden Off designs. */
export const getStudioTimetableGraphNodeIds = (
  document: StudioTimetableGraphDocument,
): Set<string> => {
  const ids = new Set<string>();
  const visit = (id: string) => {
    if (ids.has(id)) return;
    const node = document.graph.nodes[id];
    if (!node) throw new Error(`Missing timetable node: ${id}`);
    ids.add(id);
    node.childIds.forEach(visit);
  };
  document.domains.timetable.rootNodeIds.forEach(visit);
  return ids;
};

export interface StudioTimetableGraphPresetResult {
  document: StudioTimetableGraphDocument;
  nodeId: string;
  linkedInput: boolean;
}

/** Relink a singleton without re-materializing any nodes or styles. */
export const relinkStudioTimetableGraphPresetInput = (
  document: StudioTimetableGraphDocument,
  nodeId: string,
): boolean => {
  const root = document.graph.nodes[nodeId];
  const presetId = document.domains.timetable.nodeExtensions[nodeId]?.presetId;
  if (!root || !presetId) return false;
  let linked = false;
  if (
    root.variantSet &&
    !isStudioTimetableVariantInputCompatible(document, root.variantSet.inputId)
  ) {
    const input = ensureStudioTimetableVariantInput(document, presetId);
    if (input) {
      root.variantSet.inputId = input.inputId;
      linked = true;
    }
  }
  const descendants: StudioTimetableGraphNode[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = document.graph.nodes[id];
    if (!node) return;
    descendants.push(node);
    node.childIds.forEach(visit);
  };
  visit(nodeId);
  if (presetId === "weeklyMemo" || presetId === "artistProfileText") {
    const text = descendants.find(
      (node) =>
        document.domains.timetable.nodeExtensions[node.id]?.structuredRole ===
        "text",
    );
    if (text) {
      const { inputId } =
        presetId === "weeklyMemo"
          ? ensureStudioWeeklyMemoInput(document)
          : ensureStudioArtistProfileTextInput(document);
      if (
        text.binding?.kind !== "inputText" ||
        text.binding.inputId !== inputId
      ) {
        text.binding = { kind: "inputText", inputId };
        linked = true;
      }
    }
  }
  if (presetId === "profileBlock") {
    const image = descendants.find(
      (node) =>
        document.domains.timetable.nodeExtensions[node.id]?.profileRole ===
        "userImage",
    );
    if (image) {
      const { inputId } = ensureStudioPresetImageInput(document, {
        label: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
        scope: "global",
        placeholder: "Paste profile image URL",
        defaultUrl:
          image.binding?.kind === "staticAsset"
            ? (document.assets[image.binding.assetId]?.src ?? "")
            : "",
      });
      if (
        image.binding?.kind !== "inputImage" ||
        image.binding.inputId !== inputId
      ) {
        image.binding = { kind: "inputImage", inputId };
        linked = true;
      }
    }
  }
  return linked;
};

/** Add a preset directly to the native graph/style store atomically. */
export const addStudioTimetableGraphPreset = (
  document: StudioTimetableGraphDocument,
  presetId: Exclude<StudioTimetableObjectPresetId, "dayCards">,
): StudioTimetableGraphPresetResult => {
  const next = clone(document);
  const preset = STUDIO_PRESET_DEFINITIONS.find(
    (p) =>
      isStudioTimetableGraphPreset(p) && p.timetableObjectPresetId === presetId,
  );
  if (!preset || !isStudioTimetableGraphPreset(preset))
    throw new Error(`Unknown timetable preset: ${presetId}`);
  if (preset.singleton) {
    const existingId = next.domains.timetable.rootNodeIds.find(
      (id) => next.domains.timetable.nodeExtensions[id]?.presetId === presetId,
    );
    if (existingId)
      return {
        document: next,
        nodeId: existingId,
        linkedInput: relinkStudioTimetableGraphPresetInput(next, existingId),
      };
  }
  const inserted = insertStudioTimetableGraphPreset(next, presetId);
  return { document: next, ...inserted };
};

/** Reject malformed new documents; never repair or upgrade old saved data. */
export const validateStudioTimetableGraphStructure = (
  document: StudioTimetableGraphDocument,
): string[] => {
  const errors: string[] = [];
  errors.push(...validateStudioTeamDefinition(document));
  if (document.schema !== "studio_template_document")
    errors.push("Invalid document schema.");
  if (document.domains.thumbnail !== undefined)
    errors.push("Thumbnail domain cannot be stored in a timetable document.");
  if (document.version !== 8 || document.metadata.kind !== "timetable")
    errors.push("Expected a v8 timetable document.");
  if (document.domains.timetable.composition !== undefined)
    errors.push("Composition objects cannot be stored in v8.");
  const nodes = document.graph.nodes;
  const roots = new Set(document.graph.rootNodeIds);
  if (roots.size !== document.graph.rootNodeIds.length)
    errors.push("Duplicate graph roots.");
  const weeklyRoots = document.domains.timetable.rootNodeIds;
  if (new Set(weeklyRoots).size !== weeklyRoots.length)
    errors.push("Duplicate timetable roots.");
  for (const id of weeklyRoots)
    if (!roots.has(id))
      errors.push(`Timetable root is not a graph root: ${id}`);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string, parentId: string | null) => {
    const node = nodes[id];
    if (!node) {
      errors.push(`Missing node: ${id}`);
      return;
    }
    if (node.id !== id) errors.push(`Node key differs from ID: ${id}`);
    if ("style" in node || "kind" in node)
      errors.push(`Inline composition fields cannot be stored: ${id}`);
    if (node.parentId !== parentId) errors.push(`Parent mismatch: ${id}`);
    if (visiting.has(id)) {
      errors.push(`Node cycle: ${id}`);
      return;
    }
    if (visited.has(id)) {
      errors.push(`Node has multiple owners: ${id}`);
      return;
    }
    visited.add(id);
    visiting.add(id);
    if (node.styleId && !document.styles[node.styleId])
      errors.push(`Missing style: ${id}`);
    if (node.variantSet) {
      if ("activeValue" in node.variantSet)
        errors.push(`Editing state cannot be stored: ${id}`);
      for (const root of Object.values(node.variantSet.rootByValue))
        if (root && !node.childIds.includes(root))
          errors.push(`Variant root is not a child: ${id}`);
    }
    node.childIds.forEach((child) => visit(child, id));
    visiting.delete(id);
  };
  document.graph.rootNodeIds.forEach((id) => visit(id, null));
  for (const id of Object.keys(nodes))
    if (!visited.has(id)) errors.push(`Orphan node: ${id}`);
  if (errors.length) return errors;
  try {
    const weeklyIds = getStudioTimetableGraphNodeIds(document);
    for (const id of weeklyIds) {
      if (id.startsWith("day-card:"))
        errors.push(`Reserved virtual day-card ID: ${id}`);
      const node = nodes[id];
      const style = node.styleId ? document.styles[node.styleId] : {};
      if (
        [
          "dateRangeFormat",
          "dateRangeTemplate",
          "assetMode",
          "assetPosition",
          "assetGap",
          "assetSize",
        ].some((key) => style?.[key] !== undefined)
      )
        errors.push(`Format/layout belongs in binding or extension: ${id}`);
      if (node.type === "shape" || node.textAppearance || node.shapeFill)
        errors.push(
          `Timetable structured appearance is not connected yet: ${id}`,
        );
      if (
        Object.keys(node.assetSlots ?? {}).some(
          (key) => key !== "asset" && key !== "inlineDecoration",
        )
      )
        errors.push(`Unknown timetable image slot: ${id}`);
      if (node.type === "image" && node.assetSlots?.inlineDecoration)
        errors.push(`Inline decoration requires text: ${id}`);
    }
    for (const [id, extension] of Object.entries(
      document.domains.timetable.nodeExtensions,
    )) {
      if (!weeklyIds.has(id)) {
        errors.push(`Extension belongs outside timetable: ${id}`);
        continue;
      }
      if (
        extension.inlineAssetLayout &&
        nodes[id].type !== "text" &&
        nodes[id].type !== "flexibleText"
      )
        errors.push(`Inline layout requires text: ${id}`);
      if (
        extension.generator &&
        (extension.generator.kind !== "dayCards" ||
          id !== STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID ||
          nodes[id].type !== "group" ||
          nodes[id].childIds.length)
      )
        errors.push(`Invalid day-cards generator: ${id}`);
    }
    const generator =
      document.domains.timetable.nodeExtensions[
        STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID
      ]?.generator;
    if (!generator) errors.push("Missing day-cards generator.");
    const cardRoots = Object.values(
      document.domains.timetable.components,
    ).flatMap((c) => Object.values(c.variants).map((v) => v.rootNodeId));
    for (const id of cardRoots)
      if (weeklyIds.has(id))
        errors.push(`Card design belongs inside timetable roots: ${id}`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
};

/** Validate native graph data and the shared document contracts without a render projection. */
export const validateStudioTimetableGraphDocument = (
  document: StudioTimetableGraphDocument,
): string[] =>
  validateStudioDocument(document)
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.detail);

export const parseStudioTimetableGraphDocument = (
  json: string,
): StudioTimetableGraphDocument => {
  const value: unknown = JSON.parse(json);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 8
  )
    throw new Error("Only new v8 timetable documents are supported.");
  const document = value as StudioTimetableGraphDocument;
  let errors: string[];
  try {
    errors = validateStudioTimetableGraphDocument(document);
  } catch {
    throw new Error("Malformed v8 timetable document.");
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return document;
};
