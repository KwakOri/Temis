import type {
  StudioTemplateDocument,
  StudioWebFontSource,
} from "@/types/template-studio";

const ALLOWED_FONT_FACE_DESCRIPTORS = new Set([
  "font-family",
  "src",
  "font-weight",
  "font-style",
  "font-display",
  "font-stretch",
  "unicode-range",
  "ascent-override",
  "descent-override",
  "line-gap-override",
  "size-adjust",
]);

export const STUDIO_WEB_FONT_METRIC_DEFAULTS = {
  "ascent-override": "84%",
  "descent-override": "16%",
  "line-gap-override": "0%",
  "size-adjust": "100%",
} as const;

const FONT_DISPLAY_VALUES = new Set([
  "auto",
  "block",
  "swap",
  "fallback",
  "optional",
]);

const FONT_STYLE_PATTERN =
  /^(normal|italic|oblique(?:\s+-?\d+(?:\.\d+)?deg)?)$/i;
const FONT_WEIGHT_PATTERN =
  /^(normal|bold|[1-9]\d{0,2}|1000)(?:\s+(?:[1-9]\d{0,2}|1000))?$/i;
const FONT_STRETCH_PATTERN =
  /^(normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|\d+(?:\.\d+)?%(?:\s+\d+(?:\.\d+)?%)?)$/i;
const UNICODE_RANGE_PATTERN =
  /^U\+[0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?(?:\s*,\s*U\+[0-9A-F?]{1,6}(?:-[0-9A-F]{1,6})?)*$/i;
const FONT_METRIC_OVERRIDE_PATTERN = /^(?:normal|(?:\d+(?:\.\d+)?|\.\d+)%)$/i;
const FONT_SIZE_ADJUST_PATTERN = /^(?:\d+(?:\.\d+)?|\.\d+)%$/;
const MAX_DATA_FONT_URL_LENGTH = 140_000;

export interface StudioParsedWebFontFace {
  family: string;
  weight: string;
  style: string;
  descriptors: Record<string, string>;
}

export interface StudioWebFontParseError {
  blockIndex?: number;
  message: string;
}

export type StudioWebFontParseResult =
  | {
      ok: true;
      cssText: string;
      faces: StudioParsedWebFontFace[];
      families: string[];
      errors: [];
    }
  | {
      ok: false;
      cssText: "";
      faces: [];
      families: [];
      errors: StudioWebFontParseError[];
    };

export type StudioFontWeight =
  100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface StudioFontWeightOption {
  label: string;
  value: StudioFontWeight;
}

const STUDIO_FONT_WEIGHT_OPTIONS: StudioFontWeightOption[] = [
  { value: 100, label: "Thin" },
  { value: 200, label: "Extra Light" },
  { value: 300, label: "Light" },
  { value: 400, label: "Normal" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semi Bold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra Bold" },
  { value: 900, label: "Black" },
];

const toStandardFontWeight = (value: number): StudioFontWeight =>
  Math.min(
    900,
    Math.max(100, Math.round(value / 100) * 100),
  ) as StudioFontWeight;

export const normalizeStudioFontWeight = (
  value: string | number | null | undefined,
): StudioFontWeight => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "normal") return 400;
    if (normalized === "bold") return 700;
    return toStandardFontWeight(Number(normalized) || 400);
  }

  return toStandardFontWeight(
    typeof value === "number" && Number.isFinite(value) ? value : 400,
  );
};

const getFaceStandardFontWeights = (weight: string): StudioFontWeight[] => {
  const values = weight.trim().toLowerCase().split(/\s+/);
  if (values.length === 1) return [normalizeStudioFontWeight(values[0])];

  const start = normalizeStudioFontWeight(values[0]);
  const end = normalizeStudioFontWeight(values[1]);
  const minimum = Math.min(start, end);
  const maximum = Math.max(start, end);

  return STUDIO_FONT_WEIGHT_OPTIONS.filter(
    (option) => option.value >= minimum && option.value <= maximum,
  ).map((option) => option.value);
};

