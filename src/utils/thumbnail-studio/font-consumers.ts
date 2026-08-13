import type {
  StudioGraphNode,
  StudioTemplateDocument,
  StudioWebFontSource,
} from "@/types/template-studio";
import { parseStudioWebFontCss } from "@/utils/template-studio/web-fonts";
import type { StudioTextEffectPreset } from "@/utils/thumbnail-studio/text-effect-presets";

export interface ThumbnailStudioFontConsumerReference {
  id: string;
  fontFamily: string;
  nodeId: string | null;
  label: string;
  detail: string;
  locked: boolean;
}

export type ThumbnailStudioFontConsumers = Record<
  string,
  ThumbnailStudioFontConsumerReference[]
>;

export interface ThumbnailStudioFontChangeImpact {
  fontFamily: string;
  consumers: ThumbnailStudioFontConsumerReference[];
}

export const normalizeThumbnailStudioFontFamily = (value: string): string =>
  value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim()
    .toLocaleLowerCase();

/** CSS font-family 목록을 따옴표 안의 comma를 보존하며 분리한다. */
export const getThumbnailStudioFontFamilyReferences = (
  value: unknown,
): string[] => {
  if (typeof value !== "string") return [];

  const families: string[] = [];
  let quote: string | null = null;
  let start = 0;
  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character !== "," && index !== value.length) continue;
    const family = value.slice(start, index).trim();
    if (family) families.push(family.replace(/^['"]|['"]$/g, "").trim());
    start = index + 1;
  }
  return families.filter(
    (family, index, all) =>
      normalizeThumbnailStudioFontFamily(family).length > 0 &&
      all.findIndex(
        (candidate) =>
          normalizeThumbnailStudioFontFamily(candidate) ===
          normalizeThumbnailStudioFontFamily(family),
      ) === index,
  );
};

const addConsumer = (
  consumers: ThumbnailStudioFontConsumers,
  fontFamily: string,
  reference: Omit<ThumbnailStudioFontConsumerReference, "fontFamily">,
) => {
  const key = normalizeThumbnailStudioFontFamily(fontFamily);
  if (!key) return;
  consumers[key] = [...(consumers[key] ?? []), { ...reference, fontFamily }];
};

const addNodeFontConsumers = (
  document: StudioTemplateDocument,
  consumers: ThumbnailStudioFontConsumers,
  node: StudioGraphNode,
) => {
  if (node.type !== "text" && node.type !== "flexibleText") return;
  const fontFamily = node.styleId
    ? document.styles[node.styleId]?.fontFamily
    : undefined;
  getThumbnailStudioFontFamilyReferences(fontFamily).forEach((family) => {
    addConsumer(consumers, family, {
      id: `node:${node.id}:font-family`,
      nodeId: node.id,
      label: node.label,
      detail: "Text node typography",
      locked: Boolean(node.locked),
    });
  });
};

const addPresetFontConsumers = (
  consumers: ThumbnailStudioFontConsumers,
  presets: readonly StudioTextEffectPreset[],
) => {
  presets
    .filter((preset) => preset.source === "custom")
    .forEach((preset) => {
      getThumbnailStudioFontFamilyReferences(
        preset.typography.fontFamily,
      ).forEach((family) => {
        addConsumer(consumers, family, {
          id: `preset:${preset.id}:font-family`,
          nodeId: null,
          label: preset.label,
          detail: "Custom text preset typography",
          locked: false,
        });
      });
    });
};

/** document text nodes와 세션 custom text preset의 font 사용 위치를 모은다. */
export const collectThumbnailStudioFontConsumers = (
  document: StudioTemplateDocument,
  customPresets: readonly StudioTextEffectPreset[] = [],
): ThumbnailStudioFontConsumers => {
  const consumers: ThumbnailStudioFontConsumers = {};
  Object.values(document.graph.nodes).forEach((node) =>
    addNodeFontConsumers(document, consumers, node),
  );
  addPresetFontConsumers(consumers, customPresets);
  return consumers;
};

const getSourceFamilies = (source: StudioWebFontSource): string[] => {
  const parsed = parseStudioWebFontCss(source.cssText);
  return parsed.ok ? parsed.families : [];
};

const getEnabledSourceFamilies = (
  sources: readonly StudioWebFontSource[],
): Set<string> =>
  new Set(
    sources
      .filter((source) => source.enabled)
      .flatMap(getSourceFamilies)
      .map(normalizeThumbnailStudioFontFamily),
  );

/** source별로 표시할 사용 위치를 만든다. source가 여러 family를 가질 수 있다. */
export const getThumbnailStudioFontUsageBySource = (
  sources: readonly StudioWebFontSource[],
  consumers: ThumbnailStudioFontConsumers,
): Record<string, string[]> =>
  Object.fromEntries(
    sources.map((source) => [
      source.id,
      Array.from(
        new Set(
          getSourceFamilies(source).flatMap((family) =>
            (consumers[normalizeThumbnailStudioFontFamily(family)] ?? []).map(
              (consumer) => `${consumer.label} · ${consumer.detail}`,
            ),
          ),
        ),
      ),
    ]),
  );

/** enabled source가 사라지거나 비활성화되어 fallback으로 바뀌는 사용 위치. */
export const getThumbnailStudioFontChangeImpacts = (
  currentSources: readonly StudioWebFontSource[],
  nextSources: readonly StudioWebFontSource[],
  consumers: ThumbnailStudioFontConsumers,
): ThumbnailStudioFontChangeImpact[] => {
  const nextEnabledFamilies = getEnabledSourceFamilies(nextSources);
  const impactedFamilies = new Set<string>();

  currentSources
    .filter((source) => source.enabled)
    .flatMap(getSourceFamilies)
    .forEach((family) => {
      const key = normalizeThumbnailStudioFontFamily(family);
      if (!nextEnabledFamilies.has(key) && (consumers[key] ?? []).length > 0) {
        impactedFamilies.add(key);
      }
    });

  return [...impactedFamilies].map((key) => ({
    fontFamily: consumers[key]?.[0]?.fontFamily ?? key,
    consumers: consumers[key] ?? [],
  }));
};
