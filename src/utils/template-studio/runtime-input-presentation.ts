import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import type { StudioTimetableGraphNode } from "@/types/studio-timetable-graph";
import { requireStudioTimetableGraphDocument } from "./timetable-graph-commands";
import {
  getStudioTimetableNodeChildIds,
  getStudioTimetableNodeRuntimeVariant,
  getStudioTimetableNodeExtension,
  getStudioTimetableNodeStyle,
} from "./timetable-graph-queries";
import { findStudioArtistProfileTextInput } from "@/utils/template-studio/preset-inputs";
import { getStudioTextWrapMode } from "@/utils/template-studio/text-wrap";

const resolveArtistTextObject = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
): StudioTimetableGraphNode | null => {
  if (document.version !== 8) return null;
  const graph = requireStudioTimetableGraphDocument(document);
  const visited = new Set<string>();
  const visit = (id: string): StudioTimetableGraphNode | null => {
    if (visited.has(id)) return null;
    visited.add(id);
    const node = graph.graph.nodes[id];
    if (!node) return null;
    const extension = getStudioTimetableNodeExtension(graph, id);
    if (
      extension.structuredRole === "text" &&
      (node.type === "text" || node.type === "flexibleText")
    )
      return node;
    for (const childId of getStudioTimetableNodeChildIds(
      node,
      getStudioTimetableNodeRuntimeVariant(graph, values, node),
    )) {
      const text = visit(childId);
      if (text) return text;
    }
    return null;
  };
  for (const id of graph.domains.timetable.rootNodeIds) {
    if (
      getStudioTimetableNodeExtension(graph, id).presetId !==
      "artistProfileText"
    )
      continue;
    const text = visit(id);
    if (text) return text;
  }
  return null;
};

/**
 * Artist's runtime control follows the text object's line-break setting.
 *
 * Other text inputs, and states without a text node, use the input definition.
 */
export const getStudioRuntimeInputMultiline = (
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
  input: StudioInputDefinition,
): boolean => {
  if (input.type !== "text") return false;

  const artistInput = findStudioArtistProfileTextInput(document);
  if (!artistInput || artistInput.id !== input.id) {
    return Boolean(input.multiline);
  }

  const textObject = resolveArtistTextObject(document, runtimeValues);
  return textObject
    ? getStudioTextWrapMode(
        getStudioTimetableNodeStyle(document, textObject),
      ) === "preserve"
    : Boolean(input.multiline);
};
