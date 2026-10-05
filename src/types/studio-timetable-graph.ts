import type {
  StudioGraphNode,
  StudioNodeGraph,
  StudioTemplateDocument,
  StudioTimetableDomain,
  StudioTimetableObjectPresetId,
  StudioTimetableObjectVariantSet,
  StudioTimetableProfileObjectRole,
  StudioTimetableStructuredObjectRole,
} from "./template-studio";

/** New-document contract. Old saved documents are not accepted or converted. */
export type StudioObjectVariantSet = Omit<
  StudioTimetableObjectVariantSet,
  "activeValue"
>;
export interface StudioTimetableGraphNode extends StudioGraphNode {
  variantSet?: StudioObjectVariantSet;
}
export interface StudioTimetableNodeExtension {
  presetId?: StudioTimetableObjectPresetId;
  profileRole?: StudioTimetableProfileObjectRole;
  structuredRole?: StudioTimetableStructuredObjectRole;
  generator?: { kind: "dayCards" };
  inlineAssetLayout?: {
    mode?: "visible" | "hidden";
    position?: "left" | "right";
    gap?: number;
    size?: number;
  };
}
export interface StudioTimetableGraphDomain extends Omit<
  StudioTimetableDomain,
  "composition"
> {
  composition?: never;
  rootNodeIds: string[];
  nodeExtensions: Record<string, StudioTimetableNodeExtension>;
}
export interface StudioTimetableGraphDocument extends Omit<
  StudioTemplateDocument,
  "version" | "graph" | "domains"
> {
  version: 8;
  graph: Omit<StudioNodeGraph, "nodes"> & {
    nodes: Record<string, StudioTimetableGraphNode>;
  };
  domains: { timetable: StudioTimetableGraphDomain; thumbnail?: never };
}