const stripCopiedMarkdownEmphasis = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
        const start = line.indexOf("*");
        const end = line.lastIndexOf("*");
        return `${line.slice(0, start)}${line.slice(start + 1, end)}${line.slice(end + 1)}`;
      }
      return line;
    })
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

const splitOutsideSyntax = (value: string, separator: string): string[] => {
  const parts: string[] = [];
  let quote: string | null = null;
  let escaped = false;
  let parentheses = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") parentheses += 1;
    if (character === ")") parentheses = Math.max(0, parentheses - 1);
    if (character === separator && parentheses === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(value.slice(start));
  return parts;
};

const extractFontFaceBlocks = (
  cssText: string,
): { blocks: string[]; error?: string } => {
  const blocks: string[] = [];
  let cursor = 0;

  while (cursor < cssText.length) {
    while (/\s/.test(cssText[cursor] ?? "")) cursor += 1;
    if (cursor >= cssText.length) break;
    if (!cssText.slice(cursor).toLowerCase().startsWith("@font-face")) {
      return {
        blocks: [],
        error: "Only @font-face rules are allowed.",
      };
    }

    cursor += "@font-face".length;
    while (/\s/.test(cssText[cursor] ?? "")) cursor += 1;
    if (cssText[cursor] !== "{") {
      return { blocks: [], error: "Expected { after @font-face." };
    }

    const bodyStart = cursor + 1;
    let quote: string | null = null;
    let escaped = false;
    let depth = 1;
    cursor += 1;

    for (; cursor < cssText.length; cursor += 1) {
      const character = cssText[cursor];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }
      if (character === "{") depth += 1;
      if (character === "}") depth -= 1;
      if (depth === 0) break;
    }

    if (depth !== 0) {
      return { blocks: [], error: "Unclosed @font-face block." };
    }

    blocks.push(cssText.slice(bodyStart, cursor));
    cursor += 1;
  }

  return blocks.length > 0
    ? { blocks }
    : { blocks: [], error: "Add at least one @font-face rule." };
};

const parseDeclarations = (
  block: string,
): { declarations?: Record<string, string>; error?: string } => {
  const declarations: Record<string, string> = {};

  for (const part of splitOutsideSyntax(block, ";")) {
    const declaration = part.trim();
    if (!declaration) continue;
    const colonIndex = declaration.indexOf(":");
    if (colonIndex <= 0) {
      return { error: `Invalid declaration: ${declaration}` };
    }
    const name = declaration.slice(0, colonIndex).trim().toLowerCase();
    const value = declaration.slice(colonIndex + 1).trim();
    if (!ALLOWED_FONT_FACE_DESCRIPTORS.has(name)) {
      return { error: `Unsupported descriptor: ${name}` };
    }
    if (!value) return { error: `${name} cannot be empty.` };
    if (declarations[name] !== undefined) {
      return { error: `Duplicate descriptor: ${name}` };
    }
    declarations[name] = value;
  }

  return { declarations };
};

const normalizeFontFamily = (value: string): string | null => {
  const trimmed = value.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const family = quoted ? trimmed.slice(1, -1).trim() : trimmed;
  if (!family || /[{};\\\n\r]/.test(family)) return null;
  return family;
};

