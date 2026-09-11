import type {
  StudioAsset,
  StudioBinding,
  StudioGraphNode,
  StudioNodeId,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableComponentId,
} from "@/types/template-studio";
import type { StudioFigmaGridCandidate } from "@/types/template-studio-figma";
import {
  applyStudioTimetableComponentFrames,
  ensureStudioVariantEntryGroups,
  getStudioTimetableComponentFrame,
} from "@/utils/template-studio/entry-groups";
import { createStudioId } from "@/utils/template-studio/id";
import { ensureStudioVariantSyncKeys } from "@/utils/template-studio/status-variants";
import {
  ensureStudioTimetableCapabilityStatus,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import { validateStudioDocument } from "@/utils/template-studio/validator";

export type StudioFigmaGridCandidateImportResult =
  | {
      ok: true;
      componentId: StudioTimetableComponentId;
      rootNodeIds: StudioNodeId[];
      warnings: string[];
    }
  | { ok: false; reason: string };

const SAFE_STYLE_KEYS = new Set([
  "position",
  "left",
  "top",
  "width",
  "height",
  "opacity",
  "rotateDeg",
  "backgroundColor",
  "borderRadius",
  "overflow",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "display",
  "alignItems",
  "justifyContent",
  "color",
]);
const DATA_IMAGE_SOURCE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i;
const SAFE_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);
const NODE_TYPES = new Set(["group", "text", "image", "flexibleText", "shape"]);
const BUILTIN_FIELD_IDS = new Set([
  "day.label",
  "day.short_label",
  "day.date",
  "day.offline_memo",
  "day.is_offline",
  "week.date_range",
  "week.start_date",
  "week.end_date",
  "entry.main_title",
  "entry.sub_title",
  "entry.time",
  "entry.status",
  "entry.status_label",
  "entry.is_offline",
  "entry.is_multi",
  "entry.is_offline_memo",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneData = <T>(value: T): T => structuredClone(value);

const redactSourceUrls = <T>(value: T, seen = new WeakMap<object, unknown>()): T => {
  if (typeof value === "string") return removeUrl(value) as T;
  if (Array.isArray(value)) {
    const existing = seen.get(value);
    if (existing) return existing as T;
    const result: unknown[] = [];
    seen.set(value, result);
    value.forEach((child) => result.push(redactSourceUrls(child, seen)));
    return result as T;
  }
  if (!isRecord(value)) return value;
  const existing = seen.get(value);
  if (existing) return existing as T;
  const result: Record<string, unknown> = {};
  seen.set(value, result);
  Object.entries(value).forEach(([key, child]) => {
    result[key] = redactSourceUrls(child, seen);
  });
  return result as T;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const removeUrl = (value: string): string =>
  value.replace(/(?:https?|mcp):\/\/\S+/gi, "");

const normalizeLabel = (value: string): string =>
  removeUrl(value).replace(/\s+/g, " ").trim();

const safeLabel = (value: string, fallback: string): string =>
  normalizeLabel(value).slice(0, 160) || fallback;

const safeWarning = (value: string): string =>
  normalizeLabel(value).slice(0, 500) || "Imported candidate warning was redacted.";

const hasUnsafeStyleValue = (value: string | number | undefined): boolean =>
  (typeof value !== "string" && typeof value !== "number" && value !== undefined) ||
  (typeof value === "number" && !Number.isFinite(value)) ||
  (typeof value === "string" && (/url\s*\(/i.test(value) || /(?:https?|mcp|data):/i.test(value)));

const validateBinding = (
  binding: unknown,
  assetIds: Set<string>,
): string | null => {
  if (!isRecord(binding) || typeof binding.kind !== "string") {
    return "Candidate node has an invalid binding";
  }

  switch (binding.kind) {
    case "staticText":
      return typeof binding.value === "string" && !/(?:https?|mcp|data):/i.test(binding.value)
        ? null
        : "Candidate binding contains an unsafe static text value";
    case "inputText":
    case "inputImage":
      return typeof binding.inputId === "string" && binding.inputId.length > 0
        ? null
        : "Candidate binding has an invalid input reference";
    case "builtinField":
      return typeof binding.fieldId === "string" && BUILTIN_FIELD_IDS.has(binding.fieldId)
        ? null
        : "Candidate binding has an invalid builtin field";
    case "staticAsset":
      return typeof binding.assetId === "string" && assetIds.has(binding.assetId)
        ? null
        : "Candidate binding has an invalid asset reference";
    case "selectText":
      return typeof binding.inputId === "string" &&
        (binding.output === "value" || binding.output === "label")
        ? null
        : "Candidate binding has an invalid select-text reference";
    case "selectAsset": {
      if (typeof binding.inputId !== "string" || !isRecord(binding.assetByOption)) {
        return "Candidate binding has an invalid select-asset reference";
      }
      return Object.values(binding.assetByOption).every(
        (assetId) => assetId === null || (typeof assetId === "string" && assetIds.has(assetId)),
      )
        ? null
        : "Candidate binding has an invalid asset reference";
    }
    default:
      return "Candidate node has an unsupported binding kind";
  }
};

const validateCandidate = (
  candidate: StudioFigmaGridCandidate,
  document: StudioTemplateDocument,
): string | null => {
  const component = candidate?.component;
  if (!component || !isRecord(component.nodes) || !isRecord(component.styles) || !Array.isArray(component.assets)) {
    return "Candidate component graph is malformed";
  }
  if (
    typeof candidate.candidateId !== "string" ||
    candidate.candidateId.length === 0 ||
    typeof candidate.label !== "string" ||
    !isRecord(candidate.frame) ||
    !Array.isArray(candidate.reviews) ||
    !Array.isArray(candidate.warnings) ||
    candidate.warnings.some((warning) => typeof warning !== "string")
  ) {
    return "Candidate label or frame is malformed";
  }
  if ([candidate.frame.left, candidate.frame.top, candidate.frame.width, candidate.frame.height].some(
    (value) => !isFiniteNumber(value),
  ) || candidate.frame.width <= 0 || candidate.frame.height <= 0) {
    return "Candidate frame is invalid";
  }
  if (typeof component.rootNodeId !== "string" || !component.nodes[component.rootNodeId]) {
    return "Candidate root node is missing";
  }

  const sourceIds = new Set<string>();
  const addSourceId = (id: unknown): boolean => {
    if (typeof id !== "string" || !id || sourceIds.has(id)) return false;
    sourceIds.add(id);
    return true;
  };
  const assetIds = new Set<string>();
  for (const asset of component.assets) {
    if (!isRecord(asset) || !addSourceId(asset.id) || typeof asset.label !== "string") {
      return "Candidate assets contain duplicate or malformed IDs";
    }
    if (
      typeof asset.src !== "string" ||
      !DATA_IMAGE_SOURCE.test(asset.src) ||
      (asset.mimeType !== undefined &&
        (typeof asset.mimeType !== "string" || !SAFE_IMAGE_MIME_TYPES.has(asset.mimeType)))
    ) {
      return "Candidate asset source must be a supported data URL";
    }
    if (
      (asset.width !== undefined && !isFiniteNumber(asset.width)) ||
      (asset.height !== undefined && !isFiniteNumber(asset.height)) ||
      (asset.byteSize !== undefined && (!isFiniteNumber(asset.byteSize) || asset.byteSize < 0))
    ) {
      return "Candidate asset metadata is malformed";
    }
    assetIds.add(asset.id);
  }

  if (/(?:https?|mcp):\/\//i.test(JSON.stringify(candidate.component))) {
    return "Candidate contains an unsafe source URL";
  }

  const childParentIds = new Map<string, string>();
  const nodeIds = new Set<string>();
  for (const [nodeId, nodeValue] of Object.entries(component.nodes)) {
    if (!isRecord(nodeValue) || nodeValue.id !== nodeId || !addSourceId(nodeId)) {
      return "Candidate nodes contain duplicate or malformed IDs";
    }
    if (
      typeof nodeValue.label !== "string" ||
      !NODE_TYPES.has(String(nodeValue.type)) ||
      !Array.isArray(nodeValue.childIds) ||
      (nodeValue.parentId !== null && typeof nodeValue.parentId !== "string")
    ) {
      return "Candidate node is malformed";
    }
    if (nodeValue.styleId !== undefined && typeof nodeValue.styleId !== "string") {
      return "Candidate node has an invalid style reference";
    }
    if (nodeValue.styleId && !component.styles[nodeValue.styleId]) {
      return "Candidate node references an unknown style ID";
    }
    const childIds = nodeValue.childIds as unknown[];
    if (new Set(childIds).size !== childIds.length || childIds.some((childId) => typeof childId !== "string")) {
      return "Candidate node has duplicate or invalid child links";
    }
    for (const childId of childIds as string[]) {
      const parentId = childParentIds.get(childId);
      if (parentId && parentId !== nodeId) return "Candidate graph has a multi-parent link";
      childParentIds.set(childId, nodeId);
    }
    const binding = nodeValue.binding;
    if (binding !== undefined) {
      const bindingError = validateBinding(binding, assetIds);
      if (bindingError) return bindingError;
    }
    const assetSlots = nodeValue.assetSlots;
    if (assetSlots !== undefined && !isRecord(assetSlots)) return "Candidate node has invalid asset slots";
    for (const slot of Object.values(assetSlots ?? {})) {
      if (
        !isRecord(slot) ||
        (slot.assetId !== undefined &&
          slot.assetId !== null &&
          (typeof slot.assetId !== "string" || !assetIds.has(slot.assetId)))
      ) {
        return "Candidate node has an invalid asset binding";
      }
    }
    nodeIds.add(nodeId);
  }

  for (const styleId of Object.keys(component.styles)) {
    if (!addSourceId(styleId)) return "Candidate styles contain duplicate or colliding IDs";
    const style = component.styles[styleId];
    if (!isRecord(style)) return "Candidate style is malformed";
    for (const [key, value] of Object.entries(style)) {
      if (!SAFE_STYLE_KEYS.has(key) || hasUnsafeStyleValue(value as string | number | undefined)) {
        return "Candidate style contains an unsafe value";
      }
    }
  }

  const root = component.nodes[component.rootNodeId] as StudioGraphNode;
  if (root.parentId !== null) return "Candidate root node has a parent";
  for (const [nodeId, nodeValue] of Object.entries(component.nodes)) {
    const node = nodeValue as StudioGraphNode;
    if (nodeId === component.rootNodeId) continue;
    const expectedParentId = childParentIds.get(nodeId);
    if (!expectedParentId || node.parentId !== expectedParentId) return "Candidate graph has an orphan or invalid parent link";
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return false;
    if (visited.has(nodeId)) return true;
    const node = component.nodes[nodeId] as StudioGraphNode | undefined;
    if (!node) return false;
    visiting.add(nodeId);
    const valid = node.childIds.every((childId) => visit(childId));
    visiting.delete(nodeId);
    visited.add(nodeId);
    return valid;
  };
  if (!visit(component.rootNodeId) || visited.size !== nodeIds.size) {
    return "Candidate graph contains an orphan or cycle";
  }

  const entryGroups = Object.values(component.nodes).filter(
    (node) => (node as StudioGraphNode).meta?.entrySlot?.index === 0,
  ) as StudioGraphNode[];
  if (
    entryGroups.length !== 1 ||
    !root.childIds.includes(entryGroups[0]!.id)
  ) {
    return "Candidate must contain exactly one direct entry slot at index 0";
  }

  const documentErrors = validateStudioDocument(document).filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  return documentErrors.length > 0 ? "Document timetable domain is invalid" : null;
};

const remapBindingAssets = (
  binding: StudioBinding | undefined,
  assetIdBySourceId: Map<string, string>,
): StudioBinding | undefined => {
  if (!binding) return undefined;
  const next = cloneData(binding);
  if (next.kind === "staticAsset") {
    next.assetId = assetIdBySourceId.get(next.assetId)!;
  } else if (next.kind === "selectAsset") {
    next.assetByOption = Object.fromEntries(
      Object.entries(next.assetByOption).map(([option, assetId]) => [
        option,
        assetId ? assetIdBySourceId.get(assetId)! : null,
      ]),
    );
  } else if (next.kind === "staticText") {
    next.value = removeUrl(next.value);
  }
  return next;
};

const remapAssetSlots = (
  slots: StudioGraphNode["assetSlots"],
  assetIdBySourceId: Map<string, string>,
) => {
  if (!slots) return undefined;
  return Object.fromEntries(
    Object.entries(cloneData(slots)).map(([name, slot]) => [
      name,
      slot.assetId ? { ...slot, assetId: assetIdBySourceId.get(slot.assetId)! } : slot,
    ]),
  );
};

const restoreExistingComponentFrames = (
  source: StudioTemplateDocument,
  draft: StudioTemplateDocument,
  existingComponentIds: string[],
) => {
  const sourceTimetable = source.domains?.timetable;
  const draftTimetable = draft.domains?.timetable;
  if (!sourceTimetable || !draftTimetable) return;
  for (const componentId of existingComponentIds) {
    const sourceComponent = sourceTimetable.components[componentId];
    if (!sourceComponent) continue;
    draftTimetable.components[componentId] = cloneData(sourceComponent);
    for (const variant of Object.values(sourceComponent.variants)) {
      const styleId = source.graph.nodes[variant.rootNodeId]?.styleId;
      if (styleId && source.styles[styleId]) draft.styles[styleId] = cloneData(source.styles[styleId]);
    }
  }
};

/**
 * Adds a reviewed, transient Figma GRID candidate as a new unassigned component
 * set. Validation and ID remapping finish before the passed document is mutated.
 */
export const applyStudioFigmaGridCandidate = (
  document: StudioTemplateDocument,
  candidate: StudioFigmaGridCandidate,
): StudioFigmaGridCandidateImportResult => {
  // `reviewNodeIds` is transient UI metadata. Only candidate.component is merged;
  // source-node mappings and all other review metadata are intentionally ignored.
  const timetable = document.domains?.timetable;
  if (!timetable) return { ok: false, reason: "Document timetable domain is missing" };
  const validationError = validateCandidate(candidate, document);
  if (validationError) return { ok: false, reason: validationError };

  const draft = cloneData(document);
  const draftTimetable = draft.domains!.timetable!;
  const existingComponentIds = Object.keys(timetable.components);
  const occupiedIds = new Set([
    ...Object.keys(draft.graph.nodes),
    ...Object.keys(draft.styles),
    ...Object.keys(draft.assets),
    ...Object.keys(draftTimetable.components),
  ]);
  const freshId = (prefix: string) => {
    let id = createStudioId(prefix);
    while (occupiedIds.has(id)) id = createStudioId(prefix);
    occupiedIds.add(id);
    return id;
  };
  const componentId = freshId("component");
  const assetIdBySourceId = new Map<string, string>();
  for (const sourceAsset of candidate.component.assets) {
    const assetId = freshId("asset");
    assetIdBySourceId.set(sourceAsset.id, assetId);
    const transientAsset = cloneData(sourceAsset);
    delete transientAsset.storageProvider;
    delete transientAsset.storagePath;
    delete transientAsset.publicUrl;
    delete transientAsset.contentHash;
    delete transientAsset.lastSyncedAt;
    draft.assets[assetId] = {
      ...redactSourceUrls(cloneData(transientAsset)),
      id: assetId,
      label: safeLabel(sourceAsset.label, "Imported Figma asset"),
    } satisfies StudioAsset;
  }

  const nodeIdBySourceId = new Map<string, string>();
  const styleIdBySourceId = new Map<string, string>();
  Object.keys(candidate.component.nodes).forEach((sourceNodeId) =>
    nodeIdBySourceId.set(sourceNodeId, freshId("node")),
  );
  Object.keys(candidate.component.styles).forEach((sourceStyleId) =>
    styleIdBySourceId.set(sourceStyleId, freshId("style")),
  );
  for (const [sourceStyleId, sourceStyle] of Object.entries(candidate.component.styles)) {
    draft.styles[styleIdBySourceId.get(sourceStyleId)!] = cloneData(sourceStyle) as StudioStyleRecord;
  }
  for (const [sourceNodeId, sourceNode] of Object.entries(candidate.component.nodes)) {
    const nextNode = redactSourceUrls(cloneData(sourceNode));
    const meta = nextNode.meta ? cloneData(nextNode.meta) : undefined;
    if (meta) delete meta.variantSyncKey;
    nextNode.id = nodeIdBySourceId.get(sourceNodeId)!;
    nextNode.label = safeLabel(nextNode.label, "Imported Figma layer");
    nextNode.parentId = nextNode.parentId
      ? nodeIdBySourceId.get(nextNode.parentId)!
      : null;
    nextNode.childIds = nextNode.childIds.map((childId) => nodeIdBySourceId.get(childId)!);
    nextNode.styleId = nextNode.styleId
      ? styleIdBySourceId.get(nextNode.styleId)!
      : undefined;
    nextNode.binding = remapBindingAssets(nextNode.binding, assetIdBySourceId);
    nextNode.assetSlots = remapAssetSlots(nextNode.assetSlots, assetIdBySourceId);
    nextNode.meta = meta && Object.keys(meta).length > 0 ? meta : undefined;
    draft.graph.nodes[nextNode.id] = nextNode;
  }

  const cloneVariantRoot = (sourceRootId: string): string => {
    const cloneNode = (sourceNodeId: string, parentId: string | null): string => {
      const sourceNode = draft.graph.nodes[sourceNodeId]!;
      const nodeId = freshId("node");
      const styleId = sourceNode.styleId ? freshId("style") : undefined;
      if (sourceNode.styleId && styleId) draft.styles[styleId] = cloneData(draft.styles[sourceNode.styleId]!);
      const meta = sourceNode.meta ? cloneData(sourceNode.meta) : undefined;
      if (meta) delete meta.variantSyncKey;
      const cloned: StudioGraphNode = {
        ...cloneData(sourceNode),
        id: nodeId,
        parentId,
        childIds: [],
        styleId,
        meta: meta && Object.keys(meta).length > 0 ? meta : undefined,
      };
      draft.graph.nodes[nodeId] = cloned;
      cloned.childIds = sourceNode.childIds.map((childId) => cloneNode(childId, nodeId));
      return nodeId;
    };
    return cloneNode(sourceRootId, null);
  };

  const onlineRootNodeId = nodeIdBySourceId.get(candidate.component.rootNodeId)!;
  const offlineRootNodeId = cloneVariantRoot(onlineRootNodeId);
  draft.graph.rootNodeIds.push(onlineRootNodeId, offlineRootNodeId);
  draftTimetable.components[componentId] = {
    id: componentId,
    label: (() => {
      const base = safeLabel(candidate.label, "Imported Figma card");
      const labels = new Set(Object.values(draftTimetable.components).map((component) => component.label));
      if (!labels.has(base)) return base;
      let suffix = 2;
      while (labels.has(`${base} ${suffix}`)) suffix += 1;
      return `${base} ${suffix}`;
    })(),
    frame: { left: 0, top: 0, width: candidate.frame.width, height: candidate.frame.height },
    defaultStatusId: "online",
    variants: {
      online: { statusId: "online", rootNodeId: onlineRootNodeId },
      offline: { statusId: "offline", rootNodeId: offlineRootNodeId },
    },
  };
  ensureStudioVariantSyncKeys(draft, onlineRootNodeId);
  ensureStudioVariantSyncKeys(draft, offlineRootNodeId);

  const synthesizedWarnings: string[] = [];
  const addOfflineMemoText = (rootNodeId: StudioNodeId) => {
    const root = draft.graph.nodes[rootNodeId];
    if (!root) return;

    const visited = new Set<StudioNodeId>();
    const hasOfflineMemoText = (nodeId: StudioNodeId): boolean => {
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      const node = draft.graph.nodes[nodeId];
      if (!node) return false;
      if (
        node.binding?.kind === "builtinField" &&
        node.binding.fieldId === "day.offline_memo"
      ) {
        return true;
      }
      return node.childIds.some(hasOfflineMemoText);
    };
    if (hasOfflineMemoText(root.id)) return;

    const component = draftTimetable.components[componentId]!;
    const frame =
      component.frame ?? getStudioTimetableComponentFrame(draft, component);
    const styleId = freshId("style");
    draft.styles[styleId] = {
      position: "absolute",
      left: Math.round(frame.width * 0.18),
      top: Math.round(frame.height * 0.32),
      width: Math.round(frame.width * 0.64),
      height: Math.round(frame.height * 0.36),
      fontSize: 32,
      fontWeight: 700,
      color: "#475569",
      display: "flex",
      alignItems: "center",
    };
    const nodeId = freshId("node");
    draft.graph.nodes[nodeId] = {
      id: nodeId,
      type: "flexibleText",
      label: "offline_memo",
      parentId: root.id,
      childIds: [],
      styleId,
      binding: {
        kind: "builtinField",
        fieldId: "day.offline_memo",
      },
      meta: { variantSyncKey: "builtin:day.offline_memo" },
    };
    root.childIds.push(nodeId);
  };

  const capabilities = getStudioTimetableCapabilities(draftTimetable);
  ( [
    ["multi", "online"],
    ["offlineMemo", "offline"],
  ] as const).forEach(([capabilityKey, sourceStatusId]) => {
    if (!capabilities[capabilityKey].enabled) return;

    ensureStudioTimetableCapabilityStatus(draftTimetable, capabilityKey);
    const component = draftTimetable.components[componentId]!;
    if (component.variants[capabilityKey]) return;
    const sourceVariant = component.variants[sourceStatusId];
    if (!sourceVariant) return;

    const rootNodeId = cloneVariantRoot(sourceVariant.rootNodeId);
    draft.graph.rootNodeIds.push(rootNodeId);
    component.variants[capabilityKey] = {
      statusId: capabilityKey,
      rootNodeId,
    };
    ensureStudioVariantEntryGroups(draft, component, capabilityKey);
    if (capabilityKey === "offlineMemo") addOfflineMemoText(rootNodeId);
    ensureStudioVariantSyncKeys(draft, rootNodeId);
    const capabilityLabel =
      capabilityKey === "offlineMemo" ? "offline memo" : capabilityKey;
    synthesizedWarnings.push(
      `Synthesized compliant ${capabilityLabel} fallback variant for ${component.label} because the candidate had no explicit optional ${capabilityLabel} variant.`,
    );
  });

  applyStudioTimetableComponentFrames(draft);
  restoreExistingComponentFrames(document, draft, existingComponentIds);

  if (validateStudioDocument(draft).some((diagnostic) => diagnostic.severity === "error")) {
    return { ok: false, reason: "Imported candidate would violate document validation" };
  }

  document.graph.nodes = draft.graph.nodes;
  document.graph.rootNodeIds = draft.graph.rootNodeIds;
  document.styles = draft.styles;
  document.assets = draft.assets;
  timetable.components = draftTimetable.components;

  const warnings = candidate.warnings.map(safeWarning);
  const originalCapabilities = getStudioTimetableCapabilities(timetable);
  warnings.push(
    originalCapabilities.multi.enabled
      ? synthesizedWarnings.find((warning) => /multi fallback variant/i.test(warning)) ??
        "Optional multi variant was already present and was preserved."
      : "Optional multi status is disabled and was not imported.",
    originalCapabilities.offlineMemo.enabled
      ? synthesizedWarnings.find((warning) => /offline memo fallback variant/i.test(warning)) ??
        "Optional offline memo variant was already present and was preserved."
      : "Optional offline memo status is disabled and was not imported.",
  );
  return {
    ok: true,
    componentId,
    rootNodeIds: [onlineRootNodeId, offlineRootNodeId],
    warnings,
  };
};
