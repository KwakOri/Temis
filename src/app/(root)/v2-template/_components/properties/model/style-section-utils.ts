export const v2_parseStyleSectionKey = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  const mapped = styleKeyToSectionMap[parsed as TStyleKey];
  return mapped ?? parsed;
};

export const v2_isKnownStyleSectionKey = <TSectionKey extends string>(
  value: string,
  sectionLabelMap: Record<TSectionKey, unknown>
): value is TSectionKey => {
  return Object.prototype.hasOwnProperty.call(sectionLabelMap, value);
};
