export const v2_parseStyleSectionKey = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const v2_getStyleSectionLookupCandidates = (styleKey: string): string[] => {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: string) => {
    const trimmed = candidate.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    candidates.push(trimmed);
  };

  pushCandidate(styleKey);

  let current = styleKey;
  while (current.includes("__")) {
    current = current.slice(0, current.lastIndexOf("__"));
    pushCandidate(current);
  }

  return candidates;
};

export const v2_createStyleKeyToSectionKeyMap = <
  TSectionKey extends string,
  TStyleKey extends string,
>(
  sectionToStyleMap: Partial<Record<TSectionKey, TStyleKey>>
): Partial<Record<TStyleKey, TSectionKey>> => {
  const map: Partial<Record<TStyleKey, TSectionKey>> = {};
  for (const sectionKey in sectionToStyleMap) {
    const styleKey = sectionToStyleMap[sectionKey as TSectionKey];
    if (typeof styleKey !== "string" || styleKey.length === 0) continue;
    map[styleKey as TStyleKey] = sectionKey as TSectionKey;
  }
  return map;
};

export const v2_resolveCardStyleSection = <TStyleKey extends string>(
  styleKey: unknown,
  fallbackSection: string,
  styleKeyToSectionMap: Partial<Record<TStyleKey, string>>
): string => {
  const parsed = v2_parseStyleSectionKey(styleKey);
  if (!parsed) return fallbackSection;
  for (const candidate of v2_getStyleSectionLookupCandidates(parsed)) {
    const mapped = styleKeyToSectionMap[candidate as TStyleKey];
    if (mapped) return mapped;
  }
  return parsed;
};

export interface V2ResolvedTextNodeSections {
  containerSection: string;
  textSection: string | null;
  wrapperSection: string | null;
  alignmentWrapperSection: string;
  hasAutoResizeAlignment: boolean;
}

export const v2_resolveTextNodeSections = <TStyleKey extends string>({
  containerStyleKey,
  textStyleKey,
  wrapperStyleKey,
  fallbackSection,
  styleKeyToSectionMap,
  isFlexibleText,
}: {
  containerStyleKey: unknown;
  textStyleKey?: unknown;
  wrapperStyleKey?: unknown;
  fallbackSection: string;
  styleKeyToSectionMap: Partial<Record<TStyleKey, string>>;
  isFlexibleText: boolean;
}): V2ResolvedTextNodeSections => {
  const containerSection = v2_resolveCardStyleSection(
    containerStyleKey,
    fallbackSection,
    styleKeyToSectionMap
  );
  const textSection = textStyleKey
    ? v2_resolveCardStyleSection(
        textStyleKey,
        containerSection,
        styleKeyToSectionMap
      )
    : null;
  const wrapperSection = wrapperStyleKey
    ? v2_resolveCardStyleSection(
        wrapperStyleKey,
        containerSection,
        styleKeyToSectionMap
      )
    : null;
  const alignmentWrapperSection = wrapperSection ?? containerSection;
  const hasAutoResizeAlignment = isFlexibleText && textSection !== null;

  return {
    containerSection,
    textSection,
    wrapperSection,
    alignmentWrapperSection,
    hasAutoResizeAlignment,
  };
};

export const v2_isKnownStyleSectionKey = <TSectionKey extends string>(
  value: string,
  sectionLabelMap: Record<TSectionKey, unknown>
): value is TSectionKey => {
  return Object.prototype.hasOwnProperty.call(sectionLabelMap, value);
};