const normalizeFontSource = (value: string): string | null => {
  const sources = splitOutsideSyntax(value, ",").map((source) => source.trim());
  if (sources.length === 0 || sources.some((source) => !source)) return null;

  const normalized = sources.map((source) => {
    const match = source.match(
      /^url\(\s*(?:"([^"]+)"|'([^']+)'|([^'"\s)]+))\s*\)(?:\s+format\(\s*(?:"([^"]+)"|'([^']+)'|([^'"\s)]+))\s*\))?$/i,
    );
    if (!match) return null;
    const rawUrl = match[1] ?? match[2] ?? match[3];
    const format = match[4] ?? match[5] ?? match[6];

    if (rawUrl.startsWith("data:font/")) {
      if (rawUrl.length > MAX_DATA_FONT_URL_LENGTH) return null;
    } else {
      try {
        const parsedUrl = new URL(rawUrl);
        if (parsedUrl.protocol !== "https:") return null;
      } catch {
        return null;
      }
    }

    if (format && !/^[a-z0-9-]+$/i.test(format)) return null;
    return `url(${JSON.stringify(rawUrl)})${format ? ` format(${JSON.stringify(format)})` : ""}`;
  });

  return normalized.every((source): source is string => Boolean(source))
    ? normalized.join(", ")
    : null;
};

const normalizeDescriptor = (name: string, value: string): string | null => {
  if (name === "font-family") {
    const family = normalizeFontFamily(value);
    return family ? JSON.stringify(family) : null;
  }
  if (name === "src") return normalizeFontSource(value);
  if (name === "font-weight") {
    return FONT_WEIGHT_PATTERN.test(value.trim())
      ? value.trim().toLowerCase()
      : null;
  }
  if (name === "font-style") {
    return FONT_STYLE_PATTERN.test(value.trim())
      ? value.trim().toLowerCase()
      : null;
  }
  if (name === "font-display") {
    const normalized = value.trim().toLowerCase();
    return FONT_DISPLAY_VALUES.has(normalized) ? normalized : null;
  }
  if (name === "font-stretch") {
    return FONT_STRETCH_PATTERN.test(value.trim())
      ? value.trim().toLowerCase()
      : null;
  }
  if (name === "unicode-range") {
    return UNICODE_RANGE_PATTERN.test(value.trim())
      ? value.trim().toUpperCase()
      : null;
  }
  if (
    name === "ascent-override" ||
    name === "descent-override" ||
    name === "line-gap-override"
  ) {
    return FONT_METRIC_OVERRIDE_PATTERN.test(value.trim())
      ? value.trim().toLowerCase()
      : null;
  }
  if (name === "size-adjust") {
    return FONT_SIZE_ADJUST_PATTERN.test(value.trim()) ? value.trim() : null;
  }
  return null;
};

export const parseStudioWebFontCss = (
  input: string,
): StudioWebFontParseResult => {
  const cssText = stripCopiedMarkdownEmphasis(input);
  const extracted = extractFontFaceBlocks(cssText);
  if (extracted.error) {
    return {
      ok: false,
      cssText: "",
      faces: [],
      families: [],
      errors: [{ message: extracted.error }],
    };
  }

  const faces: StudioParsedWebFontFace[] = [];
  const errors: StudioWebFontParseError[] = [];

  extracted.blocks.forEach((block, blockIndex) => {
    const parsed = parseDeclarations(block);
    if (!parsed.declarations) {
      errors.push({
        blockIndex,
        message: parsed.error ?? "Invalid declarations.",
      });
      return;
    }
    if (!parsed.declarations["font-family"] || !parsed.declarations.src) {
      errors.push({
        blockIndex,
        message: "Every @font-face block needs font-family and src.",
      });
      return;
    }

    const descriptors: Record<string, string> = {};
    const sourceDescriptors = {
      ...STUDIO_WEB_FONT_METRIC_DEFAULTS,
      ...parsed.declarations,
      "font-display": parsed.declarations["font-display"] ?? "swap",
    };
    Object.entries(sourceDescriptors).forEach(([name, value]) => {
      const normalized = normalizeDescriptor(name, value);
      if (!normalized) {
        errors.push({ blockIndex, message: `Invalid ${name} value.` });
      } else {
        descriptors[name] = normalized;
      }
    });
    if (errors.some((error) => error.blockIndex === blockIndex)) return;

    const family = normalizeFontFamily(parsed.declarations["font-family"]);
    if (!family) return;
    faces.push({
      family,
      weight: descriptors["font-weight"] ?? "normal",
      style: descriptors["font-style"] ?? "normal",
      descriptors,
    });
  });

  if (errors.length > 0) {
    return { ok: false, cssText: "", faces: [], families: [], errors };
  }

  const uniqueFaces = faces.filter(
    (face, index, allFaces) =>
      allFaces.findIndex(
        (candidate) =>
          candidate.family === face.family &&
          candidate.weight === face.weight &&
          candidate.style === face.style &&
          candidate.descriptors.src === face.descriptors.src,
      ) === index,
  );
  const normalizedCss = uniqueFaces
    .map((face) => {
      const descriptorOrder = [
        "font-family",
        "src",
        "font-weight",
        "font-style",
        "font-display",
        "ascent-override",
        "descent-override",
        "line-gap-override",
        "size-adjust",
        "font-stretch",
        "unicode-range",
      ];
      const declarations = descriptorOrder
        .filter((name) => face.descriptors[name] !== undefined)
        .map((name) => `  ${name}: ${face.descriptors[name]};`)
        .join("\n");
      return `@font-face {\n${declarations}\n}`;
    })
    .join("\n\n");

  return {
    ok: true,
    cssText: normalizedCss,
    faces: uniqueFaces,
    families: Array.from(new Set(uniqueFaces.map((face) => face.family))),
    errors: [],
  };
};

