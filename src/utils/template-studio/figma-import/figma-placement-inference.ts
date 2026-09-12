import type {
  FigmaNormalizedNode,
  FigmaReviewCandidate,
  FigmaSemanticEvidence,
  FigmaPlacementTextSample,
  StudioFigmaGridVariantStatus,
} from "@/types/template-studio-figma";
import { classifyFigmaTextNode, normalizeFigmaLayerName } from "./figma-text-classifier";

type Placement = {
  instanceId: string;
  status: StudioFigmaGridVariantStatus;
  root: FigmaNormalizedNode;
};

const WEEKDAYS: Record<string, string> = {
  mon: "mon", monday: "mon", 월: "mon", 월요일: "mon",
  tue: "tue", tues: "tue", tuesday: "tue", 화: "tue", 화요일: "tue",
  wed: "wed", wednesday: "wed", 수: "wed", 수요일: "wed",
  thu: "thu", thurs: "thu", thursday: "thu", 목: "thu", 목요일: "thu",
  fri: "fri", friday: "fri", 금: "fri", 금요일: "fri",
  sat: "sat", saturday: "sat", 토: "sat", 토요일: "sat",
  sun: "sun", sunday: "sun", 일: "sun", 일요일: "sun",
};

export const normalizeFigmaSemanticValue = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase().replace(/^0+(?=\d)/, "");

const canonicalWeekday = (value: string): string | undefined =>
  WEEKDAYS[normalizeFigmaSemanticValue(value).replace(/\s+/g, "")];

const isMemoText = (node: FigmaNormalizedNode): boolean => {
  const name = normalizeFigmaLayerName(node.name);
  const value = normalizeFigmaSemanticValue(node.characters ?? "").replace(/\s+/g, "");
  return node.visible === false || name.includes("memo") || value.includes("memo") || value === "restday";
};

const walk = (root: FigmaNormalizedNode): Array<{ node: FigmaNormalizedNode; path: string }> => {
  const result: Array<{ node: FigmaNormalizedNode; path: string }> = [];
  const visit = (node: FigmaNormalizedNode, path: string) => {
    result.push({ node, path });
    node.children?.forEach((child, index) => visit(child, `${path}/${index}`));
  };
  visit(root, "");
  return result;
};

const stringTokens = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => [
    key,
    ...stringTokens(nested),
  ]);
};

const identityTokens = (node: FigmaNormalizedNode): Set<string> => new Set([
  node.id,
  ...stringTokens(node.componentProperties),
  ...(node.overrides ?? []).flatMap((override) => stringTokens(override)),
]);

const localSignature = (node: FigmaNormalizedNode): string => [
  node.type,
  normalizeFigmaLayerName(node.name),
  node.localSize?.width ?? "",
  node.localSize?.height ?? "",
].join("|");

const mappingRank = (mapping: FigmaSemanticEvidence["mapping"]): number =>
  ({ override: 4, stable_path: 3, structural: 2, ambiguous: 0 }[mapping]);

const mergeMapping = (
  current: FigmaSemanticEvidence["mapping"] | undefined,
  next: FigmaSemanticEvidence["mapping"],
): FigmaSemanticEvidence["mapping"] =>
  !current || mappingRank(next) < mappingRank(current) ? next : current;

const createEvidence = (sample: FigmaPlacementTextSample, mapping: FigmaSemanticEvidence["mapping"]): FigmaSemanticEvidence => ({
  samples: [sample],
  sampleValues: [sample.value],
  matchedPlacementCount: 1,
  distinctValueCount: 1,
  signals: mapping === "ambiguous" ? [] : ["stable_origin_mapping"],
  mapping,
});

const addSample = (
  evidence: FigmaSemanticEvidence,
  sample: FigmaPlacementTextSample,
  mapping: FigmaSemanticEvidence["mapping"],
) => {
  if (!evidence.samples.some((entry) => entry.placementInstanceId === sample.placementInstanceId)) {
    evidence.samples.push(sample);
    evidence.sampleValues.push(sample.value);
  }
  evidence.matchedPlacementCount = evidence.samples.length;
  evidence.distinctValueCount = new Set(evidence.sampleValues.map(normalizeFigmaSemanticValue)).size;
  evidence.mapping = mergeMapping(evidence.mapping, mapping);
  if (evidence.mapping !== "ambiguous" && !evidence.signals.includes("stable_origin_mapping")) {
    evidence.signals.push("stable_origin_mapping");
  }
};

const findOriginMatch = (
  originEntries: Array<{ node: FigmaNormalizedNode; path: string }>,
  placementEntry: { node: FigmaNormalizedNode; path: string },
): { node: FigmaNormalizedNode; mapping: FigmaSemanticEvidence["mapping"] } | { warning: string } | null => {
  const placementIds = identityTokens(placementEntry.node);
  const identityMatches = originEntries.filter(({ node }) => {
    const originIds = identityTokens(node);
    return [...placementIds].some((token) => token && originIds.has(token) && token !== placementEntry.node.id);
  });
  if (identityMatches.length === 1) return { node: identityMatches[0]!.node, mapping: "override" };
  if (identityMatches.length > 1) return { warning: `Ambiguous override mapping for placement node "${placementEntry.node.name}".` };

  const pathMatch = originEntries.find((entry) => entry.path === placementEntry.path && entry.node.type === placementEntry.node.type);
  if (pathMatch) return { node: pathMatch.node, mapping: "stable_path" };

  const structuralMatches = originEntries.filter(({ node }) => localSignature(node) === localSignature(placementEntry.node));
  if (structuralMatches.length === 1) return { node: structuralMatches[0]!.node, mapping: "structural" };
  if (structuralMatches.length > 1) return { warning: `Ambiguous structural mapping for placement node "${placementEntry.node.name}".` };
  return null;
};

