import type {
  StudioGraphNode,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  createStudioBindingForInput,
  isStudioImageNode,
  isStudioTextNode,
  resolveStudioAsset,
  resolveStudioTextBinding,
} from "@/utils/template-studio/binding-resolver";
import { createStudioId } from "@/utils/template-studio/id";
import {
  applyThumbnailStudioAddInput,
  applyThumbnailStudioDeleteInput,
} from "@/utils/thumbnail-studio/input-commands";

const getNode = (
  document: StudioTemplateDocument,
  nodeId: string,
): StudioGraphNode | null => document.graph.nodes[nodeId] ?? null;

const withFallback = (
  node: StudioGraphNode,
  fallback: NonNullable<StudioGraphNode["meta"]>["bindingFallback"],
) => {
  node.meta = { ...(node.meta ?? {}), bindingFallback: fallback };
};

const clearFallback = (node: StudioGraphNode) => {
  if (!node.meta?.bindingFallback) return;
  const nextMeta = { ...node.meta };
  delete nextMeta.bindingFallback;
  node.meta = nextMeta;
};

/** 현재 정적 binding을 다음 동적 binding의 복원 값으로 한 번만 저장한다. */
const rememberStaticFallback = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
) => {
  if (node.meta?.bindingFallback) return;
  if (node.binding?.kind === "staticText") {
    withFallback(node, { kind: "staticText", value: node.binding.value });
    return;
  }
  if (
    node.binding?.kind === "staticAsset" &&
    document.assets[node.binding.assetId]
  ) {
    withFallback(node, {
      kind: "staticAsset",
      assetId: node.binding.assetId,
    });
  }
};

/** Thumbnail은 global 입력만 source로 허용한다. */
export const applyThumbnailStudioBindNodeToInput = (
  document: StudioTemplateDocument,
  nodeId: string,
  inputId: string,
): boolean => {
  const node = getNode(document, nodeId);
  const input = document.inputs[inputId];
  if (!node || !input || input.scope !== "global" || node.locked) return false;

  const binding = createStudioBindingForInput(node, input);
  if (!binding) return false;

  rememberStaticFallback(document, node);
  node.binding = binding;
  return true;
};

/** Week Dates builtin binding에 표시 형식을 저장한다. */
export const applyThumbnailStudioSetWeekDateFormatting = (
  document: StudioTemplateDocument,
  nodeId: string,
  format: string,
  template: string,
): boolean => {
  const node = getNode(document, nodeId);
  if (
    !node ||
    node.locked ||
    node.binding?.kind !== "builtinField" ||
    (node.binding.fieldId !== "week.start_date" &&
      node.binding.fieldId !== "week.date_range")
  ) {
    return false;
  }

  node.binding = {
    ...node.binding,
    dateRangeFormat: format,
    dateRangeTemplate: template,
  };
  return true;
};

/** 노드의 현재 resolver 결과를 default로 삼아 input을 만들고 즉시 연결한다. */
export const applyThumbnailStudioCreateInputForNode = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  nodeId: string,
): string | null => {
  const node = getNode(document, nodeId);
  if (
    !node ||
    node.locked ||
    (!isStudioTextNode(node) && !isStudioImageNode(node))
  ) {
    return null;
  }

  if (isStudioTextNode(node)) {
    const input = applyThumbnailStudioAddInput(document, "text");
    const value =
      resolveStudioTextBinding(document, values, node.binding) || node.label;
    input.label = node.label || input.label;
    if (input.type === "text") {
      input.defaultValue = value;
      input.placeholder = value;
    }
    return applyThumbnailStudioBindNodeToInput(document, nodeId, input.id)
      ? input.id
      : null;
  }

  const asset = resolveStudioAsset(document, values, node.binding);
  const input = applyThumbnailStudioAddInput(document, "image");
  input.label = node.label || input.label;
  if (input.type === "image") input.defaultUrl = asset?.src ?? "";
  return applyThumbnailStudioBindNodeToInput(document, nodeId, input.id)
    ? input.id
    : null;
};