export const getStudioWebFontSources = (
  document: StudioTemplateDocument,
): StudioWebFontSource[] => document.resources?.webFonts ?? [];

export const getStudioEnabledWebFontCss = (
  document: StudioTemplateDocument,
): string =>
  getStudioWebFontSources(document)
    .filter((source) => source.enabled)
    .map((source) => parseStudioWebFontCss(source.cssText))
    .filter((result) => result.ok)
    .map((result) => result.cssText)
    .join("\n\n");

export const getStudioCustomFontFamilies = (
  document: StudioTemplateDocument,
): string[] =>
  Array.from(
    new Set(
      getStudioWebFontSources(document)
        .filter((source) => source.enabled)
        .flatMap((source) => {
          const result = parseStudioWebFontCss(source.cssText);
          return result.ok ? result.families : [];
        }),
    ),
  );

export const getStudioParsedFontWeightOptions = (
  faces: StudioParsedWebFontFace[],
  fontFamily?: string,
): StudioFontWeightOption[] => {
  const normalizedFamily = fontFamily?.trim().toLowerCase();
  const weights = new Set<StudioFontWeight>();

  faces.forEach((face) => {
    if (
      normalizedFamily &&
      face.family.trim().toLowerCase() !== normalizedFamily
    ) {
      return;
    }
    getFaceStandardFontWeights(face.weight).forEach((weight) =>
      weights.add(weight),
    );
  });

  const options = STUDIO_FONT_WEIGHT_OPTIONS.filter((option) =>
    weights.has(option.value),
  );
  return options.length > 0
    ? options
    : STUDIO_FONT_WEIGHT_OPTIONS.filter((option) => option.value === 400);
};

export const getStudioFontWeightOptions = (
  document: StudioTemplateDocument,
  fontFamily: string,
): StudioFontWeightOption[] => {
  const normalizedFamily = fontFamily.trim().toLowerCase();
  const importedFaces: StudioParsedWebFontFace[] = [];

  getStudioWebFontSources(document)
    .filter((source) => source.enabled)
    .forEach((source) => {
      const result = parseStudioWebFontCss(source.cssText);
      if (!result.ok) return;

      result.faces.forEach((face) => {
        if (face.family.trim().toLowerCase() !== normalizedFamily) return;
        importedFaces.push(face);
      });
    });

  return importedFaces.length > 0
    ? getStudioParsedFontWeightOptions(importedFaces, fontFamily)
    : STUDIO_FONT_WEIGHT_OPTIONS;
};
