import { v2_BOILERPLATE_SECTION_GROUPS } from "./boilerplate-section-groups";
import { v2_STYLE_EXTENSION_GROUPS } from "./boilerplate-presets";
import { v2_expandDisplayGroups } from "./boilerplate-ui-utils";

const v2_ALLOWED_STYLE_KEYS_BY_SECTION = new Map<string, Set<string>>();

export const v2_getAllowedStylePropertyKeys = (
  schemaSection: string | undefined
): Set<string> => {
  if (!schemaSection) return new Set();

  const cached = v2_ALLOWED_STYLE_KEYS_BY_SECTION.get(schemaSection);
  if (cached) return cached;

  const groups = [
    ...v2_expandDisplayGroups(v2_BOILERPLATE_SECTION_GROUPS[schemaSection] ?? []),
    ...v2_STYLE_EXTENSION_GROUPS,
  ];
  const keys = new Set(
    groups.flatMap((group) => group.fields.map((field) => field.key))
  );
  v2_ALLOWED_STYLE_KEYS_BY_SECTION.set(schemaSection, keys);
  return keys;
};

export const v2_isAllowedStylePropertyKey = ({
  schemaSection,
  key,
}: {
  schemaSection: string | undefined;
  key: string;
}): boolean => {
  const allowedKeys = v2_getAllowedStylePropertyKeys(schemaSection);
  if (allowedKeys.size === 0) return true;
  return allowedKeys.has(key);
};

export const v2_filterStyleRecordByAllowedKeys = ({
  record,
  schemaSection,
  preservedKeys,
}: {
  record: Record<string, string | number>;
  schemaSection: string | undefined;
  preservedKeys: Set<string>;
}): Record<string, string | number> => {
  const allowedKeys = v2_getAllowedStylePropertyKeys(schemaSection);
  if (allowedKeys.size === 0) return record;

  return Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => allowedKeys.has(key) || preservedKeys.has(key)
    )
  );
};