/** consumer를 preview 결과로 해제한 뒤 input과 session-facing references를 삭제한다. */
export const applyThumbnailStudioDeleteInputWithMaterialize = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  inputId: string,
): boolean => {
  const input = document.inputs[inputId];
  if (!input || input.scope !== "global") return false;

  const hasLockedConsumer = Object.values(document.graph.nodes).some((node) => {
    const bindingUsesInput =
      node.binding &&
      "inputId" in node.binding &&
      node.binding.inputId === inputId;
    const slotUsesInput = Object.values(node.assetSlots ?? {}).some(
      (slot) => slot.inputId === inputId,
    );
    return Boolean(node.locked && (bindingUsesInput || slotUsesInput));
  });
  if (hasLockedConsumer) return false;

  // 모든 consumer가 정적 값으로 바뀔 수 있는지 복제본에서 먼저 확인한다. 하나라도
  // 실패하면 원본 document에는 어떤 변경도 남기지 않는다.
  const next = structuredClone(document);
  for (const node of Object.values(next.graph.nodes)) {
    if (
      node.binding &&
      "inputId" in node.binding &&
      node.binding.inputId === inputId &&
      !applyThumbnailStudioMaterializeNodeBinding(next, values, node.id) &&
      !applyThumbnailStudioRestoreNodeBindingFallback(next, node.id)
    ) {
      return false;
    }

    for (const slot of Object.values(node.assetSlots ?? {})) {
      if (slot.inputId !== inputId) continue;
      const resolvedAsset = resolveStudioAsset(next, values, {
        kind: "inputImage",
        inputId,
      });
      const fallbackAssetId =
        slot.assetId && next.assets[slot.assetId] ? slot.assetId : null;
      const assetId = resolvedAsset
        ? ensureStudioMaterializedAsset(next, node, resolvedAsset)
        : fallbackAssetId;
      if (!assetId) return false;
      slot.assetId = assetId;
      slot.inputId = undefined;
    }
  }

  if (!applyThumbnailStudioDeleteInput(next, inputId)) return false;
  Object.assign(document, next);
  return true;
};

const ensureStudioMaterializedAsset = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
  asset: { id: string; label: string; src: string },
): string => {
  if (document.assets[asset.id]) return asset.id;

  let assetId = createStudioId("asset");
  while (document.assets[assetId]) assetId = createStudioId("asset");
  document.assets[assetId] = {
    id: assetId,
    label: `${node.label} materialized image`,
    src: asset.src,
  };
  return assetId;
};

/** 현재 binding의 실제 preview 결과를 정적 값으로 materialize한다. */
export const applyThumbnailStudioMaterializeNodeBinding = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  nodeId: string,
): boolean => {
  const node = getNode(document, nodeId);
  if (!node || node.locked || !node.binding) return false;

  if (isStudioTextNode(node)) {
    const value = resolveStudioTextBinding(document, values, node.binding);
    node.binding = { kind: "staticText", value };
    clearFallback(node);
    return true;
  }

  if (isStudioImageNode(node)) {
    const asset = resolveStudioAsset(document, values, node.binding);
    if (!asset) return false;
    const assetId = ensureStudioMaterializedAsset(document, node, asset);
    node.binding = { kind: "staticAsset", assetId };
    clearFallback(node);
    return true;
  }

  return false;
};

/** 동적 연결 전의 fallback이 있으면 그 값으로 복원하고 메타데이터를 비운다. */
export const applyThumbnailStudioRestoreNodeBindingFallback = (
  document: StudioTemplateDocument,
  nodeId: string,
): boolean => {
  const node = getNode(document, nodeId);
  const fallback = node?.meta?.bindingFallback;
  if (!node || node.locked || !fallback) return false;

  if (fallback.kind === "staticAsset" && !document.assets[fallback.assetId]) {
    return false;
  }

  node.binding =
    fallback.kind === "staticText"
      ? { kind: "staticText", value: fallback.value }
      : { kind: "staticAsset", assetId: fallback.assetId };
  clearFallback(node);
  return true;
};

/** select를 텍스트로 쓰는 노드가 label/value 중 어느 쪽을 보여줄지 바꾼다. */
export const applyThumbnailStudioSetSelectTextOutput = (
  document: StudioTemplateDocument,
  nodeId: string,
  output: "label" | "value",
): boolean => {
  const node = getNode(document, nodeId);
  if (!node || node.locked || node.binding?.kind !== "selectText") {
    return false;
  }
  node.binding.output = output;
  return true;
};

/** select option과 정적 asset 사이의 mapping을 갱신한다. */
export const applyThumbnailStudioSetSelectAssetMapping = (
  document: StudioTemplateDocument,
  nodeId: string,
  optionValue: string,
  assetId: string | null,
): boolean => {
  const node = getNode(document, nodeId);
  if (
    !node ||
    node.locked ||
    node.binding?.kind !== "selectAsset" ||
    !document.assets[assetId ?? ""]
  ) {
    if (assetId !== null) return false;
  }
  if (!node || node.locked || node.binding?.kind !== "selectAsset") {
    return false;
  }
  node.binding.assetByOption[optionValue] = assetId;
  return true;
};

/** 입력 source 변경이 가능한 node인지 UI가 공통으로 판단할 수 있게 한다. */
export const isThumbnailStudioBindingNode = (node: StudioGraphNode): boolean =>
  isStudioTextNode(node) || isStudioImageNode(node);