export const mapFigmaPlacementNodesToOrigin = (input: {
  origin: FigmaNormalizedNode;
  placements: Placement[];
}): { evidenceByOriginNodeId: Record<string, FigmaSemanticEvidence>; warnings: string[] } => {
  const originEntries = walk(input.origin).filter(({ node }) => node.type === "TEXT" && !isMemoText(node));
  const evidenceByOriginNodeId: Record<string, FigmaSemanticEvidence> = {};
  const warnings: string[] = [];
  for (const placement of input.placements) {
    for (const placementEntry of walk(placement.root).filter(({ node }) => node.type === "TEXT" && !isMemoText(node))) {
      const match = findOriginMatch(originEntries, placementEntry);
      if (!match) {
        warnings.push(`No origin descendant matched placement node "${placementEntry.node.name}".`);
        continue;
      }
      if ("warning" in match) {
        warnings.push(match.warning);
        continue;
      }
      const sample: FigmaPlacementTextSample = {
        placementInstanceId: placement.instanceId,
        variantStatus: placement.status,
        originNodeId: match.node.id,
        value: placementEntry.node.characters ?? "",
      };
      const existing = evidenceByOriginNodeId[match.node.id];
      if (existing) addSample(existing, sample, match.mapping);
      else evidenceByOriginNodeId[match.node.id] = createEvidence(sample, match.mapping);
    }
  }
  return { evidenceByOriginNodeId, warnings: [...new Set(warnings)] };
};

const mergeEvidence = (left: FigmaSemanticEvidence, right?: FigmaSemanticEvidence): FigmaSemanticEvidence => {
  if (!right) return left;
  const merged = { ...left, samples: [...left.samples], sampleValues: [...left.sampleValues], signals: [...left.signals] };
  for (const sample of right.samples) addSample(merged, sample, right.mapping);
  return merged;
};

const candidate = (
  role: FigmaReviewCandidate["suggestedRole"],
  type: FigmaReviewCandidate["suggestedStudioType"],
  confidence: number,
  reason: string,
): FigmaReviewCandidate => ({ suggestedRole: role, suggestedStudioType: type, confidence, reason });

const statusAgreement = (evidence: FigmaSemanticEvidence): boolean =>
  evidence.samples.length > 0 && evidence.samples.every((sample) =>
    normalizeFigmaSemanticValue(sample.value) === sample.variantStatus);

export const inferFigmaSemanticEvidence = (input: {
  origin: FigmaNormalizedNode;
  evidenceByOriginNodeId: Record<string, FigmaSemanticEvidence>;
  componentSetEvidence?: Record<string, FigmaSemanticEvidence>;
}): Array<{ sourceNodeId: string; candidate: FigmaReviewCandidate; evidence: FigmaSemanticEvidence }> => {
  const originText = walk(input.origin).filter(({ node }) => node.type === "TEXT" && !isMemoText(node));
  const entries: Array<{ sourceNodeId: string; candidate: FigmaReviewCandidate; evidence: FigmaSemanticEvidence }> = [];
  for (const { node } of originText) {
    const local = input.evidenceByOriginNodeId[node.id];
    const evidence = mergeEvidence(local ?? {
      samples: [], sampleValues: [], matchedPlacementCount: 0, distinctValueCount: 0, signals: [], mapping: "ambiguous",
    }, input.componentSetEvidence?.[node.id]);
    if (evidence.mapping === "ambiguous" || evidence.samples.length === 0) continue;
    const values = evidence.samples.map((sample) => normalizeFigmaSemanticValue(sample.value));
    const layerClassification = classifyFigmaTextNode({ name: node.name, characters: node.characters ?? "" });
    if (layerClassification.role !== "unknown" && !evidence.signals.includes("layer_name_alias")) {
      evidence.signals.push("layer_name_alias");
    }
    const weekdays = new Set(values.map(canonicalWeekday).filter(Boolean));
    const dayEvidence = originText.find(({ node: child }) => child.id !== node.id && input.evidenceByOriginNodeId[child.id] &&
      input.evidenceByOriginNodeId[child.id]!.samples.some((sample) => sample.placementInstanceId &&
        evidence.samples.some((candidateSample) => candidateSample.placementInstanceId === sample.placementInstanceId) &&
        canonicalWeekday(sample.value) !== undefined));
    if (weekdays.size >= 2) {
      evidence.signals.push("known_weekday_set");
      entries.push({ sourceNodeId: node.id, candidate: candidate("day_label", "text", 0.98, "Multiple canonical weekday samples map to one origin text node."), evidence });
      continue;
    }
    if (values.every((value) => /^\d{1,2}$/.test(value)) && values.every((value) => Number(value) >= 1 && Number(value) <= 31) && dayEvidence) {
      evidence.signals.push("date_pattern");
      entries.push({ sourceNodeId: node.id, candidate: candidate("date", "text", 0.94, "Numeric day values are stable and associated with a weekday sample on the same card."), evidence });
      continue;
    }
    if (values.every((value) => /^(?:am|pm) ?\d{1,2}:\d{2}$/.test(value) || /^\d{1,2}:\d{2}$/.test(value))) {
      evidence.signals.push("time_pattern");
      entries.push({ sourceNodeId: node.id, candidate: candidate("time", "text", 0.94, "Placement samples match AM/PM or 24-hour time formats."), evidence });
      continue;
    }
    if (values.every((value) => value === "online" || value === "offline") && statusAgreement(evidence)) {
      evidence.signals.push("status_variant_match");
      entries.push({ sourceNodeId: node.id, candidate: candidate("status_label", "text", 0.92, "Status samples agree with their resolved online/offline variants."), evidence });
    }
  }
  return entries;
};
