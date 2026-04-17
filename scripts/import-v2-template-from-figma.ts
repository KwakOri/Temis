import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { deleteFileFromR2, uploadFileToR2 } from "../src/lib/r2";
import {
  v2_normalizeAssetToken,
  v2_suggestAssetKeyByRule,
} from "../src/utils/v2/asset-mapping";
import { buildV2AssetUploadFolder } from "../src/utils/v2/r2-upload-prefix";
import {
  v2_createDefaultTemplateRenderConfig,
  v2_createEmptyTemplateRenderConfig,
  v2_normalizeTemplateRenderConfig,
} from "../src/utils/v2/template-render-config";
import { v2_graphRemoveNodeSubtree } from "../src/utils/v2/template-graph-editor";
import {
  V2TemplateAssetRef,
  V2TemplateBuiltinAssetKey,
  V2TemplateDayKey,
  V2TemplateExtraAssetDimensionMap,
  V2TemplateExtraAssetMap,
} from "../src/types/time-table/template-render-config";

type CliOptions = {
  figmaUrl: string;
  templateName?: string;
  templateDescription?: string;
  templateId?: string;
  write: boolean;
  public: boolean;
  configPreset: "default" | "empty";
  source: "publish" | "backfill" | "system";
  createdBy?: number;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  figmaToken?: string;
  withAssets: boolean;
  assetTheme: string;
  assetFormat: "png" | "jpg" | "svg" | "pdf";
  noAiAssetMatch: boolean;
};

type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
  componentId?: string;
  componentSetId?: string;
  visible?: boolean;
  layoutMode?: string;
  layoutWrap?: string;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  gridColumnCount?: number;
  gridColumnGap?: number;
  gridColumnsSizing?: string;
  gridRowCount?: number;
  gridRowGap?: number;
  gridRowsSizing?: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  rotation?: number;
  relativeTransform?: number[][];
  style?: {
    fontSize?: number;
    fontWeight?: number;
    lineHeightPx?: number;
    lineHeightPercentFontSize?: number;
    lineHeightUnit?: string;
    textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
    letterSpacing?: number;
  };
  fills?: Array<{
    type?: string;
    visible?: boolean;
    opacity?: number;
    color?: {
      r?: number;
      g?: number;
      b?: number;
      a?: number;
    };
  }>;
};

type FigmaNodesResponse = {
  name?: string;
  nodes?: Record<
    string,
    {
      document?: FigmaNode;
    }
  >;
};

type FigmaFileResponse = {
  components?: Record<
    string,
    {
      key?: string;
      name?: string;
      componentSetId?: string;
    }
  >;
};

type FigmaImagesResponse = {
  images?: Record<string, string | null>;
  err?: string;
  status?: number;
};

type FigmaNodeRecord = {
  node: FigmaNode;
  ancestors: FigmaNode[];
};

type AssetTarget = {
  targetType: "builtin" | "extra";
  targetKey: string;
  score: number;
  reason: string;
};

type AssetCandidate = {
  nodeId: string;
  nodeName: string;
  targetType: "builtin" | "extra";
  targetKey: string;
  width: number;
  height: number;
  score: number;
  reason: string;
};

type AssetCandidateInput = {
  nodeId: string;
  nodeName: string;
  width: number;
  height: number;
  explicitAssetTag?: string;
  ruleTarget?: AssetTarget | null;
};

type AssetImportSummary = {
  discovered: number;
  mapped: number;
  uploaded: number;
  applied: number;
  warnings: string[];
  unresolved: string[];
};

type FigmaParseResult = {
  fileKey: string;
  nodeId: string;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotateDeg?: number;
};

type MappingSummary = {
  applied: string[];
  warnings: string[];
  notApplicable: string[];
  statusSlotAuditRows: Array<{
    status: CardTextStatus;
    source: string;
    background: boolean;
    main: boolean;
    sub: boolean;
    time: boolean;
    date: boolean;
    day: boolean;
    missing: string[];
  }>;
  presence: {
    grid: boolean;
    weekFlag: boolean;
    topObject: boolean;
    memoObject: boolean;
    memoText: boolean;
    artistObject: boolean;
    profileText: boolean;
    profileImage: boolean;
    profileFrame: boolean;
    cardContainer: boolean;
    cardMainTitle: boolean;
    cardSubTitle: boolean;
    cardStreamingTime: boolean;
    cardStreamingDate: boolean;
    cardStreamingDay: boolean;
  };
};

type CardTextStatus = "online" | "multi" | "offline" | "offlineMemo";

const rootDir = path.resolve(__dirname, "..");

const printHelp = () => {
  console.log(
    [
      "Usage: npm run import:v2:figma -- --figma-url <URL> [options]",
      "",
      "Required:",
      "  --figma-url <url>                Figma design URL with node-id query",
      "",
      "Optional:",
      "  --template-name <name>           v2_templates.name (default: from figma file/node)",
      "  --template-description <text>    v2_templates.description",
      "  --template-id <uuid>             Use existing template id instead of name lookup/create",
      "  --write                          Persist to DB (default is dry-run)",
      "  --public                         Set is_public=true when creating template",
      "  --config-preset <default|empty>  Base render config preset (default: default)",
      "  --source <publish|backfill|system> Revision source (default: system)",
      "  --created-by <userId>            created_by for revision row",
      "  --supabase-url <url>             Supabase REST URL override",
      "  --supabase-service-role-key <key> Supabase service role key override",
      "  --figma-token <token>            FIGMA_ACCESS_TOKEN override",
      "  --without-assets                 Disable Figma image export/upload step",
      "  --asset-theme <theme>            Target theme key for imported assets (default: first)",
      "  --asset-format <png|jpg|svg|pdf> Figma export format for asset nodes (default: png)",
      "  --no-ai-asset-match              Disable AI-first asset review and use rule-based mapping only",
      "",
      "Environment fallback:",
      "  FIGMA_ACCESS_TOKEN",
      "  OPENAI_ACCESS_TOKEN / OPENAI_API_KEY",
      "  V2_R2_UPLOAD_BASE_PREFIX",
      "  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL",
      "  SUPABASE_SERVICE_ROLE_KEY",
      "  (.env, .env.local, .envrc are loaded automatically)",
      "",
      "Examples:",
      "  npm run import:v2:figma -- --figma-url 'https://www.figma.com/design/FILE/Name?node-id=1075-5624'",
      "  npm run import:v2:figma -- --figma-url '<url>' --template-name 'Time Table (Figma)' --write",
    ].join("\n")
  );
};

const parseCliOptions = (): CliOptions => {
  const argv = process.argv.slice(2);
  const argMap = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      argMap.set(key, true);
      continue;
    }
    argMap.set(key, next);
    index += 1;
  }

  if (argMap.has("help") || argMap.has("h")) {
    printHelp();
    process.exit(0);
  }

  const figmaUrlRaw = argMap.get("figma-url");
  if (typeof figmaUrlRaw !== "string" || figmaUrlRaw.trim().length === 0) {
    throw new Error("--figma-url is required. Use --help for usage.");
  }

  const configPresetRaw = argMap.get("config-preset");
  const configPreset =
    configPresetRaw === "empty" || configPresetRaw === "default"
      ? configPresetRaw
      : "default";

  const sourceRaw = argMap.get("source");
  const source =
    sourceRaw === "publish" || sourceRaw === "backfill" || sourceRaw === "system"
      ? sourceRaw
      : "system";

  const assetFormatRaw = argMap.get("asset-format");
  const assetFormat =
    assetFormatRaw === "png" ||
    assetFormatRaw === "jpg" ||
    assetFormatRaw === "svg" ||
    assetFormatRaw === "pdf"
      ? assetFormatRaw
      : "png";

  const assetThemeRaw = argMap.get("asset-theme");
  const assetTheme =
    typeof assetThemeRaw === "string" && assetThemeRaw.trim().length > 0
      ? assetThemeRaw.trim()
      : "first";

  const createdByRaw = argMap.get("created-by");
  let createdBy: number | undefined;
  if (typeof createdByRaw === "string") {
    const parsed = Number(createdByRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error("--created-by must be a positive integer user id.");
    }
    createdBy = parsed;
  }

  return {
    figmaUrl: figmaUrlRaw.trim(),
    templateName:
      typeof argMap.get("template-name") === "string"
        ? String(argMap.get("template-name")).trim()
        : undefined,
    templateDescription:
      typeof argMap.get("template-description") === "string"
        ? String(argMap.get("template-description")).trim()
        : undefined,
    templateId:
      typeof argMap.get("template-id") === "string"
        ? String(argMap.get("template-id")).trim()
        : undefined,
    write: argMap.has("write"),
    public: argMap.has("public"),
    configPreset,
    source,
    createdBy,
    supabaseUrl:
      typeof argMap.get("supabase-url") === "string"
        ? String(argMap.get("supabase-url")).trim()
        : undefined,
    supabaseServiceRoleKey:
      typeof argMap.get("supabase-service-role-key") === "string"
        ? String(argMap.get("supabase-service-role-key")).trim()
        : undefined,
    figmaToken:
      typeof argMap.get("figma-token") === "string"
        ? String(argMap.get("figma-token")).trim()
        : undefined,
    withAssets: !argMap.has("without-assets"),
    assetTheme,
    assetFormat,
    noAiAssetMatch: argMap.has("no-ai-asset-match"),
  };
};

const parseEnvFile = (content: string): Record<string, string> => {
  const parsed: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex < 1) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      const inlineCommentIndex = value.indexOf(" #");
      if (inlineCommentIndex > -1) {
        value = value.slice(0, inlineCommentIndex).trim();
      }
    }
    parsed[key] = value;
  }
  return parsed;
};

const loadEnvFiles = (): Record<string, string> => {
  const envPaths = [".env", ".env.local", ".envrc"].map((file) =>
    path.join(rootDir, file)
  );
  const merged: Record<string, string> = {};
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    Object.assign(merged, parseEnvFile(fs.readFileSync(envPath, "utf8")));
  }
  return merged;
};

const parseSimpleEnvOutput = (raw: string): Record<string, string> => {
  const parsed: Record<string, string> = {};
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes("="))
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      parsed[key] =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
          ? rawValue.slice(1, -1)
          : rawValue;
    });
  return parsed;
};

const resolveLocalSupabaseStatusEnv = (): Record<string, string> => {
  try {
    const raw = execSync(`supabase status -o env --workdir "${rootDir}"`, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return parseSimpleEnvOutput(raw);
  } catch {
    return {};
  }
};

const hydrateProcessEnvFromLoaded = (
  loadedEnv: Record<string, string>,
  keys: string[]
) => {
  keys.forEach((key) => {
    if (typeof process.env[key] === "string" && process.env[key]!.length > 0) {
      return;
    }
    const candidate = loadedEnv[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      process.env[key] = candidate;
    }
  });
};

const parseFigmaUrl = (rawUrl: string): FigmaParseResult => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid Figma URL.");
  }

  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  if (pathSegments.length < 2) {
    throw new Error("Unable to parse file key from Figma URL.");
  }

  const surface = pathSegments[0];
  if (!["design", "file", "make"].includes(surface)) {
    throw new Error(
      `Unsupported Figma URL surface "${surface}". Expected /design/:fileKey/...`
    );
  }

  const fileKey = pathSegments[1];
  const rawNodeId = parsed.searchParams.get("node-id");
  if (!rawNodeId) {
    throw new Error("Figma URL must include node-id query parameter.");
  }

  const nodeId = rawNodeId.replace(/-/g, ":");
  return { fileKey, nodeId };
};

const round = (value: number, digits = 2): number => {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
};

type NodeNameMetadata = {
  baseName: string;
  tags: Record<string, string>;
};

const stripNodeNameMetadata = (value: string): string =>
  value.replace(/\[[^\]]*]/g, " ").replace(/\s+/g, " ").trim();

const parseNodeNameMetadata = (value: string): NodeNameMetadata => {
  const tags: Record<string, string> = {};
  const tagRegex = /\[([a-zA-Z0-9_.-]+)\s*=\s*([^\]]+)\]/g;
  let matched = tagRegex.exec(value);
  while (matched) {
    const key = matched[1]?.trim().toLowerCase();
    const rawValue = matched[2]?.trim();
    if (key && rawValue) {
      tags[key] = rawValue;
    }
    matched = tagRegex.exec(value);
  }

  return {
    baseName: stripNodeNameMetadata(value),
    tags,
  };
};

const getNodeNameMetadata = (node: FigmaNode | undefined): NodeNameMetadata => {
  if (!node?.name) {
    return {
      baseName: "",
      tags: {},
    };
  }
  return parseNodeNameMetadata(node.name);
};

const getNodeTagValue = (node: FigmaNode | undefined, key: string): string | undefined => {
  if (!node?.name) return undefined;
  const normalizedKey = key.trim().toLowerCase();
  if (!normalizedKey) return undefined;
  const metadata = getNodeNameMetadata(node);
  return metadata.tags[normalizedKey];
};

const normalizeTagValue = (value: string): string => value.trim().toLowerCase();

const hasNodeTagValue = ({
  node,
  key,
  values,
}: {
  node: FigmaNode | undefined;
  key: string;
  values: readonly string[];
}): boolean => {
  const tagValue = getNodeTagValue(node, key);
  if (!tagValue) return false;
  const normalizedTagValue = normalizeTagValue(tagValue);
  return values.some((value) => normalizedTagValue === normalizeTagValue(value));
};

const findFirstByTagValues = (
  nodes: FigmaNode[],
  key: string,
  values: readonly string[]
): FigmaNode | undefined => {
  if (values.length === 0) return undefined;
  return nodes.find((node) =>
    hasNodeTagValue({
      node,
      key,
      values,
    })
  );
};

const findMatchesByTagValues = (
  nodes: FigmaNode[],
  key: string,
  values: readonly string[]
): FigmaNode[] => {
  if (values.length === 0) return [];
  return nodes.filter((node) =>
    hasNodeTagValue({
      node,
      key,
      values,
    })
  );
};

const findFirstByTagCriteria = (
  nodes: FigmaNode[],
  criteria: Record<string, readonly string[]>
): FigmaNode | undefined => {
  const entries = Object.entries(criteria).filter((entry) => entry[1].length > 0);
  if (entries.length === 0) return undefined;
  return nodes.find((node) =>
    entries.every(([key, values]) =>
      hasNodeTagValue({
        node,
        key,
        values,
      })
    )
  );
};

const findNodeByTagOrAlias = ({
  nodes,
  tagValues,
  aliases,
}: {
  nodes: FigmaNode[];
  tagValues: readonly string[];
  aliases: readonly string[];
}): FigmaNode | undefined => {
  return (
    findFirstByTagValues(nodes, "slot", tagValues) ??
    findFirstByNames(nodes, aliases)
  );
};

const canonicalName = (value: string): string =>
  stripNodeNameMetadata(value).toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

const sanitizePathSegment = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
};

type AssetStatus = "online" | "multi" | "offline" | "offlineMemo";

const ASSET_STATUS_ALIASES: Record<string, AssetStatus> = {
  online: "online",
  on: "online",
  live: "online",
  single: "online",
  multi: "multi",
  multiple: "multi",
  "online-multi": "multi",
  online_multi: "multi",
  "online-multiple": "multi",
  online_multiple: "multi",
  onlinemulti: "multi",
  onlinemultiple: "multi",
  offline: "offline",
  off: "offline",
  rest: "offline",
  offlinememo: "offlineMemo",
  "offline-memo": "offlineMemo",
  offline_memo: "offlineMemo",
  memooffline: "offlineMemo",
  memo_offline: "offlineMemo",
};

const ASSET_SLOT_TO_BUILTIN_KEY: Record<string, V2TemplateBuiltinAssetKey> = {
  "scene.bg": "bgByTheme",
  "scene.topobject": "topObjectByTheme",
  "scene.top": "topObjectByTheme",
  "scene.memo": "memoByTheme",
  "memo.container": "memoByTheme",
  "artist.background": "artist",
  "artist.object": "artist",
  "profile.image": "profileBgByTheme",
  "profile.frame": "profileFrameByTheme",
  "scene.guide": "guideByTheme",
  "scene.overlay": "guideByTheme",
};

const EXPLICIT_ASSET_TAG_TO_BUILTIN_KEY: Record<
  string,
  V2TemplateBuiltinAssetKey
> = {
  bg: "bgByTheme",
  background: "bgByTheme",
  "scene.background": "bgByTheme",
  top: "topObjectByTheme",
  topobject: "topObjectByTheme",
  top_object: "topObjectByTheme",
  memo: "memoByTheme",
  memobg: "memoByTheme",
  memo_bg: "memoByTheme",
  memoobject: "memoByTheme",
  memo_object: "memoByTheme",
  artist: "artist",
  profileframe: "profileFrameByTheme",
  profile_frame: "profileFrameByTheme",
  profilebg: "profileBgByTheme",
  profile_bg: "profileBgByTheme",
  profileimage: "profileBgByTheme",
  profile_image: "profileBgByTheme",
  guide: "guideByTheme",
  guideoverlay: "guideByTheme",
  guide_overlay: "guideByTheme",
};

const IMPORT_DAY_KEYS: V2TemplateDayKey[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

const CARD_BACKGROUND_VARIANTS = {
  online: {
    builtinAssetKey: "onlineByTheme" as const,
    layerTarget: "cardNode:online-background",
    expectedVisibilityModes: ["onlineOnly", "onlineSingleOnly"] as const,
    editorOptionByDayKey: "useOnlineAssetsByDay" as const,
    dayAssetKeyByDay: {
      mon: "online_mon",
      tue: "online_tue",
      wed: "online_wed",
      thu: "online_thu",
      fri: "online_fri",
      sat: "online_sat",
      sun: "online_sun",
    } satisfies Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>,
  },
  multi: {
    builtinAssetKey: null,
    layerTarget: "cardNode:multi-background",
    expectedVisibilityModes: ["onlineMultipleOnly"] as const,
    editorOptionByDayKey: "useMultiAssetsByDay" as const,
    dayAssetKeyByDay: {
      mon: "multi_mon",
      tue: "multi_tue",
      wed: "multi_wed",
      thu: "multi_thu",
      fri: "multi_fri",
      sat: "multi_sat",
      sun: "multi_sun",
    } satisfies Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>,
  },
  offline: {
    builtinAssetKey: "offlineByTheme" as const,
    layerTarget: "cardNode:offline-background",
    expectedVisibilityModes: ["offlineOnly", "offlineNoMemoOnly"] as const,
    editorOptionByDayKey: "useOfflineAssetsByDay" as const,
    dayAssetKeyByDay: {
      mon: "offline_mon",
      tue: "offline_tue",
      wed: "offline_wed",
      thu: "offline_thu",
      fri: "offline_fri",
      sat: "offline_sat",
      sun: "offline_sun",
    } satisfies Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>,
  },
  offlineMemo: {
    builtinAssetKey: null,
    layerTarget: "cardNode:offline-memo-background",
    expectedVisibilityModes: ["offlineMemoOnly"] as const,
    editorOptionByDayKey: "useOfflineMemoAssetsByDay" as const,
    dayAssetKeyByDay: {
      mon: "offlineMemo_mon",
      tue: "offlineMemo_tue",
      wed: "offlineMemo_wed",
      thu: "offlineMemo_thu",
      fri: "offlineMemo_fri",
      sat: "offlineMemo_sat",
      sun: "offlineMemo_sun",
    } satisfies Record<V2TemplateDayKey, V2TemplateBuiltinAssetKey>,
  },
};

type CardBackgroundVariantMode = keyof typeof CARD_BACKGROUND_VARIANTS;

const buildCardBackgroundDayAssetRefMap = (
  mode: CardBackgroundVariantMode
): Record<V2TemplateDayKey, V2TemplateAssetRef> => {
  const dayAssetKeyByDay = CARD_BACKGROUND_VARIANTS[mode].dayAssetKeyByDay;
  return IMPORT_DAY_KEYS.reduce<Record<V2TemplateDayKey, V2TemplateAssetRef>>(
    (acc, dayKey) => {
      acc[dayKey] = {
        source: "builtin",
        key: dayAssetKeyByDay[dayKey],
      };
      return acc;
    },
    {} as Record<V2TemplateDayKey, V2TemplateAssetRef>
  );
};

const isCardBackgroundNodeForVariant = ({
  node,
  mode,
}: {
  node: ReturnType<typeof v2_createDefaultTemplateRenderConfig>["graph"]["nodes"][string];
  mode: CardBackgroundVariantMode;
}): boolean => {
  if (node.type !== "image") return false;
  const variant = CARD_BACKGROUND_VARIANTS[mode];
  if (
    node.highlightTarget === variant.layerTarget ||
    node.meta?.layerTarget === variant.layerTarget
  ) {
    return true;
  }
  const assetRef = node.meta?.assetRef;
  if (assetRef?.source === "builtin" && variant.builtinAssetKey) {
    const expectedVisibilityModes = variant.expectedVisibilityModes as readonly string[];
    const currentVisibilityMode = node.visibilityMode ?? "always";
    if (
      assetRef.key === variant.builtinAssetKey &&
      expectedVisibilityModes.includes(currentVisibilityMode)
    ) {
      return true;
    }
  }
  if (assetRef?.source === "builtin") {
    const keyPrefix = mode === "offlineMemo" ? "offlineMemo_" : `${mode}_`;
    return assetRef.key.startsWith(keyPrefix);
  }
  return false;
};

const applyCardBackgroundAssetsByDayToConfig = ({
  config,
  mode,
  enabled,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  mode: CardBackgroundVariantMode;
  enabled: boolean;
}) => {
  const dayMap = enabled ? buildCardBackgroundDayAssetRefMap(mode) : null;
  Object.entries(config.graph.nodes).forEach(([nodeId, node]) => {
    if (!isCardBackgroundNodeForVariant({ node, mode })) return;
    const nextMeta = {
      ...(node.meta ?? {}),
    };
    if (enabled && dayMap) {
      nextMeta.assetRefByDayKey = dayMap;
    } else {
      delete nextMeta.assetRefByDayKey;
    }
    config.graph.nodes[nodeId] = {
      ...node,
      meta: nextMeta,
    };
  });
  const optionKey = CARD_BACKGROUND_VARIANTS[mode].editorOptionByDayKey;
  if (optionKey) {
    config.editorOptions[optionKey] = enabled;
  }
};

const getBounds = (
  node: FigmaNode | undefined
): { x: number; y: number; width: number; height: number } | null => {
  if (!node || !node.absoluteBoundingBox) return null;
  const { x, y, width, height } = node.absoluteBoundingBox;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }
  return {
    x: Number(x),
    y: Number(y),
    width: Number(width),
    height: Number(height),
  };
};

const getRotationDeg = (node: FigmaNode | undefined): number | undefined => {
  if (!node) return undefined;
  if (Number.isFinite(node.rotation)) {
    // Figma payload can return either degrees or radians depending on node shape/source.
    // Heuristic: values within ±2π are treated as radians.
    const raw = Number(node.rotation);
    const inRadians = Math.abs(raw) <= Math.PI * 2 + 0.0001;
    return round(inRadians ? (raw * 180) / Math.PI : raw, 2);
  }

  const matrix = node.relativeTransform;
  if (
    !Array.isArray(matrix) ||
    matrix.length < 2 ||
    !Array.isArray(matrix[0]) ||
    !Array.isArray(matrix[1]) ||
    matrix[0].length < 2 ||
    matrix[1].length < 1
  ) {
    return undefined;
  }

  const a = Number(matrix[0][0]);
  const b = Number(matrix[1][0]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  const degrees = (Math.atan2(b, a) * 180) / Math.PI;
  return round(degrees, 2);
};

const toRelativeRect = ({
  rootNode,
  targetNode,
}: {
  rootNode: FigmaNode;
  targetNode: FigmaNode | undefined;
}): Rect | null => {
  const rootBounds = getBounds(rootNode);
  const targetBounds = getBounds(targetNode);
  if (!rootBounds || !targetBounds) {
    return null;
  }

  const rotateDeg = getRotationDeg(targetNode);
  return {
    left: round(targetBounds.x - rootBounds.x),
    top: round(targetBounds.y - rootBounds.y),
    width: round(targetBounds.width),
    height: round(targetBounds.height),
    ...(rotateDeg && Math.abs(rotateDeg) > 0.0001 ? { rotateDeg } : {}),
  };
};

const flattenNodes = (root: FigmaNode): FigmaNode[] => {
  const stack: FigmaNode[] = [root];
  const flattened: FigmaNode[] = [];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    flattened.push(current);
    if (Array.isArray(current.children) && current.children.length > 0) {
      for (let index = current.children.length - 1; index >= 0; index -= 1) {
        const child = current.children[index];
        if (child) {
          stack.push(child);
        }
      }
    }
  }
  return flattened;
};

const findFirstByNames = (
  nodes: FigmaNode[],
  aliases: readonly string[]
): FigmaNode | undefined => {
  const aliasSet = new Set(aliases.map(canonicalName));
  return nodes.find((node) => {
    if (!node.name) return false;
    return aliasSet.has(canonicalName(node.name));
  });
};

const findMatchesByNames = (
  nodes: FigmaNode[],
  aliases: readonly string[]
): FigmaNode[] => {
  const aliasSet = new Set(aliases.map(canonicalName));
  return nodes.filter((node) => {
    if (!node.name) return false;
    return aliasSet.has(canonicalName(node.name));
  });
};

const collectNodeRecords = (
  rootNode: FigmaNode,
  ancestors: FigmaNode[] = []
): FigmaNodeRecord[] => {
  const records: FigmaNodeRecord[] = [
    {
      node: rootNode,
      ancestors,
    },
  ];

  const children = Array.isArray(rootNode.children) ? rootNode.children : [];
  for (const child of children) {
    records.push(...collectNodeRecords(child, [rootNode, ...ancestors]));
  }
  return records;
};

const getTagValueFromRecord = (
  record: FigmaNodeRecord,
  key: string
): string | undefined => {
  const normalizedKey = key.trim().toLowerCase();
  if (!normalizedKey) return undefined;

  const fromNode = getNodeTagValue(record.node, normalizedKey);
  if (fromNode) return fromNode;
  for (const ancestor of record.ancestors) {
    const value = getNodeTagValue(ancestor, normalizedKey);
    if (value) return value;
  }
  return undefined;
};

const normalizeAssetSlot = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, ".");
};

const normalizeAssetStatus = (
  value: string | undefined
): AssetStatus | undefined => {
  if (!value) return undefined;
  return ASSET_STATUS_ALIASES[value.trim().toLowerCase()];
};

const CARD_TEXT_STATUS_ALIASES: Record<string, CardTextStatus> = {
  online: "online",
  on: "online",
  single: "online",
  default: "online",
  live: "online",
  multi: "multi",
  multiple: "multi",
  online_multi: "multi",
  onlinemulti: "multi",
  online_multiple: "multi",
  onlinemultiple: "multi",
  offline: "offline",
  off: "offline",
  rest: "offline",
  offlinememo: "offlineMemo",
  offlinememod: "offlineMemo",
  offline_memo: "offlineMemo",
  offline_memod: "offlineMemo",
  "offline-memo": "offlineMemo",
  memooffline: "offlineMemo",
  memo_offline: "offlineMemo",
};

const normalizeCardTextStatus = (
  value: string | undefined
): CardTextStatus | undefined => {
  if (!value) return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return CARD_TEXT_STATUS_ALIASES[normalized];
};

const tokenizeNodeName = (value: string | undefined): string[] => {
  if (!value) return [];
  const baseName = stripNodeNameMetadata(value).toLowerCase();
  return baseName
    .split(/[^a-z0-9가-힣]+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const hasDirectNodeTag = (node: FigmaNode | undefined, key: string): boolean => {
  return Boolean(getNodeTagValue(node, key));
};

const hasVisibleImageFill = (node: FigmaNode): boolean => {
  if (!Array.isArray(node.fills)) return false;
  return node.fills.some(
    (fill) => fill?.type === "IMAGE" && fill.visible !== false
  );
};

const isPotentialAssetNode = (node: FigmaNode): boolean => {
  if (!node.name) return false;
  const nodeType = (node.type ?? "").toUpperCase();
  if (
    nodeType === "TEXT" ||
    nodeType === "FRAME" ||
    nodeType === "GROUP" ||
    nodeType === "INSTANCE" ||
    nodeType === "COMPONENT" ||
    nodeType === "COMPONENT_SET" ||
    nodeType === "SECTION" ||
    nodeType === "PAGE"
  ) {
    return false;
  }

  // Asset import should only consider actual raster-backed paint nodes.
  return hasVisibleImageFill(node);
};

const resolveAssetTargetByExplicitTag = ({
  assetTagValue,
  builtinAssetKeySet,
  builtinAssetKeyLookup,
}: {
  assetTagValue: string;
  builtinAssetKeySet: Set<string>;
  builtinAssetKeyLookup: Map<string, string>;
}): AssetTarget => {
  const trimmed = assetTagValue.trim();
  const lowered = trimmed.toLowerCase();
  const normalizedTag = v2_normalizeAssetToken(trimmed);
  const exactLookup =
    builtinAssetKeyLookup.get(trimmed) ??
    builtinAssetKeyLookup.get(lowered) ??
    builtinAssetKeyLookup.get(normalizedTag);
  if (exactLookup && builtinAssetKeySet.has(exactLookup)) {
    return {
      targetType: "builtin",
      targetKey: exactLookup,
      score: 100,
      reason: `[asset=${assetTagValue}] explicit builtin`,
    };
  }

  const aliasedBuiltinKey =
    EXPLICIT_ASSET_TAG_TO_BUILTIN_KEY[lowered] ??
    EXPLICIT_ASSET_TAG_TO_BUILTIN_KEY[normalizedTag];
  if (aliasedBuiltinKey && builtinAssetKeySet.has(aliasedBuiltinKey)) {
    return {
      targetType: "builtin",
      targetKey: aliasedBuiltinKey,
      score: 98,
      reason: `[asset=${assetTagValue}] aliased builtin`,
    };
  }

  const normalized = normalizedTag;
  return {
    targetType: "extra",
    targetKey: normalized || trimmed,
    score: 90,
    reason: `[asset=${assetTagValue}] explicit extra`,
  };
};

const resolveAssetTargetFromRecord = ({
  record,
  builtinAssetKeys,
  builtinAssetKeySet,
  builtinAssetKeyLookup,
}: {
  record: FigmaNodeRecord;
  builtinAssetKeys: string[];
  builtinAssetKeySet: Set<string>;
  builtinAssetKeyLookup: Map<string, string>;
}): AssetTarget | null => {
  const nodeName = record.node.name ?? "";
  if (!record.node.id || !nodeName.trim()) return null;
  if (record.node.visible === false) return null;
  if (record.node.type === "TEXT") return null;

  const explicitAssetTag = getTagValueFromRecord(record, "asset");
  if (explicitAssetTag && explicitAssetTag.trim().length > 0) {
    return resolveAssetTargetByExplicitTag({
      assetTagValue: explicitAssetTag.trim(),
      builtinAssetKeySet,
      builtinAssetKeyLookup,
    });
  }

  const roleTag = normalizeTagValue(getTagValueFromRecord(record, "role") ?? "");
  if (roleTag === "overlay") {
    return null;
  }

  const slotTag = normalizeAssetSlot(getTagValueFromRecord(record, "slot"));
  const statusTag =
    normalizeAssetStatus(getTagValueFromRecord(record, "status")) ??
    normalizeAssetStatus(getTagValueFromRecord(record, "mode"));
  const dayTag = toDayTagKey(getTagValueFromRecord(record, "day"));

  if (slotTag && ASSET_SLOT_TO_BUILTIN_KEY[slotTag]) {
    const targetKey = ASSET_SLOT_TO_BUILTIN_KEY[slotTag];
    return {
      targetType: "builtin",
      targetKey,
      score: 80,
      reason: `slot(${slotTag})`,
    };
  }

  if (slotTag === "card.background" || slotTag === "card.bg") {
    if (statusTag === "online" && dayTag) {
      const dayKey = `online_${dayTag}`;
      if (builtinAssetKeySet.has(dayKey)) {
        return {
          targetType: "builtin",
          targetKey: dayKey,
          score: 85,
          reason: `slot(${slotTag}) + status(${statusTag}) + day(${dayTag})`,
        };
      }
    }

    if (statusTag === "multi" && dayTag) {
      const dayKey = `multi_${dayTag}`;
      if (builtinAssetKeySet.has(dayKey)) {
        return {
          targetType: "builtin",
          targetKey: dayKey,
          score: 85,
          reason: `slot(${slotTag}) + status(${statusTag}) + day(${dayTag})`,
        };
      }
    }

    if (statusTag === "offline" && dayTag) {
      const dayKey = `offline_${dayTag}`;
      if (builtinAssetKeySet.has(dayKey)) {
        return {
          targetType: "builtin",
          targetKey: dayKey,
          score: 85,
          reason: `slot(${slotTag}) + status(${statusTag}) + day(${dayTag})`,
        };
      }
    }

    if (statusTag === "offlineMemo" && dayTag) {
      const dayKey = `offlineMemo_${dayTag}`;
      if (builtinAssetKeySet.has(dayKey)) {
        return {
          targetType: "builtin",
          targetKey: dayKey,
          score: 85,
          reason: `slot(${slotTag}) + status(${statusTag}) + day(${dayTag})`,
        };
      }
    }

    if (statusTag === "online") {
      return {
        targetType: "builtin",
        targetKey: "onlineByTheme",
        score: 72,
        reason: `slot(${slotTag}) + status(online)`,
      };
    }

    if (statusTag === "offline") {
      return {
        targetType: "builtin",
        targetKey: "offlineByTheme",
        score: 72,
        reason: `slot(${slotTag}) + status(offline)`,
      };
    }
  }

  const inferredByName = v2_suggestAssetKeyByRule({
    fileName: nodeName,
    candidateKeys: builtinAssetKeys,
  });
  if (inferredByName) {
    return {
      targetType: "builtin",
      targetKey: inferredByName.key,
      score: Math.round(inferredByName.confidence * 100),
      reason: `name-rule(${inferredByName.reason})`,
    };
  }

  return null;
};

const dedupeAssetCandidates = (candidates: AssetCandidate[]): AssetCandidate[] => {
  const selected = new Map<string, AssetCandidate>();

  for (const candidate of candidates) {
    const current = selected.get(candidate.targetKey);
    if (!current) {
      selected.set(candidate.targetKey, candidate);
      continue;
    }
    const currentArea = current.width * current.height;
    const nextArea = candidate.width * candidate.height;

    if (
      candidate.score > current.score ||
      (candidate.score === current.score && nextArea > currentArea)
    ) {
      selected.set(candidate.targetKey, candidate);
    }
  }

  return Array.from(selected.values());
};

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const textAlignMap: Record<string, "left" | "center" | "right"> = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
  JUSTIFIED: "left",
};

type TextFigmaNode = FigmaNode & { type: "TEXT" };

const isTextNode = (node: FigmaNode | undefined): node is TextFigmaNode => {
  return Boolean(node && node.type === "TEXT");
};

const DAY_TAG_MAP: Record<string, string> = {
  mon: "mon",
  monday: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  wed: "wed",
  weds: "wed",
  wednesday: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  fri: "fri",
  friday: "fri",
  sat: "sat",
  saturday: "sat",
  sun: "sun",
  sunday: "sun",
};

const toDayTagKey = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  return DAY_TAG_MAP[normalizeTagValue(raw)];
};

const parseDayKeyFromNodeName = (
  value: string | undefined
): V2TemplateDayKey | undefined => {
  const tokens = tokenizeNodeName(value);
  for (const token of tokens) {
    const dayTag = DAY_TAG_MAP[token];
    if (dayTag) {
      return dayTag as V2TemplateDayKey;
    }
  }
  return undefined;
};

const parseCardStatusFromNodeName = (
  value: string | undefined
): CardTextStatus | undefined => {
  const tokens = tokenizeNodeName(value);
  if (tokens.some((token) => token.startsWith("offlinememo"))) {
    return "offlineMemo";
  }
  if (tokens.includes("offline") && tokens.includes("memo")) {
    return "offlineMemo";
  }
  if (tokens.includes("multi") || tokens.includes("multiple")) {
    return "multi";
  }
  if (tokens.includes("offline") || tokens.includes("off") || tokens.includes("rest")) {
    return "offline";
  }
  if (tokens.includes("online") || tokens.includes("on") || tokens.includes("live")) {
    return "online";
  }
  return undefined;
};

const findContainerNodeByTextBind = ({
  rootNode,
  bindValues,
}: {
  rootNode: FigmaNode | undefined;
  bindValues: readonly string[];
}): FigmaNode | undefined => {
  if (!rootNode || bindValues.length === 0) return undefined;
  const normalizedBindValues = bindValues.map(normalizeTagValue);
  const isMatchedBindingToken = (rawToken: string | undefined): boolean => {
    if (!rawToken) return false;
    const token = normalizeTagValue(rawToken);
    if (!token) return false;
    if (normalizedBindValues.includes(token)) return true;
    return normalizedBindValues.some((bindValue) => token.endsWith(bindValue));
  };
  const visit = (currentNode: FigmaNode, parentNode?: FigmaNode): FigmaNode | undefined => {
    if (
      isMatchedBindingToken(getNodeTagValue(currentNode, "bind")) ||
      isMatchedBindingToken(getNodeTagValue(currentNode, "key"))
    ) {
      return currentNode;
    }
    if (isTextNode(currentNode)) {
      const bindValue = getNodeTagValue(currentNode, "bind");
      const keyValue = getNodeTagValue(currentNode, "key");
      if (isMatchedBindingToken(bindValue) || isMatchedBindingToken(keyValue)) {
        return parentNode ?? currentNode;
      }
    }
    const children = Array.isArray(currentNode.children) ? currentNode.children : [];
    for (const child of children) {
      const found = visit(child, currentNode);
      if (found) return found;
    }
    return undefined;
  };
  return visit(rootNode);
};

const findContentTextNode = (containerNode: FigmaNode | undefined): FigmaNode | undefined => {
  if (!containerNode) return undefined;
  if (isTextNode(containerNode)) return containerNode;

  const children = Array.isArray(containerNode.children) ? containerNode.children : [];
  const directContent = children.find((child) => {
    if (!isTextNode(child) || !child.name) return false;
    return canonicalName(child.name) === "content";
  });
  if (directContent) return directContent;

  const directText = children.find((child) => isTextNode(child));
  if (directText) return directText;

  const descendants = flattenNodes(containerNode);
  for (let index = 1; index < descendants.length; index += 1) {
    const candidate = descendants[index];
    if (isTextNode(candidate)) return candidate;
  }

  return undefined;
};

const colorChannelToHex = (value: number): string => {
  const normalized = Math.max(0, Math.min(255, Math.round(value)));
  return normalized.toString(16).padStart(2, "0");
};

const figmaFillToHex = (node: FigmaNode | undefined): string | undefined => {
  if (!node?.fills || !Array.isArray(node.fills)) return undefined;
  const solidFill = node.fills.find(
    (fill) => fill?.type === "SOLID" && fill.visible !== false && !!fill.color
  );
  if (!solidFill?.color) return undefined;

  const r = Number(solidFill.color.r ?? 0);
  const g = Number(solidFill.color.g ?? 0);
  const b = Number(solidFill.color.b ?? 0);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return undefined;
  }

  const red = colorChannelToHex(r * 255);
  const green = colorChannelToHex(g * 255);
  const blue = colorChannelToHex(b * 255);
  return `#${red}${green}${blue}`.toUpperCase();
};

const applyTextStyleFromFigmaNode = ({
  node,
  target,
}: {
  node: FigmaNode | undefined;
  target: Record<string, unknown>;
}) => {
  if (!node?.style) return;
  const next = target;

  if (Number.isFinite(node.style.fontSize)) {
    next.fontSize = round(Number(node.style.fontSize), 2);
  }
  if (Number.isFinite(node.style.fontWeight)) {
    next.fontWeight = Math.round(Number(node.style.fontWeight));
  }
  if (Number.isFinite(node.style.letterSpacing)) {
    next.letterSpacing = round(Number(node.style.letterSpacing), 2);
  }
  if (node.style.textAlignHorizontal && textAlignMap[node.style.textAlignHorizontal]) {
    next.textAlign = textAlignMap[node.style.textAlignHorizontal];
  }

  if (
    Number.isFinite(node.style.lineHeightPx) &&
    Number.isFinite(node.style.fontSize) &&
    Number(node.style.fontSize) > 0
  ) {
    next.lineHeight = round(
      Number(node.style.lineHeightPx) / Number(node.style.fontSize),
      3
    );
  } else if (
    Number.isFinite(node.style.lineHeightPercentFontSize) &&
    Number(node.style.lineHeightPercentFontSize) > 0
  ) {
    next.lineHeight = round(Number(node.style.lineHeightPercentFontSize) / 100, 3);
  }

  const colorHex = figmaFillToHex(node);
  if (colorHex) {
    next.color = colorHex;
  }
};

const applyTextStyleFromContentNode = ({
  containerNode,
  target,
}: {
  containerNode: FigmaNode | undefined;
  target: Record<string, unknown>;
}): boolean => {
  const contentNode = findContentTextNode(containerNode);
  if (!contentNode) return false;
  applyTextStyleFromFigmaNode({
    node: contentNode,
    target,
  });
  return true;
};

const applyRectToLayoutObject = ({
  rect,
  target,
  includeRotation = true,
}: {
  rect: Rect | null;
  target: Record<string, unknown>;
  includeRotation?: boolean;
}) => {
  if (!rect) return;
  target.left = rect.left;
  target.top = rect.top;
  target.width = rect.width;
  target.height = rect.height;
  if (includeRotation && rect.rotateDeg !== undefined) {
    target.rotateDeg = rect.rotateDeg;
  } else if ("rotateDeg" in target) {
    delete target.rotateDeg;
  }
};

const applyFlexibleLayoutToTargets = ({
  rect,
  containerTarget,
  wrapperTarget,
}: {
  rect: Rect | null;
  containerTarget: Record<string, unknown>;
  wrapperTarget: Record<string, unknown>;
}) => {
  if (!rect) return;

  applyRectToLayoutObject({
    rect,
    target: containerTarget,
    includeRotation: false,
  });

  wrapperTarget.left = 0;
  wrapperTarget.top = 0;
  wrapperTarget.width = rect.width;
  wrapperTarget.height = rect.height;
  if (rect.rotateDeg !== undefined) {
    wrapperTarget.rotateDeg = rect.rotateDeg;
  } else if ("rotateDeg" in wrapperTarget) {
    delete wrapperTarget.rotateDeg;
  }
};

const applyGridStyleFromFigmaNode = ({
  node,
  target,
}: {
  node: FigmaNode | undefined;
  target: Record<string, unknown>;
}) => {
  if (!node) return;

  const toFiniteNumber = (value: unknown): number | undefined => {
    if (!Number.isFinite(value)) return undefined;
    return round(Number(value), 2);
  };

  const rowGap = toFiniteNumber(node.gridRowGap);
  if (rowGap !== undefined) {
    target.rowGap = rowGap;
  }

  const columnGap = toFiniteNumber(node.gridColumnGap);
  if (columnGap !== undefined) {
    target.columnGap = columnGap;
  }

  const columns = toFiniteNumber(node.gridColumnCount);
  if (columns !== undefined) {
    target.columns = Math.max(1, Math.round(columns));
  }

  if (typeof node.gridColumnsSizing === "string") {
    const sizing = node.gridColumnsSizing.trim();
    if (sizing.length > 0) {
      target.gridTemplateColumns = sizing;
    }
  }
};

const sanitizeTemplateName = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized.slice(0, 100) : "Figma Imported Template";
};

const removeFormFieldByKey = ({
  config,
  key,
  summary,
  reason,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  key: string;
  summary: MappingSummary;
  reason: string;
}) => {
  const prevLength = config.formSchema.fields.length;
  config.formSchema.fields = config.formSchema.fields.filter((field) => field.key !== key);
  if (config.formSchema.fields.length !== prevLength) {
    summary.notApplicable.push(reason);
  }
};

const removeGraphSubtree = ({
  config,
  nodeId,
  summary,
  reason,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  nodeId: string;
  summary: MappingSummary;
  reason: string;
}) => {
  if (!config.graph.nodes[nodeId]) return;
  config.graph = v2_graphRemoveNodeSubtree(config.graph, nodeId);
  summary.notApplicable.push(reason);
};

const applyNotApplicablePruning = ({
  config,
  summary,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  summary: MappingSummary;
}) => {
  const { presence } = summary;

  if (!presence.topObject) {
    removeGraphSubtree({
      config,
      nodeId: "scene-top-object",
      summary,
      reason: "scene.topObject",
    });
  }

  if (!presence.weekFlag) {
    removeGraphSubtree({
      config,
      nodeId: "scene-week-flag",
      summary,
      reason: "scene.weekFlag",
    });
  }

  if (!presence.memoObject) {
    removeGraphSubtree({
      config,
      nodeId: "scene-memo-object",
      summary,
      reason: "scene.memoObject",
    });
  }

  if (!presence.memoText) {
    removeGraphSubtree({
      config,
      nodeId: "scene-memo-text",
      summary,
      reason: "scene.memoText",
    });
    removeFormFieldByKey({
      config,
      key: "memoText",
      summary,
      reason: "form.global.memoText",
    });
  }

  if (!presence.profileText) {
    removeGraphSubtree({
      config,
      nodeId: "scene-profile-text",
      summary,
      reason: "scene.profileText",
    });
  }

  if (!presence.artistObject) {
    removeGraphSubtree({
      config,
      nodeId: "scene-artist-object",
      summary,
      reason: "scene.artistObject",
    });
  }

  if (!presence.profileText && !presence.artistObject) {
    removeGraphSubtree({
      config,
      nodeId: "scene-artist",
      summary,
      reason: "scene.artistGroup",
    });
  }

  if (!presence.profileImage) {
    removeGraphSubtree({
      config,
      nodeId: "scene-profile-image",
      summary,
      reason: "scene.profileImage",
    });
  }

  if (!presence.profileFrame) {
    removeGraphSubtree({
      config,
      nodeId: "scene-profile-frame",
      summary,
      reason: "scene.profileFrame",
    });
  }

  if (!presence.profileImage && !presence.profileFrame) {
    removeGraphSubtree({
      config,
      nodeId: "scene-profile",
      summary,
      reason: "scene.profileGroup",
    });
  }

  // If no artist/profile nodes exist, treat artist as disabled capability.
  const hasArtistCapability =
    presence.profileText || presence.artistObject || presence.profileImage || presence.profileFrame;
  if (!hasArtistCapability) {
    config.editorOptions.isArtist = false;
    summary.notApplicable.push("editorOptions.isArtist=false");
  }

  // Card sub-node pruning is only safe when card container was detected.
  if (presence.cardContainer) {
    if (!presence.cardMainTitle) {
      removeGraphSubtree({
        config,
        nodeId: "main-title",
        summary,
        reason: "card.mainTitle",
      });
      removeFormFieldByKey({
        config,
        key: "mainTitle",
        summary,
        reason: "form.entry.mainTitle",
      });
    }

    if (!presence.cardSubTitle) {
      removeGraphSubtree({
        config,
        nodeId: "sub-title",
        summary,
        reason: "card.subTitle",
      });
      removeFormFieldByKey({
        config,
        key: "subTitle",
        summary,
        reason: "form.entry.subTitle",
      });
    }

    if (!presence.cardStreamingTime) {
      removeGraphSubtree({
        config,
        nodeId: "streaming-time",
        summary,
        reason: "card.streamingTime",
      });
      removeFormFieldByKey({
        config,
        key: "time",
        summary,
        reason: "form.entry.time",
      });
    }

    if (!presence.cardStreamingDate) {
      removeGraphSubtree({
        config,
        nodeId: "streaming-date",
        summary,
        reason: "card.streamingDate",
      });
    }

    if (!presence.cardStreamingDay) {
      removeGraphSubtree({
        config,
        nodeId: "streaming-day",
        summary,
        reason: "card.streamingDay",
      });
    }
  }

  if (!presence.grid && !presence.cardContainer) {
    removeGraphSubtree({
      config,
      nodeId: "scene-grid",
      summary,
      reason: "scene.grid",
    });
    removeGraphSubtree({
      config,
      nodeId: "component-card-root",
      summary,
      reason: "component.cardRoot",
    });
  }
};

const applyLayoutMappingsFromFigma = ({
  rootNode,
  config,
  externalCardCandidates = [],
  externalWarnings = [],
  componentMapById,
}: {
  rootNode: FigmaNode;
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  externalCardCandidates?: FigmaNode[];
  externalWarnings?: string[];
  componentMapById?: Map<string, { name: string; componentSetId?: string }>;
}): MappingSummary => {
  const summary: MappingSummary = {
    applied: [],
    warnings: [],
    notApplicable: [],
    statusSlotAuditRows: [],
    presence: {
      grid: false,
      weekFlag: false,
      topObject: false,
      memoObject: false,
      memoText: false,
      artistObject: false,
      profileText: false,
      profileImage: false,
      profileFrame: false,
      cardContainer: false,
      cardMainTitle: false,
      cardSubTitle: false,
      cardStreamingTime: false,
      cardStreamingDate: false,
      cardStreamingDay: false,
    },
  };

  if (externalWarnings.length > 0) {
    summary.warnings.push(...externalWarnings);
  }

  const allNodes = flattenNodes(rootNode);
  const alias = {
    grid: [
      "grid",
      "groupgrid",
      "scenegrid",
      "카드그리드",
      "카드영역",
      "cards",
      "groupcards",
      "card grid",
    ],
    weekFlag: [
      "weekflag",
      "textweekflag",
      "week flag",
      "주차",
      "weekdate",
      "weekdates",
      "textweekdates",
    ],
    topObject: ["topobject", "imagetopobject", "scene-top-object", "top-object"],
    memoContainer: ["memo", "memo container", "메모", "메모컨테이너"],
    memoContentContainer: [
      "memo content",
      "memo content container",
      "메모텍스트전체",
      "memocontentcontainer",
    ],
    memoTextContainer: ["memo text", "memo text container", "메모텍스트", "memotextcontainer"],
    memoText: ["memo text", "memo title", "메모", "메모텍스트", "memotext"],
    profileImage: [
      "profileimage",
      "imageprofileimage",
      "artistimage",
      "profile image",
    ],
    profileFrame: [
      "profileframe",
      "imageprofileframe",
      "artistframe",
      "profile frame",
    ],
    profileText: [
      "profiletext",
      "artistname",
      "flexibletextartistname",
      "flexibletextprofiletext",
      "artist",
      "artist text",
      "artisttext",
      "flexibletextartist",
    ],
    artistObject: ["artistobject", "imageartistobject", "profiletextartistimagestyle"],
    cardContainer: [
      "card",
      "componentcard",
      "componentinstancecard",
      "groupcard",
      "card root",
      "cardcontainer",
      "카드",
    ],
    mainTitleContainer: [
      "maintitlecontainer",
      "maintitle",
      "flexibletextmaintitle",
      "메인타이틀컨테이너",
    ],
    subTitleContainer: [
      "subtitlecontainer",
      "subtitle",
      "flexibletextsubtitle",
      "서브타이틀컨테이너",
    ],
    streamingTime: ["streamingtime", "texttime", "시간"],
    streamingDate: ["streamingdate", "textdate", "날짜"],
    streamingDay: ["streamingday", "textday", "요일"],
    cardOnlineBackground: [
      "onlinebackground",
      "imageonlinebackground",
      "cardonlinebackground",
      "online",
    ],
    cardMultiBackground: [
      "multibackground",
      "imagemultibackground",
      "cardmultibackground",
      "multi",
    ],
    cardOfflineBackground: [
      "offlinebackground",
      "imageofflinebackground",
      "cardofflinebackground",
      "offline",
    ],
    cardOfflineMemoBackground: [
      "offlinememobackground",
      "imageofflinememobackground",
      "cardofflinememobackground",
      "offlinememo",
      "memooffline",
    ],
    cardSharedBackground: [
      "cardbackground",
      "componentinstancecardbackground",
      "imagecardbackground",
      "background",
    ],
  } as const;

  const slot = {
    grid: ["grid", "scene.grid"],
    weekFlag: ["weekFlag", "week.flag", "scene.weekFlag"],
    topObject: ["scene.topObject", "topObject", "top.object"],
    memoContainer: ["memo", "scene.memo", "memo.container"],
    memoContentContainer: ["memo.text", "memo.content"],
    memoTextContainer: ["memo.text"],
    memoText: ["memo.text.content"],
    profileImage: ["profile.image"],
    profileFrame: ["profile.frame", "profile"],
    profileText: ["artist.text", "profile.text"],
    artistObject: ["artist.background", "artist.object"],
    cardContainer: ["card"],
    cardBackground: ["card.background"],
    cardMainTitle: ["card.mainTitle", "card.main_title"],
    cardOfflineMemo: ["card.offlineMemo", "card.offline_memo"],
    cardSubTitle: ["card.subTitle", "card.sub_title"],
    cardTime: ["card.time", "card.streamingTime"],
    cardDate: ["card.date", "card.streamingDate"],
    cardDay: ["card.day", "card.streamingDay"],
  } as const;

  const resolveCandidateDayKey = (candidate: FigmaNode): V2TemplateDayKey | undefined => {
    const dayFromTag = toDayTagKey(getNodeTagValue(candidate, "day"));
    if (dayFromTag) return dayFromTag as V2TemplateDayKey;
    const dayFromName = parseDayKeyFromNodeName(candidate.name);
    if (dayFromName) return dayFromName;
    const componentId = candidate.componentId?.trim();
    if (!componentId || !componentMapById) return undefined;
    const componentName = componentMapById.get(componentId)?.name;
    if (!componentName) return undefined;
    return parseDayKeyFromNodeName(componentName);
  };

  const resolveCandidateStatus = (candidate: FigmaNode): CardTextStatus | undefined => {
    const statusFromTag =
      normalizeCardTextStatus(getNodeTagValue(candidate, "status")) ??
      normalizeCardTextStatus(getNodeTagValue(candidate, "mode")) ??
      normalizeCardTextStatus(getNodeTagValue(candidate, "state"));
    if (statusFromTag) return statusFromTag;
    const statusFromName = parseCardStatusFromNodeName(candidate.name);
    if (statusFromName) return statusFromName;
    const componentId = candidate.componentId?.trim();
    if (!componentId || !componentMapById) return undefined;
    const componentName = componentMapById.get(componentId)?.name;
    if (!componentName) return undefined;
    return parseCardStatusFromNodeName(componentName);
  };

  const collectDayStatusCardCandidates = (nodes: FigmaNode[]): FigmaNode[] => {
    const allowedNodeTypes = new Set([
      "FRAME",
      "GROUP",
      "INSTANCE",
      "COMPONENT",
      "COMPONENT_SET",
      "SYMBOL",
    ]);
    return nodes.filter((node) => {
      if (node.type === "TEXT") return false;
      const nodeType = typeof node.type === "string" ? node.type.toUpperCase() : "";
      if (nodeType && !allowedNodeTypes.has(nodeType)) return false;
      if (!getBounds(node)) return false;
      const hasDay = Boolean(resolveCandidateDayKey(node));
      const hasStatus = Boolean(resolveCandidateStatus(node));
      return hasDay && hasStatus;
    });
  };

  const scoreCardContainerCandidate = (candidate: FigmaNode): number => {
    const nodes = flattenNodes(candidate);
    let score = 0;
    const dayTag = resolveCandidateDayKey(candidate);
    if (dayTag) score += 10;
    if (findFirstByNames(nodes, alias.mainTitleContainer)) score += 4;
    if (findFirstByNames(nodes, alias.subTitleContainer)) score += 4;
    if (findFirstByNames(nodes, alias.streamingTime)) score += 3;
    if (findFirstByNames(nodes, alias.streamingDate)) score += 2;
    if (findFirstByNames(nodes, alias.streamingDay)) score += 2;
    if (findContainerNodeByTextBind({ rootNode: candidate, bindValues: ["entry.mainTitle"] })) {
      score += 4;
    }
    if (findContainerNodeByTextBind({ rootNode: candidate, bindValues: ["entry.subTitle"] })) {
      score += 4;
    }
    if (findContainerNodeByTextBind({ rootNode: candidate, bindValues: ["entry.time"] })) {
      score += 3;
    }
    if (findContainerNodeByTextBind({ rootNode: candidate, bindValues: ["entry.date"] })) {
      score += 2;
    }
    if (
      findFirstByNames(nodes, alias.cardOnlineBackground) ||
      findFirstByNames(nodes, alias.cardOfflineBackground) ||
      findFirstByNames(nodes, alias.cardSharedBackground)
    ) {
      score += 2;
    }
    return score;
  };

  const selectBestCardContainerCandidate = ({
    candidates,
    source,
  }: {
    candidates: FigmaNode[];
    source: "grid descendants" | "global";
  }): FigmaNode | undefined => {
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];

    const monCandidate = candidates.find(
      (candidate) => resolveCandidateDayKey(candidate) === "mon"
    );
    if (monCandidate) {
      return monCandidate;
    }

    const ranked = candidates
      .map((candidate, index) => {
        const score = scoreCardContainerCandidate(candidate);
        const bounds = getBounds(candidate);
        return {
          candidate,
          score,
          index,
          x: bounds?.x ?? Number.POSITIVE_INFINITY,
          y: bounds?.y ?? Number.POSITIVE_INFINITY,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (left.y !== right.y) return left.y - right.y;
        if (left.x !== right.x) return left.x - right.x;
        return left.index - right.index;
      });

    const top = ranked[0];
    const sameScoreCount = ranked.filter((entry) => entry.score === top.score).length;
    if (sameScoreCount > 1) {
      summary.warnings.push(
        `Card container alias matched ${candidates.length} nodes in ${source}; ${sameScoreCount} candidates tied with score=${top.score}, selected top-left candidate.`
      );
    } else {
      summary.warnings.push(
        `Card container alias matched ${candidates.length} nodes in ${source}; selected highest score=${top.score} candidate.`
      );
    }

    return top.candidate;
  };

  const collectCardCandidatesByDay = (
    candidates: FigmaNode[]
  ): Partial<Record<V2TemplateDayKey, FigmaNode>> => {
    const next: Partial<Record<V2TemplateDayKey, FigmaNode>> = {};
    const rankedByDay: Partial<
      Record<V2TemplateDayKey, { score: number; x: number; y: number }>
    > = {};

    candidates.forEach((candidate) => {
      const dayTag = resolveCandidateDayKey(candidate);
      if (!dayTag) return;
      const dayKey = dayTag;
      const score = scoreCardContainerCandidate(candidate);
      const bounds = getBounds(candidate);
      const x = bounds?.x ?? Number.POSITIVE_INFINITY;
      const y = bounds?.y ?? Number.POSITIVE_INFINITY;
      const prevRank = rankedByDay[dayKey];
      if (!prevRank) {
        next[dayKey] = candidate;
        rankedByDay[dayKey] = { score, x, y };
        return;
      }
      if (score > prevRank.score) {
        next[dayKey] = candidate;
        rankedByDay[dayKey] = { score, x, y };
        return;
      }
      if (score === prevRank.score) {
        const isMoreTopLeft = y < prevRank.y || (y === prevRank.y && x < prevRank.x);
        if (isMoreTopLeft) {
          next[dayKey] = candidate;
          rankedByDay[dayKey] = { score, x, y };
        }
      }
    });

    return next;
  };

  const collectCardCandidatesByDayStatus = (
    candidates: FigmaNode[]
  ): Partial<Record<V2TemplateDayKey, Partial<Record<CardTextStatus, FigmaNode>>>> => {
    const next: Partial<Record<V2TemplateDayKey, Partial<Record<CardTextStatus, FigmaNode>>>> = {};
    const ranked: Partial<
      Record<
        V2TemplateDayKey,
        Partial<Record<CardTextStatus, { score: number; x: number; y: number }>>
      >
    > = {};

    candidates.forEach((candidate) => {
      const dayKey = resolveCandidateDayKey(candidate);
      const status = resolveCandidateStatus(candidate);
      if (!dayKey || !status) return;
      const score = scoreCardContainerCandidate(candidate);
      const bounds = getBounds(candidate);
      const x = bounds?.x ?? Number.POSITIVE_INFINITY;
      const y = bounds?.y ?? Number.POSITIVE_INFINITY;

      const dayCandidates = next[dayKey] ?? {};
      const dayRanks = ranked[dayKey] ?? {};
      const prevRank = dayRanks[status];
      if (!prevRank) {
        dayCandidates[status] = candidate;
        dayRanks[status] = { score, x, y };
        next[dayKey] = dayCandidates;
        ranked[dayKey] = dayRanks;
        return;
      }

      if (score > prevRank.score) {
        dayCandidates[status] = candidate;
        dayRanks[status] = { score, x, y };
        next[dayKey] = dayCandidates;
        ranked[dayKey] = dayRanks;
        return;
      }

      if (score === prevRank.score) {
        const isMoreTopLeft = y < prevRank.y || (y === prevRank.y && x < prevRank.x);
        if (isMoreTopLeft) {
          dayCandidates[status] = candidate;
          dayRanks[status] = { score, x, y };
          next[dayKey] = dayCandidates;
          ranked[dayKey] = dayRanks;
        }
      }
    });

    return next;
  };

  const applyFreeLayoutFromCardCandidates = ({
    candidates,
    positionRootNode,
  }: {
    candidates: FigmaNode[];
    positionRootNode: FigmaNode;
  }): boolean => {
    const candidateByDay = collectCardCandidatesByDay(candidates);
    const candidateDayCount = IMPORT_DAY_KEYS.filter(
      (dayKey) => candidateByDay[dayKey]
    ).length;
    if (candidateDayCount < 2) return false;

    const fallbackInstanceNodes = Object.values(config.graph.nodes).filter(
      (node): node is (typeof config.graph.nodes)[string] =>
        Boolean(node && node.type === "componentInstance")
    );

    if (fallbackInstanceNodes.length > 0) {
      const nextSceneStyles: Array<{ styleKey: string; style: Record<string, unknown> }> = [];
      fallbackInstanceNodes.forEach((instanceNode, fallbackIndex) => {
        const dayKey = toDayTagKey(
          typeof instanceNode.meta?.dayKey === "string"
            ? instanceNode.meta.dayKey
            : undefined
        ) as V2TemplateDayKey | undefined;
        if (!dayKey) return;
        const sourceNode = candidateByDay[dayKey];
        if (!sourceNode) return;
        const rect = toRelativeRect({
          rootNode: positionRootNode,
          targetNode: sourceNode,
        });
        if (!rect) return;
        const styleKey =
          (typeof instanceNode.styles?.styleKey === "string" &&
          instanceNode.styles.styleKey.trim().length > 0
            ? instanceNode.styles.styleKey.trim()
            : undefined) ??
          (typeof instanceNode.meta?.layerSectionKey === "string" &&
          instanceNode.meta.layerSectionKey.trim().length > 0
            ? instanceNode.meta.layerSectionKey.trim()
            : undefined);
        if (!styleKey) return;
        const style: Record<string, unknown> = {
          position: "absolute",
          left: rect.left,
          top: rect.top,
          ...(rect.width > 0 ? { width: rect.width } : {}),
          ...(rect.height > 0 ? { height: rect.height } : {}),
          ...(rect.rotateDeg !== undefined ? { rotateDeg: rect.rotateDeg } : {}),
        };
        nextSceneStyles.push({ styleKey, style });

        const componentId =
          typeof instanceNode.meta?.componentId === "string"
            ? instanceNode.meta.componentId.trim()
            : "";
        const componentDefinition =
          componentId.length > 0 ? config.graph.componentDefinitions[componentId] : undefined;
        if (componentDefinition) {
          const instanceId =
            typeof instanceNode.meta?.instanceId === "string" &&
            instanceNode.meta.instanceId.trim().length > 0
              ? instanceNode.meta.instanceId.trim()
              : String(fallbackIndex);
          componentDefinition.instanceMode = "detached";
          componentDefinition.instanceTransforms = {
            ...(componentDefinition.instanceTransforms ?? {}),
            [instanceId]: {
              offsetX: rect.left,
              offsetY: rect.top,
              ...(rect.width > 0 ? { width: rect.width } : {}),
              ...(rect.height > 0 ? { height: rect.height } : {}),
              ...(rect.rotateDeg !== undefined ? { rotateDeg: rect.rotateDeg } : {}),
            },
          };
        }
      });

      if (nextSceneStyles.length >= 2) {
        nextSceneStyles.forEach(({ styleKey, style }) => {
          const current = config.layout.scene[
            styleKey
          ] as Record<string, unknown> | undefined;
          config.layout.scene[styleKey] = {
            ...(current ?? {}),
            ...style,
          };
        });
        (config.layout.grid as Record<string, unknown>).layoutMode = "free";
        summary.applied.push("layout.grid.layoutMode=free");
        summary.applied.push("layout.scene.[cardInstanceStyle].position");
        if (nextSceneStyles.length < IMPORT_DAY_KEYS.length) {
          summary.warnings.push(
            `Free card layout applied with ${nextSceneStyles.length}/${IMPORT_DAY_KEYS.length} matched day instances.`
          );
        }
        return true;
      }
    }

    const cardCollectionNode = Object.values(config.graph.nodes).find(
      (node) => node.type === "cardCollection"
    );
    if (!cardCollectionNode) {
      summary.warnings.push(
        "Free card layout candidate detected, but cardCollection graph node is missing."
      );
      return false;
    }

    const componentId =
      (typeof cardCollectionNode.meta?.componentId === "string" &&
      config.graph.componentDefinitions[cardCollectionNode.meta.componentId]
        ? cardCollectionNode.meta.componentId
        : undefined) ??
      Object.keys(config.graph.componentDefinitions)[0];

    if (!componentId) {
      summary.warnings.push(
        "Free card layout candidate detected, but card component definition is missing."
      );
      return false;
    }

    const cardComponent = config.graph.componentDefinitions[componentId];
    if (!cardComponent) return false;

    const instanceNodes = cardCollectionNode.childIds
      .map((childId) => config.graph.nodes[childId])
      .filter(
        (node): node is (typeof config.graph.nodes)[string] =>
          Boolean(node && node.type === "componentInstance")
      );
    if (instanceNodes.length === 0) {
      summary.warnings.push(
        "Free card layout candidate detected, but card instances are missing."
      );
      return false;
    }

    const nextTransforms: NonNullable<
      (typeof cardComponent)["instanceTransforms"]
    > = {};

    instanceNodes.forEach((instanceNode, fallbackIndex) => {
      const dayKey = toDayTagKey(
        typeof instanceNode.meta?.dayKey === "string"
          ? instanceNode.meta.dayKey
          : undefined
      ) as V2TemplateDayKey | undefined;
      if (!dayKey) return;
      const sourceNode = candidateByDay[dayKey];
      if (!sourceNode) return;

      const rect = toRelativeRect({
        rootNode: positionRootNode,
        targetNode: sourceNode,
      });
      if (!rect) return;

      const instanceId =
        typeof instanceNode.meta?.instanceId === "string"
          ? instanceNode.meta.instanceId
          : String(fallbackIndex);
      const transform: {
        offsetX?: number;
        offsetY?: number;
        width?: number;
        height?: number;
        rotateDeg?: number;
      } = {
        offsetX: rect.left,
        offsetY: rect.top,
        ...(rect.width > 0 ? { width: rect.width } : {}),
        ...(rect.height > 0 ? { height: rect.height } : {}),
      };
      if (rect.rotateDeg !== undefined) {
        transform.rotateDeg = rect.rotateDeg;
      }
      nextTransforms[instanceId] = transform;
    });

    const appliedCount = Object.keys(nextTransforms).length;
    if (appliedCount < 2) {
      summary.warnings.push(
        `Free card layout candidate detected (${candidateDayCount} day-tagged cards), but only ${appliedCount} card instances were matched.`
      );
      return false;
    }

    cardComponent.instanceMode = "detached";
    cardComponent.instanceTransforms = nextTransforms;
    (config.layout.grid as Record<string, unknown>).layoutMode = "free";
    summary.applied.push("layout.grid.layoutMode=free");
    summary.applied.push(`graph.componentDefinitions.${componentId}.instanceMode=detached`);
    summary.applied.push(`graph.componentDefinitions.${componentId}.instanceTransforms`);
    if (appliedCount < IMPORT_DAY_KEYS.length) {
      summary.warnings.push(
        `Free card layout applied with ${appliedCount}/${IMPORT_DAY_KEYS.length} matched day instances.`
      );
    }
    return true;
  };

  const rootBounds = getBounds(rootNode);
  if (!rootBounds) {
    summary.warnings.push("Root absoluteBoundingBox is missing.");
    return summary;
  }

  config.templateSize = {
    width: round(rootBounds.width),
    height: round(rootBounds.height),
  };
  summary.applied.push(
    `templateSize(${config.templateSize.width}x${config.templateSize.height})`
  );

  const gridNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.grid,
    aliases: alias.grid,
  });
  summary.presence.grid = Boolean(gridNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: gridNode }),
    target: config.layout.grid as unknown as Record<string, unknown>,
  });
  if (gridNode) {
    applyGridStyleFromFigmaNode({
      node: gridNode,
      target: config.layout.grid as unknown as Record<string, unknown>,
    });
    summary.applied.push("layout.grid");
  }

  const weekFlagNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.weekFlag,
    aliases: alias.weekFlag,
  });
  summary.presence.weekFlag = Boolean(weekFlagNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: weekFlagNode }),
    target: config.layout.weekFlag as unknown as Record<string, unknown>,
    includeRotation: false,
  });
  if (weekFlagNode) {
    const appliedWeekFlagTextStyle = applyTextStyleFromContentNode({
      containerNode: weekFlagNode,
      target: config.layout.weekFlag as unknown as Record<string, unknown>,
    });
    if (!appliedWeekFlagTextStyle) {
      summary.warnings.push("WeekFlag Content(TEXT) not found; text style skipped.");
    }
    summary.applied.push("layout.weekFlag");
  }

  const topObjectNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.topObject,
    aliases: alias.topObject,
  });
  summary.presence.topObject = Boolean(topObjectNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: topObjectNode }),
    target: config.layout.topObjectContainer as unknown as Record<string, unknown>,
  });
  if (topObjectNode) {
    summary.applied.push("layout.topObjectContainer");
  }

  const memoContainerNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.memoContainer,
    aliases: alias.memoContainer,
  });
  summary.presence.memoObject = Boolean(memoContainerNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: memoContainerNode }),
    target: config.layout.scene.memoContainer as unknown as Record<string, unknown>,
  });
  if (memoContainerNode) {
    summary.applied.push("layout.scene.memoContainer");
  }

  const memoContentNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.memoContentContainer,
    aliases: alias.memoContentContainer,
  });
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: memoContentNode }),
    target: config.layout.scene.memoContentContainer as unknown as Record<string, unknown>,
  });
  if (memoContentNode) {
    summary.applied.push("layout.scene.memoContentContainer");
  }

  const memoTextContainerNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.memoTextContainer,
    aliases: alias.memoTextContainer,
  });
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: memoTextContainerNode }),
    target: config.layout.scene.memoTextContainer as unknown as Record<string, unknown>,
  });
  if (memoTextContainerNode) {
    summary.applied.push("layout.scene.memoTextContainer");
  }

  const memoTextNode =
    findFirstByTagValues(allNodes, "slot", slot.memoText) ??
    findFirstByTagCriteria(allNodes, { bind: ["memo.text"] }) ??
    findFirstByNames(allNodes, alias.memoText);
  summary.presence.memoText = Boolean(
    memoTextNode || memoTextContainerNode || memoContentNode
  );
  const memoTextStyleSourceNode = memoTextNode ?? memoTextContainerNode ?? memoContentNode;
  if (memoTextStyleSourceNode) {
    const appliedMemoTextStyle = applyTextStyleFromContentNode({
      containerNode: memoTextStyleSourceNode,
      target: config.layout.scene.memoTextStyle as unknown as Record<string, unknown>,
    });
    if (!appliedMemoTextStyle) {
      summary.warnings.push("Memo Content(TEXT) not found; text style skipped.");
    }
    summary.applied.push("layout.scene.memoTextStyle");
  }

  const profileImageNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.profileImage,
    aliases: alias.profileImage,
  });
  summary.presence.profileImage = Boolean(profileImageNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: profileImageNode }),
    target: config.layout.profileImage as unknown as Record<string, unknown>,
  });
  if (profileImageNode) {
    summary.applied.push("layout.profileImage");
  }

  const profileFrameNode =
    findFirstByTagCriteria(allNodes, {
      slot: slot.profileFrame,
      role: ["frame"],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.profileFrame,
      aliases: alias.profileFrame,
    });
  summary.presence.profileFrame = Boolean(profileFrameNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: profileFrameNode }),
    target: config.layout.profileFrame as unknown as Record<string, unknown>,
  });
  if (profileFrameNode) {
    summary.applied.push("layout.profileFrame");
  }

  const artistObjectNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.artistObject,
    aliases: alias.artistObject,
  });
  summary.presence.artistObject = Boolean(artistObjectNode);

  const profileTextNode = findNodeByTagOrAlias({
    nodes: allNodes,
    tagValues: slot.profileText,
    aliases: alias.profileText,
  });
  summary.presence.profileText = Boolean(profileTextNode);
  if (profileTextNode) {
    const profileTextRect = toRelativeRect({
      rootNode,
      targetNode: profileTextNode,
    });
    applyFlexibleLayoutToTargets({
      rect: profileTextRect,
      containerTarget: config.layout.profileTextRootStyle as unknown as Record<string, unknown>,
      wrapperTarget: config.layout.profileTextWrapperStyle as unknown as Record<string, unknown>,
    });
    summary.applied.push("layout.profileTextRootStyle");
    summary.applied.push("layout.profileTextWrapperStyle");

    const appliedProfileTextStyle = applyTextStyleFromContentNode({
      containerNode: profileTextNode,
      target: config.layout.profileTextStyle as unknown as Record<string, unknown>,
    });
    if (!appliedProfileTextStyle) {
      summary.warnings.push("ProfileText Content(TEXT) not found; text style skipped.");
    }
    summary.applied.push("layout.profileTextStyle");
  }

  let cardContainerNode: FigmaNode | undefined;
  let cardContainerCandidates: FigmaNode[] = [];
  if (gridNode) {
    const gridDescendants = flattenNodes(gridNode);
    const cardMatchesByMetadata = findMatchesByTagValues(
      gridDescendants,
      "slot",
      slot.cardContainer
    );
    const cardMatchesInGrid =
      cardMatchesByMetadata.length > 0
        ? cardMatchesByMetadata
        : findMatchesByNames(gridDescendants, alias.cardContainer);
    const cardMatchesInGridByDayStatus = collectDayStatusCardCandidates(gridDescendants);
    const cardMatchesInGridFinal =
      cardMatchesInGridByDayStatus.length >= 2
        ? cardMatchesInGridByDayStatus
        : cardMatchesInGrid.length > 0
          ? cardMatchesInGrid
          : cardMatchesInGridByDayStatus;
    cardContainerCandidates = cardMatchesInGridFinal;
    cardContainerNode = selectBestCardContainerCandidate({
      candidates: cardMatchesInGridFinal,
      source: "grid descendants",
    });
  }
  if (!cardContainerNode) {
    const cardMatchesByMetadata = findMatchesByTagValues(
      allNodes,
      "slot",
      slot.cardContainer
    );
    const cardMatchesGlobal =
      cardMatchesByMetadata.length > 0
        ? cardMatchesByMetadata
        : findMatchesByNames(allNodes, alias.cardContainer);
    const cardMatchesGlobalByDayStatus = collectDayStatusCardCandidates(allNodes);
    const cardMatchesGlobalFinal =
      cardMatchesGlobalByDayStatus.length >= 2
        ? cardMatchesGlobalByDayStatus
        : cardMatchesGlobal.length > 0
          ? cardMatchesGlobal
          : cardMatchesGlobalByDayStatus;
    cardContainerCandidates = cardMatchesGlobalFinal;
    cardContainerNode = selectBestCardContainerCandidate({
      candidates: cardMatchesGlobalFinal,
      source: "global",
    });
    if (cardContainerNode && gridNode) {
      summary.warnings.push(
        "Card container matched from global nodes (grid-descendant lookup did not resolve)."
      );
    }
  }
  summary.presence.cardContainer = Boolean(cardContainerNode);
  if (cardContainerNode) {
    const collectCardCandidatesByStatus = (
      candidates: FigmaNode[]
    ): Partial<Record<CardTextStatus, FigmaNode>> => {
      const next: Partial<Record<CardTextStatus, FigmaNode>> = {};
      const rankByStatus: Partial<
        Record<CardTextStatus, { score: number; preferMon: number; x: number; y: number }>
      > = {};

      candidates.forEach((candidate) => {
        const status = resolveCandidateStatus(candidate);
        if (!status) return;
        const score = scoreCardContainerCandidate(candidate);
        const dayKey = resolveCandidateDayKey(candidate);
        const bounds = getBounds(candidate);
        const x = bounds?.x ?? Number.POSITIVE_INFINITY;
        const y = bounds?.y ?? Number.POSITIVE_INFINITY;
        const preferMon = dayKey === "mon" ? 1 : 0;
        const prev = rankByStatus[status];
        if (!prev) {
          next[status] = candidate;
          rankByStatus[status] = { score, preferMon, x, y };
          return;
        }
        if (score > prev.score) {
          next[status] = candidate;
          rankByStatus[status] = { score, preferMon, x, y };
          return;
        }
        if (score === prev.score) {
          if (preferMon > prev.preferMon) {
            next[status] = candidate;
            rankByStatus[status] = { score, preferMon, x, y };
            return;
          }
          const isMoreTopLeft = y < prev.y || (y === prev.y && x < prev.x);
          if (preferMon === prev.preferMon && isMoreTopLeft) {
            next[status] = candidate;
            rankByStatus[status] = { score, preferMon, x, y };
          }
        }
      });

      return next;
    };

    const statusCandidatePool = [
      ...cardContainerCandidates,
      ...externalCardCandidates,
    ].filter((candidate): candidate is FigmaNode => Boolean(candidate));
    const statusCandidateById = new Map<string, FigmaNode>();
    statusCandidatePool.forEach((candidate) => {
      const candidateId = candidate.id?.trim();
      if (!candidateId) return;
      if (!statusCandidateById.has(candidateId)) {
        statusCandidateById.set(candidateId, candidate);
      }
    });
    const dedupedStatusCandidates = Array.from(statusCandidateById.values());
    const candidateByStatus = collectCardCandidatesByStatus(dedupedStatusCandidates);
    const candidateByDayStatus = collectCardCandidatesByDayStatus(dedupedStatusCandidates);
    if (!candidateByStatus.online) {
      candidateByStatus.online = cardContainerNode;
    }

    // Card container is rendered inside each grid slot.
    // Store it in local card coordinates (0,0 + own size), not scene-root coordinates.
    applyRectToLayoutObject({
      rect: toRelativeRect({ rootNode: cardContainerNode, targetNode: cardContainerNode }),
      target: config.layout.card.container as unknown as Record<string, unknown>,
    });
    summary.applied.push("layout.card.container");

    const resolveCardBackgroundNode = ({
      candidate,
      statusValues,
      mode,
    }: {
      candidate: FigmaNode;
      statusValues: readonly string[];
      mode: "online" | "multi" | "offline" | "offlineMemo";
    }): FigmaNode | undefined => {
      const candidateNodes = flattenNodes(candidate);
      const normalizeStatusAssetTag = (value: string): string =>
        v2_normalizeAssetToken(value);
      const statusAssetTagPrefixes: Record<typeof mode, string[]> = {
        online: ["online", "on"],
        multi: ["multi", "multiple", "online_multi", "onlinemulti"],
        offline: ["offline", "off", "rest"],
        offlineMemo: ["offlinememo", "offline_memo", "memooffline"],
      };
      const roleScopedBaseNode =
        findFirstByTagCriteria(candidateNodes, {
          slot: slot.cardBackground,
          status: statusValues,
          role: ["base", "background"],
        }) ??
        findFirstByTagCriteria(candidateNodes, {
          slot: slot.cardBackground,
          state: statusValues,
          role: ["base", "background"],
        }) ??
        findFirstByTagCriteria(candidateNodes, {
          slot: slot.cardBackground,
          role: ["base", "background"],
        }) ??
        findFirstByTagValues(candidateNodes, "role", ["base", "background"]);
      if (roleScopedBaseNode) return roleScopedBaseNode;

      const assetTaggedBaseNode = candidateNodes.find((node) => {
        const assetTagRaw = getNodeTagValue(node, "asset");
        if (!assetTagRaw) return false;
        const normalizedAssetTag = normalizeStatusAssetTag(assetTagRaw);
        if (!normalizedAssetTag) return false;
        const roleTag = getNodeTagValue(node, "role");
        if (
          roleTag &&
          !["base", "background"].includes(normalizeTagValue(roleTag))
        ) {
          return false;
        }
        return statusAssetTagPrefixes[mode].some((prefix) => {
          const normalizedPrefix = normalizeStatusAssetTag(prefix);
          return (
            normalizedAssetTag === normalizedPrefix ||
            normalizedAssetTag.startsWith(`${normalizedPrefix}_`)
          );
        });
      });
      if (assetTaggedBaseNode) return assetTaggedBaseNode;

      const statusMatchedNode =
        findFirstByTagCriteria(candidateNodes, {
          slot: slot.cardBackground,
          status: statusValues,
        }) ??
        findFirstByTagCriteria(candidateNodes, {
          slot: slot.cardBackground,
          state: statusValues,
        });
      if (statusMatchedNode) return statusMatchedNode;
      if (mode === "online") {
        return (
          findFirstByNames(candidateNodes, alias.cardOnlineBackground) ??
          findFirstByNames(candidateNodes, ["imagebg"]) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardBackground) ??
          findFirstByNames(candidateNodes, alias.cardSharedBackground)
        );
      }
      if (mode === "multi") {
        return (
          findFirstByNames(candidateNodes, alias.cardMultiBackground) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardBackground) ??
          findFirstByNames(candidateNodes, alias.cardSharedBackground)
        );
      }
      if (mode === "offlineMemo") {
        return (
          findFirstByNames(candidateNodes, alias.cardOfflineMemoBackground) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardBackground) ??
          findFirstByNames(candidateNodes, alias.cardSharedBackground)
        );
      }
      return (
        findFirstByNames(candidateNodes, alias.cardOfflineBackground) ??
        findFirstByTagValues(candidateNodes, "slot", slot.cardBackground) ??
        findFirstByNames(candidateNodes, alias.cardSharedBackground)
      );
    };

    const onlineBackgroundSourceNode = candidateByStatus.online ?? cardContainerNode;
    const multiBackgroundSourceNode =
      candidateByStatus.multi ?? candidateByStatus.online ?? cardContainerNode;
    const offlineBackgroundSourceNode =
      candidateByStatus.offline ??
      candidateByStatus.offlineMemo ??
      candidateByStatus.online ??
      cardContainerNode;
    const offlineMemoBackgroundSourceNode =
      candidateByStatus.offlineMemo ??
      candidateByStatus.offline ??
      candidateByStatus.online ??
      cardContainerNode;

    const onlineBackgroundNode = resolveCardBackgroundNode({
      candidate: onlineBackgroundSourceNode,
      statusValues: ["online"],
      mode: "online",
    });
    const multiBackgroundNode = resolveCardBackgroundNode({
      candidate: multiBackgroundSourceNode,
      statusValues: ["multi", "multiple", "online_multi", "onlinemultiple"],
      mode: "multi",
    });
    const offlineBackgroundNode = resolveCardBackgroundNode({
      candidate: offlineBackgroundSourceNode,
      statusValues: ["offline", "offlineMemo", "offlinememo"],
      mode: "offline",
    });
    const offlineMemoBackgroundNode = resolveCardBackgroundNode({
      candidate: offlineMemoBackgroundSourceNode,
      statusValues: ["offlineMemo", "offlinememo", "offline_memo", "memooffline"],
      mode: "offlineMemo",
    });

    applyRectToLayoutObject({
      rect: toRelativeRect({
        rootNode: onlineBackgroundSourceNode,
        targetNode: onlineBackgroundNode,
      }),
      target: config.layout.card.onlineBackgroundContainer as unknown as Record<
        string,
        unknown
      >,
      includeRotation: false,
    });
    if (onlineBackgroundNode) {
      summary.applied.push("layout.card.onlineBackgroundContainer");
    } else {
      summary.warnings.push("Online background container not found in card structure.");
    }

    applyRectToLayoutObject({
      rect: toRelativeRect({
        rootNode: multiBackgroundSourceNode,
        targetNode: multiBackgroundNode,
      }),
      target: config.layout.card.multiBackgroundContainer as unknown as Record<
        string,
        unknown
      >,
      includeRotation: false,
    });
    if (multiBackgroundNode) {
      summary.applied.push("layout.card.multiBackgroundContainer");
    }

    applyRectToLayoutObject({
      rect: toRelativeRect({
        rootNode: offlineBackgroundSourceNode,
        targetNode: offlineBackgroundNode,
      }),
      target: config.layout.card.offlineBackgroundContainer as unknown as Record<
        string,
        unknown
      >,
      includeRotation: false,
    });
    if (offlineBackgroundNode) {
      summary.applied.push("layout.card.offlineBackgroundContainer");
    } else {
      summary.warnings.push("Offline background container not found in card structure.");
    }

    applyRectToLayoutObject({
      rect: toRelativeRect({
        rootNode: offlineMemoBackgroundSourceNode,
        targetNode: offlineMemoBackgroundNode,
      }),
      target: config.layout.card.offlineMemoBackgroundContainer as unknown as Record<
        string,
        unknown
      >,
      includeRotation: false,
    });
    if (offlineMemoBackgroundNode) {
      summary.applied.push("layout.card.offlineMemoBackgroundContainer");
    }

    const parseEntryIndexFromNode = (node: FigmaNode): number | undefined => {
      const rawIndex = getNodeTagValue(node, "index");
      if (!rawIndex) return undefined;
      const parsed = Number.parseInt(rawIndex, 10);
      if (!Number.isFinite(parsed) || parsed < 0) return undefined;
      return parsed;
    };

    const collectCardEntrySources = ({
      candidate,
      status,
    }: {
      candidate: FigmaNode;
      status: CardTextStatus;
    }): Array<{ index: number; node: FigmaNode }> => {
      const normalizedStatus = normalizeTagValue(status);
      const nodes = flattenNodes(candidate)
        .filter((node) => {
          const slotTag = getNodeTagValue(node, "slot");
          if (!slotTag || normalizeAssetSlot(slotTag) !== "card.entry") return false;
          const index = parseEntryIndexFromNode(node);
          if (index === undefined) return false;
          const statusTag =
            getNodeTagValue(node, "status") ??
            getNodeTagValue(node, "mode") ??
            getNodeTagValue(node, "state");
          if (!statusTag) return true;
          return normalizeTagValue(statusTag) === normalizedStatus;
        })
        .map((node) => ({
          index: parseEntryIndexFromNode(node) as number,
          node,
        }))
        .sort((left, right) => left.index - right.index);

      if (nodes.length > 0) {
        return nodes;
      }
      return [{ index: 0, node: candidate }];
    };

    const resolveCardTextNodesFromCandidate = ({
      candidate,
      sourceNode,
      status,
    }: {
      candidate: FigmaNode;
      sourceNode?: FigmaNode;
      status: CardTextStatus;
    }) => {
      const searchRoot = sourceNode ?? candidate;
      const candidateNodes = flattenNodes(searchRoot);
      const offlineMemoMainTitleNode =
        status === "offlineMemo"
          ? findContainerNodeByTextBind({
              rootNode: searchRoot,
              bindValues: ["entry.offlineMemo"],
            }) ??
            findFirstByTagValues(candidateNodes, "slot", slot.cardOfflineMemo)
          : undefined;
      return {
        mainTitleContainerNode:
          offlineMemoMainTitleNode ??
          findContainerNodeByTextBind({
            rootNode: searchRoot,
            bindValues: ["entry.mainTitle"],
          }) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardMainTitle) ??
          findFirstByNames(candidateNodes, alias.mainTitleContainer),
        subTitleContainerNode:
          findContainerNodeByTextBind({
            rootNode: searchRoot,
            bindValues: ["entry.subTitle"],
          }) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardSubTitle) ??
          findFirstByNames(candidateNodes, alias.subTitleContainer),
        streamingTimeNode:
          findContainerNodeByTextBind({
            rootNode: searchRoot,
            bindValues: ["entry.time"],
          }) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardTime) ??
          findFirstByNames(candidateNodes, alias.streamingTime),
        streamingDateNode:
          findContainerNodeByTextBind({
            rootNode: searchRoot,
            bindValues: ["entry.date"],
          }) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardDate) ??
          findFirstByNames(candidateNodes, alias.streamingDate),
        streamingDayNode:
          findContainerNodeByTextBind({
            rootNode: searchRoot,
            bindValues: ["entry.day"],
          }) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardDay) ??
          findFirstByNames(candidateNodes, alias.streamingDay),
      } as const;
    };

    const onlineVariantSourceNode = candidateByStatus.online ?? cardContainerNode;
    const multiVariantSourceNode =
      candidateByStatus.multi ?? onlineVariantSourceNode;
    const offlineVariantSourceNode =
      candidateByStatus.offline ??
      candidateByStatus.offlineMemo ??
      onlineVariantSourceNode;
    const offlineMemoVariantSourceNode =
      candidateByStatus.offlineMemo ??
      candidateByStatus.offline ??
      onlineVariantSourceNode;

    const onlineEntrySources = collectCardEntrySources({
      candidate: onlineVariantSourceNode,
      status: "online",
    });
    const onlinePrimaryEntrySource =
      onlineEntrySources.find((entry) => entry.index === 0) ?? onlineEntrySources[0];

    const baseCardTextNodes = resolveCardTextNodesFromCandidate({
      candidate: onlineVariantSourceNode,
      sourceNode: onlinePrimaryEntrySource?.node,
      status: "online",
    });
    const mainTitleContainerNode = baseCardTextNodes.mainTitleContainerNode;
    const subTitleContainerNode = baseCardTextNodes.subTitleContainerNode;
    const streamingTimeNode = baseCardTextNodes.streamingTimeNode;
    const streamingDateNode = baseCardTextNodes.streamingDateNode;
    const streamingDayNode = baseCardTextNodes.streamingDayNode;

    const statusTextSourceNodes: Array<{
      status: CardTextStatus;
      candidate: FigmaNode;
    }> = [
      { status: "online", candidate: onlineVariantSourceNode },
      ...(candidateByStatus.multi
        ? [{ status: "multi" as const, candidate: multiVariantSourceNode }]
        : []),
      ...(candidateByStatus.offline
        ? [{ status: "offline" as const, candidate: offlineVariantSourceNode }]
        : []),
      ...(candidateByStatus.offlineMemo
        ? [{ status: "offlineMemo" as const, candidate: offlineMemoVariantSourceNode }]
        : []),
    ];

    const hasCardTextByRole = {
      mainTitle: Boolean(mainTitleContainerNode),
      subTitle: Boolean(subTitleContainerNode),
      streamingTime: Boolean(streamingTimeNode),
      streamingDate: Boolean(streamingDateNode),
      streamingDay: Boolean(streamingDayNode),
    };

    statusTextSourceNodes.forEach(({ status, candidate }) => {
      const entrySources = collectCardEntrySources({
        candidate,
        status,
      });
      const primaryEntrySource =
        entrySources.find((entry) => entry.index === 0) ?? entrySources[0];
      const resolved = resolveCardTextNodesFromCandidate({
        candidate,
        sourceNode: primaryEntrySource?.node,
        status,
      });
      hasCardTextByRole.mainTitle =
        hasCardTextByRole.mainTitle || Boolean(resolved.mainTitleContainerNode);
      hasCardTextByRole.subTitle =
        hasCardTextByRole.subTitle || Boolean(resolved.subTitleContainerNode);
      hasCardTextByRole.streamingTime =
        hasCardTextByRole.streamingTime || Boolean(resolved.streamingTimeNode);
      hasCardTextByRole.streamingDate =
        hasCardTextByRole.streamingDate || Boolean(resolved.streamingDateNode);
      hasCardTextByRole.streamingDay =
        hasCardTextByRole.streamingDay || Boolean(resolved.streamingDayNode);
    });

    summary.presence.cardMainTitle = hasCardTextByRole.mainTitle;
    summary.presence.cardSubTitle = hasCardTextByRole.subTitle;
    summary.presence.cardStreamingTime = hasCardTextByRole.streamingTime;
    summary.presence.cardStreamingDate = hasCardTextByRole.streamingDate;
    summary.presence.cardStreamingDay = hasCardTextByRole.streamingDay;

    const mainTitleRect = toRelativeRect({
      rootNode: cardContainerNode,
      targetNode: mainTitleContainerNode,
    });
    applyFlexibleLayoutToTargets({
      rect: mainTitleRect,
      containerTarget: config.layout.card.mainTitleContainer as unknown as Record<
        string,
        unknown
      >,
      wrapperTarget: config.layout.card.mainTitleWrapperStyle as unknown as Record<
        string,
        unknown
      >,
    });
    if (mainTitleContainerNode) {
      summary.applied.push("layout.card.mainTitleContainer");
      summary.applied.push("layout.card.mainTitleWrapperStyle");
      const appliedMainTitleStyle = applyTextStyleFromContentNode({
        containerNode: mainTitleContainerNode,
        target: config.layout.card.mainTitleTextStyle as unknown as Record<string, unknown>,
      });
      if (!appliedMainTitleStyle) {
        summary.warnings.push("MainTitle Content(TEXT) not found; text style skipped.");
      }
      summary.applied.push("layout.card.mainTitleTextStyle");
    }

    const subTitleRect = toRelativeRect({
      rootNode: cardContainerNode,
      targetNode: subTitleContainerNode,
    });
    applyFlexibleLayoutToTargets({
      rect: subTitleRect,
      containerTarget: config.layout.card.subTitleContainer as unknown as Record<
        string,
        unknown
      >,
      wrapperTarget: config.layout.card.subTitleWrapperStyle as unknown as Record<
        string,
        unknown
      >,
    });
    if (subTitleContainerNode) {
      summary.applied.push("layout.card.subTitleContainer");
      summary.applied.push("layout.card.subTitleWrapperStyle");
      const appliedSubTitleStyle = applyTextStyleFromContentNode({
        containerNode: subTitleContainerNode,
        target: config.layout.card.subTitleTextStyle as unknown as Record<string, unknown>,
      });
      if (!appliedSubTitleStyle) {
        summary.warnings.push("SubTitle Content(TEXT) not found; text style skipped.");
      }
      summary.applied.push("layout.card.subTitleTextStyle");
    }

    applyRectToLayoutObject({
      rect: toRelativeRect({ rootNode: cardContainerNode, targetNode: streamingTimeNode }),
      target: config.layout.card.streamingTime as unknown as Record<string, unknown>,
    });
    if (streamingTimeNode) {
      summary.applied.push("layout.card.streamingTime");
      const appliedStreamingTimeStyle = applyTextStyleFromContentNode({
        containerNode: streamingTimeNode,
        target: config.layout.card.streamingTimeStyle as unknown as Record<string, unknown>,
      });
      if (!appliedStreamingTimeStyle) {
        summary.warnings.push("StreamingTime Content(TEXT) not found; text style skipped.");
      }
      summary.applied.push("layout.card.streamingTimeStyle");
    }

    applyRectToLayoutObject({
      rect: toRelativeRect({ rootNode: cardContainerNode, targetNode: streamingDateNode }),
      target: config.layout.card.streamingDate as unknown as Record<string, unknown>,
    });
    if (streamingDateNode) {
      summary.applied.push("layout.card.streamingDate");
      const appliedStreamingDateStyle = applyTextStyleFromContentNode({
        containerNode: streamingDateNode,
        target: config.layout.card.streamingDateStyle as unknown as Record<string, unknown>,
      });
      if (!appliedStreamingDateStyle) {
        summary.warnings.push("StreamingDate Content(TEXT) not found; text style skipped.");
      }
      summary.applied.push("layout.card.streamingDateStyle");
    }

    applyRectToLayoutObject({
      rect: toRelativeRect({ rootNode: cardContainerNode, targetNode: streamingDayNode }),
      target: config.layout.card.streamingDay as unknown as Record<string, unknown>,
    });
    if (streamingDayNode) {
      summary.applied.push("layout.card.streamingDay");
      const appliedStreamingDayStyle = applyTextStyleFromContentNode({
        containerNode: streamingDayNode,
        target: config.layout.card.streamingDayStyle as unknown as Record<string, unknown>,
      });
      if (!appliedStreamingDayStyle) {
        summary.warnings.push("StreamingDay Content(TEXT) not found; text style skipped.");
      }
      summary.applied.push("layout.card.streamingDayStyle");
    }

    const cardComponentId =
      (Object.values(config.graph.nodes).find((node) => node.type === "cardCollection")
        ?.meta?.componentId as string | undefined) ??
      Object.keys(config.graph.componentDefinitions)[0];
    const cardRootNodeId =
      cardComponentId && config.graph.componentDefinitions[cardComponentId]
        ? config.graph.componentDefinitions[cardComponentId].rootNodeId
        : undefined;
    const cardRootGraphNode = cardRootNodeId ? config.graph.nodes[cardRootNodeId] : undefined;

    const cloneCardStyleRecord = ({
      sourceKey,
      targetKey,
    }: {
      sourceKey?: string;
      targetKey?: string;
    }) => {
      if (!sourceKey || !targetKey) return;
      if (sourceKey === targetKey) return;
      const source = config.layout.card[sourceKey];
      if (source && typeof source === "object") {
        config.layout.card[targetKey] = {
          ...(source as Record<string, unknown>),
        };
      } else {
        config.layout.card[targetKey] = {};
      }
    };

    const ensureCardStyleRecord = (styleKey?: string): Record<string, unknown> | null => {
      if (!styleKey) return null;
      const current = config.layout.card[styleKey];
      if (current && typeof current === "object") {
        return current as Record<string, unknown>;
      }
      config.layout.card[styleKey] = {};
      return config.layout.card[styleKey] as Record<string, unknown>;
    };

    if (cardRootGraphNode && cardRootGraphNode.type === "group") {
      const hasMultiStatus = Boolean(candidateByStatus.multi || multiBackgroundNode);
      const hasOfflineStatus = Boolean(
        candidateByStatus.offline || offlineBackgroundNode
      );
      const hasOfflineMemoStatus = Boolean(
        candidateByStatus.offlineMemo || offlineMemoBackgroundNode
      );
      const hasStatusSpecificCardTextSets = Boolean(
        hasMultiStatus || hasOfflineStatus || hasOfflineMemoStatus
      );

      const roleIsOptionalByStatus = (
        status: CardTextStatus,
        role: "mainTitle" | "subTitle" | "streamingTime" | "streamingDate" | "streamingDay"
      ): boolean => {
        if (status === "online") {
          return role === "streamingDay";
        }
        if (status === "multi") {
          return role === "streamingDate" || role === "streamingDay";
        }
        if (status === "offline") {
          return (
            role === "mainTitle" ||
            role === "subTitle" ||
            role === "streamingTime" ||
            role === "streamingDay"
          );
        }
        if (status === "offlineMemo") {
          return role === "subTitle" || role === "streamingTime" || role === "streamingDay";
        }
        return false;
      };

      const statusSlotAuditPlans: Array<{
        status: CardTextStatus;
        sourceNode: FigmaNode;
        textSourceNode: FigmaNode;
        backgroundNode: FigmaNode | undefined;
      }> = [
        {
          status: "online",
          sourceNode: onlineVariantSourceNode,
          textSourceNode: onlinePrimaryEntrySource?.node ?? onlineVariantSourceNode,
          backgroundNode: onlineBackgroundNode,
        },
        ...(hasMultiStatus
          ? [
              {
                status: "multi" as const,
                sourceNode: multiVariantSourceNode,
                textSourceNode:
                  collectCardEntrySources({
                    candidate: multiVariantSourceNode,
                    status: "multi",
                  }).find((entry) => entry.index === 0)?.node ?? multiVariantSourceNode,
                backgroundNode: multiBackgroundNode,
              },
            ]
          : []),
        ...(hasOfflineStatus
          ? [
              {
                status: "offline" as const,
                sourceNode: offlineVariantSourceNode,
                textSourceNode:
                  collectCardEntrySources({
                    candidate: offlineVariantSourceNode,
                    status: "offline",
                  }).find((entry) => entry.index === 0)?.node ?? offlineVariantSourceNode,
                backgroundNode: offlineBackgroundNode,
              },
            ]
          : []),
        ...(hasOfflineMemoStatus
          ? [
              {
                status: "offlineMemo" as const,
                sourceNode: offlineMemoVariantSourceNode,
                textSourceNode:
                  collectCardEntrySources({
                    candidate: offlineMemoVariantSourceNode,
                    status: "offlineMemo",
                  }).find((entry) => entry.index === 0)?.node ?? offlineMemoVariantSourceNode,
                backgroundNode: offlineMemoBackgroundNode,
              },
            ]
          : []),
      ];

      statusSlotAuditPlans.forEach((plan) => {
        const statusNodes = resolveCardTextNodesFromCandidate({
          candidate: plan.sourceNode,
          sourceNode: plan.textSourceNode,
          status: plan.status,
        });
        const missing: string[] = [];
        if (!plan.backgroundNode) missing.push("background");
        if (!statusNodes.mainTitleContainerNode && !roleIsOptionalByStatus(plan.status, "mainTitle")) {
          missing.push("main");
        }
        if (!statusNodes.subTitleContainerNode && !roleIsOptionalByStatus(plan.status, "subTitle")) {
          missing.push("sub");
        }
        if (!statusNodes.streamingTimeNode && !roleIsOptionalByStatus(plan.status, "streamingTime")) {
          missing.push("time");
        }
        if (!statusNodes.streamingDateNode && !roleIsOptionalByStatus(plan.status, "streamingDate")) {
          missing.push("date");
        }
        if (!statusNodes.streamingDayNode && !roleIsOptionalByStatus(plan.status, "streamingDay")) {
          missing.push("day");
        }
        summary.statusSlotAuditRows.push({
          status: plan.status,
          source:
            `${plan.sourceNode.name || plan.sourceNode.id || "(unknown)"} -> ${plan.textSourceNode.name || plan.textSourceNode.id || "(unknown)"}`,
          background: Boolean(plan.backgroundNode),
          main: Boolean(statusNodes.mainTitleContainerNode),
          sub: Boolean(statusNodes.subTitleContainerNode),
          time: Boolean(statusNodes.streamingTimeNode),
          date: Boolean(statusNodes.streamingDateNode),
          day: Boolean(statusNodes.streamingDayNode),
          missing,
        });
      });

      const variantPlans: Array<{
        status: CardTextStatus;
        nodeIdSuffix: string;
        styleSuffix: string;
        visibilityMode:
          | "onlineOnly"
          | "onlineSingleOnly"
          | "onlineMultipleOnly"
          | "offlineOnly"
          | "offlineNoMemoOnly"
          | "offlineMemoOnly";
        sourceNode: FigmaNode;
        textSourceNode: FigmaNode;
        entryIndex: number;
      }> = hasStatusSpecificCardTextSets
        ? [
            {
              status: "online",
              nodeIdSuffix: "",
              styleSuffix: "",
              visibilityMode: hasMultiStatus ? "onlineSingleOnly" : "onlineOnly",
              sourceNode: onlineVariantSourceNode,
              textSourceNode: onlinePrimaryEntrySource?.node ?? onlineVariantSourceNode,
              entryIndex: onlinePrimaryEntrySource?.index ?? 0,
            },
            ...(hasMultiStatus
              ? collectCardEntrySources({
                  candidate: multiVariantSourceNode,
                  status: "multi",
                }).map((entrySource) => ({
                  status: "multi" as const,
                  nodeIdSuffix: `-multi-e${entrySource.index}`,
                  styleSuffix: `MultiE${entrySource.index}`,
                  visibilityMode: "onlineMultipleOnly" as const,
                  sourceNode: multiVariantSourceNode,
                  textSourceNode: entrySource.node,
                  entryIndex: entrySource.index,
                }))
              : []),
            ...(hasOfflineStatus
              ? [
                  {
                    status: "offline" as const,
                    nodeIdSuffix: "-offline",
                    styleSuffix: "Offline",
                    visibilityMode: hasOfflineMemoStatus
                      ? ("offlineNoMemoOnly" as const)
                      : ("offlineOnly" as const),
                    sourceNode: offlineVariantSourceNode,
                    textSourceNode:
                      collectCardEntrySources({
                        candidate: offlineVariantSourceNode,
                        status: "offline",
                      }).find((entry) => entry.index === 0)?.node ??
                      offlineVariantSourceNode,
                    entryIndex: 0,
                  },
                ]
              : []),
            ...(hasOfflineMemoStatus
              ? [
                  {
                    status: "offlineMemo" as const,
                    nodeIdSuffix: "-offline-memo",
                    styleSuffix: "OfflineMemo",
                    visibilityMode: "offlineMemoOnly" as const,
                    sourceNode: offlineMemoVariantSourceNode,
                    textSourceNode:
                      collectCardEntrySources({
                        candidate: offlineMemoVariantSourceNode,
                        status: "offlineMemo",
                      }).find((entry) => entry.index === 0)?.node ??
                      offlineMemoVariantSourceNode,
                    entryIndex: 0,
                  },
                ]
              : []),
          ]
        : [];

      const ensureCardTextVariantNode = ({
        baseNodeId,
        nodeIdSuffix,
        styleSuffix,
        visibilityMode,
        entryIndex,
        bindingKeyOverride,
      }: {
        baseNodeId: string;
        nodeIdSuffix: string;
        styleSuffix: string;
        visibilityMode:
          | "onlineOnly"
          | "onlineSingleOnly"
          | "onlineMultipleOnly"
          | "offlineOnly"
          | "offlineNoMemoOnly"
          | "offlineMemoOnly";
        entryIndex: number;
        bindingKeyOverride?: string;
      }): string | null => {
        const baseNode = config.graph.nodes[baseNodeId];
        if (!baseNode || (baseNode.type !== "text" && baseNode.type !== "flexibleText")) {
          return null;
        }
        const targetNodeId = nodeIdSuffix ? `${baseNodeId}${nodeIdSuffix}` : baseNodeId;
        const targetLayerId = nodeIdSuffix
          ? `${baseNode.layerId ?? baseNode.id}${nodeIdSuffix}`
          : (baseNode.layerId ?? baseNode.id);
        const withSuffix = (styleKey?: string): string | undefined => {
          if (!styleKey) return undefined;
          if (!styleSuffix) return styleKey;
          return `${styleKey}${styleSuffix}`;
        };
        const containerStyleKey = withSuffix(baseNode.styles?.containerStyleKey);
        const textStyleKey = withSuffix(baseNode.styles?.textStyleKey);
        const wrapperStyleKey = withSuffix(baseNode.styles?.wrapperStyleKey);

        cloneCardStyleRecord({
          sourceKey: baseNode.styles?.containerStyleKey,
          targetKey: containerStyleKey,
        });
        cloneCardStyleRecord({
          sourceKey: baseNode.styles?.textStyleKey,
          targetKey: textStyleKey,
        });
        cloneCardStyleRecord({
          sourceKey: baseNode.styles?.wrapperStyleKey,
          targetKey: wrapperStyleKey,
        });

        const nextNode = {
          ...baseNode,
          id: targetNodeId,
          label: nodeIdSuffix ? `${baseNode.label} (${styleSuffix})` : baseNode.label,
          parentId: cardRootGraphNode.id,
          childIds: [],
          layerId: targetLayerId,
          visibilityMode,
          ...(baseNode.binding
            ? {
                binding:
                  baseNode.binding.mode === "field"
                    ? {
                        ...baseNode.binding,
                        ...(bindingKeyOverride ? { key: bindingKeyOverride } : {}),
                        ...(baseNode.binding.scope === "entry"
                          ? {
                              entrySelector: {
                                mode: "index" as const,
                                index: entryIndex,
                              },
                            }
                          : {}),
                      }
                    : baseNode.binding.mode === "computed"
                      ? {
                          ...baseNode.binding,
                          entrySelector: {
                            mode: "index" as const,
                            index: entryIndex,
                          },
                        }
                      : { ...baseNode.binding },
              }
            : {}),
          styles: {
            ...(baseNode.styles ?? {}),
            ...(containerStyleKey ? { containerStyleKey } : {}),
            ...(textStyleKey ? { textStyleKey } : {}),
            ...(wrapperStyleKey ? { wrapperStyleKey } : {}),
          },
          meta: {
            ...(baseNode.meta ?? {}),
            ...(containerStyleKey ? { layerSectionKey: containerStyleKey } : {}),
          },
        };
        config.graph.nodes[targetNodeId] = nextNode;

        if (!cardRootGraphNode.childIds.includes(targetNodeId)) {
          const siblingIds = cardRootGraphNode.childIds;
          const anchorCandidates = [
            baseNodeId,
            `${baseNodeId}-multi`,
            `${baseNodeId}-offline`,
            `${baseNodeId}-offline-memo`,
          ];
          let anchorIndex = -1;
          anchorCandidates.forEach((candidateId) => {
            const currentIndex = siblingIds.indexOf(candidateId);
            if (currentIndex > anchorIndex) {
              anchorIndex = currentIndex;
            }
          });
          const insertIndex =
            anchorIndex >= 0
              ? Math.min(anchorIndex + 1, cardRootGraphNode.childIds.length)
              : cardRootGraphNode.childIds.length;
          cardRootGraphNode.childIds.splice(insertIndex, 0, targetNodeId);
        }
        return targetNodeId;
      };

      const roleDefinitions = [
        {
          key: "mainTitle" as const,
          baseNodeId: "main-title",
          getSourceNode: (nodes: ReturnType<typeof resolveCardTextNodesFromCandidate>) =>
            nodes.mainTitleContainerNode,
          getBindingKey: (status: CardTextStatus) =>
            status === "offlineMemo" ? "offlineMemo" : "mainTitle",
        },
        {
          key: "subTitle" as const,
          baseNodeId: "sub-title",
          getSourceNode: (nodes: ReturnType<typeof resolveCardTextNodesFromCandidate>) =>
            nodes.subTitleContainerNode,
          getBindingKey: () => "subTitle",
        },
        {
          key: "streamingTime" as const,
          baseNodeId: "streaming-time",
          getSourceNode: (nodes: ReturnType<typeof resolveCardTextNodesFromCandidate>) =>
            nodes.streamingTimeNode,
        },
        {
          key: "streamingDate" as const,
          baseNodeId: "streaming-date",
          getSourceNode: (nodes: ReturnType<typeof resolveCardTextNodesFromCandidate>) =>
            nodes.streamingDateNode,
        },
        {
          key: "streamingDay" as const,
          baseNodeId: "streaming-day",
          getSourceNode: (nodes: ReturnType<typeof resolveCardTextNodesFromCandidate>) =>
            nodes.streamingDayNode,
        },
      ];

      variantPlans.forEach((variantPlan) => {
        const sourceNodes = resolveCardTextNodesFromCandidate({
          candidate: variantPlan.sourceNode,
          sourceNode: variantPlan.textSourceNode,
          status: variantPlan.status,
        });
        roleDefinitions.forEach((roleDefinition) => {
          const isOptionalRole = roleIsOptionalByStatus(
            variantPlan.status,
            roleDefinition.key
          );
          const targetNodeId = ensureCardTextVariantNode({
            baseNodeId: roleDefinition.baseNodeId,
            nodeIdSuffix: variantPlan.nodeIdSuffix,
            styleSuffix: variantPlan.styleSuffix,
            visibilityMode: variantPlan.visibilityMode,
            entryIndex: variantPlan.entryIndex,
            bindingKeyOverride: roleDefinition.getBindingKey?.(variantPlan.status),
          });
          if (!targetNodeId) return;
          const targetGraphNode = config.graph.nodes[targetNodeId];
          if (!targetGraphNode) return;
          const primarySourceNode = roleDefinition.getSourceNode(sourceNodes);
          if (!primarySourceNode) {
            if (!isOptionalRole) {
              summary.warnings.push(
                `Card text source missing: status=${variantPlan.status}, role=${roleDefinition.key}`
              );
            }
            return;
          }
          const sourceNode = primarySourceNode;
          if (!sourceNode) {
            summary.warnings.push(
              `Card text source missing: status=${variantPlan.status}, role=${roleDefinition.key}`
            );
            return;
          }

          const rect = toRelativeRect({
            rootNode: variantPlan.sourceNode,
            targetNode: sourceNode,
          });
          if (!rect) {
            if (!isOptionalRole) {
              summary.warnings.push(
                `Card text rect unavailable: status=${variantPlan.status}, role=${roleDefinition.key}`
              );
            }
            return;
          }

          const containerTarget = ensureCardStyleRecord(
            targetGraphNode.styles?.containerStyleKey
          );
          if (!containerTarget) return;

          if (targetGraphNode.type === "flexibleText") {
            const wrapperTarget = ensureCardStyleRecord(
              targetGraphNode.styles?.wrapperStyleKey
            );
            if (!wrapperTarget) return;
            applyFlexibleLayoutToTargets({
              rect,
              containerTarget,
              wrapperTarget,
            });
          } else {
            applyRectToLayoutObject({
              rect,
              target: containerTarget,
            });
          }

          const textTarget = ensureCardStyleRecord(targetGraphNode.styles?.textStyleKey);
          if (textTarget) {
            const appliedTextStyle = applyTextStyleFromContentNode({
              containerNode: sourceNode,
              target: textTarget,
            });
            if (!appliedTextStyle && !isOptionalRole) {
              summary.warnings.push(
                `Card text style source missing: status=${variantPlan.status}, role=${roleDefinition.key}`
              );
            }
          }
        });
      });

      if (hasStatusSpecificCardTextSets) {
        summary.applied.push("graph.card.statusTextVariants");
      }
    } else {
      summary.warnings.push(
        "Card root graph node not found; skipped status-based card text variant mapping."
      );
    }

    const applyPerDayCardOverrides = () => {
      const instanceNodes = Object.values(config.graph.nodes).filter((node) => {
        if (node.type !== "componentInstance") return false;
        return Boolean(toDayTagKey(node.meta?.dayKey));
      });
      if (instanceNodes.length === 0) return;

      const getBaseNodeId = (nodeId: string): string => {
        const markerIndex = nodeId.indexOf("__inst__");
        if (markerIndex < 0) return nodeId;
        const beforeMarker = nodeId.slice(0, markerIndex);
        const afterMarker = nodeId.slice(markerIndex + "__inst__".length);
        const suffixParts = afterMarker.split("__");
        if (suffixParts.length > 1) {
          return suffixParts.slice(1).join("__");
        }
        return beforeMarker;
      };
      const findNodeByBaseId = ({
        root,
        baseId,
      }: {
        root: (typeof config.graph.nodes)[string];
        baseId: string;
      }): (typeof config.graph.nodes)[string] | undefined => {
        return root.childIds
          .map((childId) => config.graph.nodes[childId])
          .find((childNode) => Boolean(childNode) && getBaseNodeId(childNode.id) === baseId);
      };
      const styleRefKeys = [
        "containerStyleKey",
        "textStyleKey",
        "wrapperStyleKey",
        "optionsKey",
      ] as const;

      const cloneCardLayoutRecordWithSuffix = ({
        sourceKey,
        suffix,
      }: {
        sourceKey?: string;
        suffix: string;
      }): string | undefined => {
        if (!sourceKey || sourceKey.trim().length === 0) return undefined;
        const normalizedSuffix = suffix.replace(/[^a-zA-Z0-9_-]+/g, "_");
        let targetKey = `${sourceKey}__${normalizedSuffix}`;
        if (!(targetKey in config.layout.card)) {
          const sourceValue = config.layout.card[sourceKey];
          if (sourceValue && typeof sourceValue === "object") {
            config.layout.card[targetKey] = {
              ...(sourceValue as Record<string, unknown>),
            };
          } else {
            config.layout.card[targetKey] = {};
          }
        }
        return targetKey;
      };

      const ensureStatusTextVariantNode = ({
        root,
        baseNode,
        variantBaseId,
        visibilityMode,
        entryIndex,
        bindingKeyOverride,
        labelSuffix,
      }: {
        root: (typeof config.graph.nodes)[string];
        baseNode: (typeof config.graph.nodes)[string];
        variantBaseId: string;
        visibilityMode:
          | "onlineOnly"
          | "onlineSingleOnly"
          | "onlineMultipleOnly"
          | "offlineOnly"
          | "offlineNoMemoOnly"
          | "offlineMemoOnly";
        entryIndex: number;
        bindingKeyOverride?: string;
        labelSuffix: string;
      }): (typeof config.graph.nodes)[string] => {
        const existingNode = findNodeByBaseId({
          root,
          baseId: variantBaseId,
        });
        const applyBinding = (
          node: (typeof config.graph.nodes)[string]
        ): (typeof config.graph.nodes)[string]["binding"] => {
          if (!node.binding) return node.binding;
          if (node.binding.mode === "field") {
            return {
              ...node.binding,
              ...(bindingKeyOverride ? { key: bindingKeyOverride } : {}),
              ...(node.binding.scope === "entry"
                ? {
                    entrySelector: {
                      mode: "index" as const,
                      index: entryIndex,
                    },
                  }
                : {}),
            };
          }
          if (node.binding.mode === "computed") {
            return {
              ...node.binding,
              entrySelector: {
                mode: "index" as const,
                index: entryIndex,
              },
            };
          }
          return { ...node.binding };
        };

        if (existingNode) {
          const updatedNode = {
            ...existingNode,
            visibilityMode,
            binding: applyBinding(existingNode),
          };
          config.graph.nodes[existingNode.id] = updatedNode;
          return updatedNode;
        }

        const baseNodeIdToken = baseNode.id.replace(/[^a-zA-Z0-9_-]+/g, "_");
        const variantToken = variantBaseId.replace(/[^a-zA-Z0-9_-]+/g, "_");
        let nextNodeId = `${baseNode.id}__${variantToken}`;
        let idAttempt = 1;
        while (config.graph.nodes[nextNodeId]) {
          nextNodeId = `${baseNode.id}__${variantToken}_${idAttempt}`;
          idAttempt += 1;
        }
        const nextLayerIdBase =
          (baseNode.layerId ?? baseNodeIdToken).replace(/[^a-zA-Z0-9_-]+/g, "_");
        const nextLayerId = `${nextLayerIdBase}__${variantToken}`;

        const clonedStyles = baseNode.styles
          ? ({
              ...baseNode.styles,
            } as Record<string, string | undefined>)
          : {};
        styleRefKeys.forEach((styleRefKey) => {
          const sourceStyleKey =
            typeof clonedStyles[styleRefKey] === "string"
              ? (clonedStyles[styleRefKey] as string)
              : undefined;
          if (!sourceStyleKey) return;
          const targetStyleKey = cloneCardLayoutRecordWithSuffix({
            sourceKey: sourceStyleKey,
            suffix: `${variantToken}`,
          });
          if (targetStyleKey) {
            clonedStyles[styleRefKey] = targetStyleKey;
          }
        });

        const createdNode: (typeof config.graph.nodes)[string] = {
          ...baseNode,
          id: nextNodeId,
          label: `${baseNode.label} (${labelSuffix})`,
          parentId: root.id,
          childIds: [],
          layerId: nextLayerId,
          visibilityMode,
          binding: applyBinding(baseNode),
          styles: clonedStyles,
          meta: {
            ...(baseNode.meta ?? {}),
            ...(typeof clonedStyles.containerStyleKey === "string"
              ? { layerSectionKey: clonedStyles.containerStyleKey }
              : {}),
          },
        };
        config.graph.nodes[nextNodeId] = createdNode;
        if (!root.childIds.includes(nextNodeId)) {
          root.childIds.push(nextNodeId);
        }
        return createdNode;
      };

      const roleIsOptionalByStatus = (
        status: CardTextStatus,
        role: "mainTitle" | "subTitle" | "streamingTime" | "streamingDate" | "streamingDay"
      ): boolean => {
        if (status === "online") return role === "streamingDay";
        if (status === "multi") return role === "streamingDate" || role === "streamingDay";
        if (status === "offline") {
          return (
            role === "mainTitle" ||
            role === "subTitle" ||
            role === "streamingTime" ||
            role === "streamingDay"
          );
        }
        if (status === "offlineMemo") {
          return role === "subTitle" || role === "streamingTime" || role === "streamingDay";
        }
        return false;
      };

      const pushStatusAuditRow = ({
        dayKey,
        status,
        sourceNode,
        background,
        main,
        sub,
        time,
        date,
        day,
      }: {
        dayKey: V2TemplateDayKey;
        status: CardTextStatus;
        sourceNode: FigmaNode;
        background: boolean;
        main: boolean;
        sub: boolean;
        time: boolean;
        date: boolean;
        day: boolean;
      }) => {
        const missing: string[] = [];
        if (!background) missing.push("background");
        if (!main && !roleIsOptionalByStatus(status, "mainTitle")) missing.push("main");
        if (!sub && !roleIsOptionalByStatus(status, "subTitle")) missing.push("sub");
        if (!time && !roleIsOptionalByStatus(status, "streamingTime")) missing.push("time");
        if (!date && !roleIsOptionalByStatus(status, "streamingDate")) missing.push("date");
        if (!day && !roleIsOptionalByStatus(status, "streamingDay")) missing.push("day");
        summary.statusSlotAuditRows.push({
          status,
          source: `${dayKey}:${sourceNode.name || sourceNode.id || "(unknown)"}`,
          background,
          main,
          sub,
          time,
          date,
          day,
          missing,
        });
      };

      const statusPlans: Array<{
        status: CardTextStatus;
        mode: "online" | "multi" | "offline" | "offlineMemo";
        statusValues: readonly string[];
        variantNodeSuffix: string;
      }> = [
        {
          status: "online",
          mode: "online",
          statusValues: ["online"],
          variantNodeSuffix: "",
        },
        {
          status: "multi",
          mode: "multi",
          statusValues: ["multi", "multiple", "online_multi", "onlinemultiple"],
          variantNodeSuffix: "-multi-e0",
        },
        {
          status: "offline",
          mode: "offline",
          statusValues: ["offline", "offlinememo", "offlineMemo"],
          variantNodeSuffix: "-offline",
        },
        {
          status: "offlineMemo",
          mode: "offlineMemo",
          statusValues: ["offlineMemo", "offlinememo", "offline_memo", "memooffline"],
          variantNodeSuffix: "-offline-memo",
        },
      ];

      const visibilityModeByStatus = ({
        status,
        hasMulti,
        hasOfflineMemo,
      }: {
        status: CardTextStatus;
        hasMulti: boolean;
        hasOfflineMemo: boolean;
      }):
        | "onlineOnly"
        | "onlineSingleOnly"
        | "onlineMultipleOnly"
        | "offlineOnly"
        | "offlineNoMemoOnly"
        | "offlineMemoOnly" => {
        if (status === "online") return hasMulti ? "onlineSingleOnly" : "onlineOnly";
        if (status === "multi") return "onlineMultipleOnly";
        if (status === "offline") return hasOfflineMemo ? "offlineNoMemoOnly" : "offlineOnly";
        return "offlineMemoOnly";
      };

      instanceNodes.forEach((instanceNode) => {
        const dayKey = toDayTagKey(
          typeof instanceNode.meta?.dayKey === "string"
            ? instanceNode.meta.dayKey
            : undefined
        ) as V2TemplateDayKey | undefined;
        if (!dayKey) return;
        const componentId =
          typeof instanceNode.meta?.componentId === "string"
            ? instanceNode.meta.componentId.trim()
            : "";
        if (!componentId) return;
        const componentDefinition = config.graph.componentDefinitions[componentId];
        if (!componentDefinition) return;
        const componentRootNode = config.graph.nodes[componentDefinition.rootNodeId];
        if (!componentRootNode || componentRootNode.type !== "group") return;

        const dayStatusSources = candidateByDayStatus[dayKey] ?? {};
        const onlineVariantSourceNode =
          dayStatusSources.online ??
          dayStatusSources.multi ??
          dayStatusSources.offline ??
          dayStatusSources.offlineMemo;
        if (!onlineVariantSourceNode) return;
        const multiVariantSourceNode =
          dayStatusSources.multi ?? dayStatusSources.online ?? onlineVariantSourceNode;
        const offlineVariantSourceNode =
          dayStatusSources.offline ??
          dayStatusSources.offlineMemo ??
          dayStatusSources.online ??
          onlineVariantSourceNode;
        const offlineMemoVariantSourceNode =
          dayStatusSources.offlineMemo ??
          dayStatusSources.offline ??
          dayStatusSources.online ??
          onlineVariantSourceNode;

        const hasMultiStatus = Boolean(dayStatusSources.multi);
        const hasOfflineMemoStatus = Boolean(dayStatusSources.offlineMemo);

        const roleBaseNodes = {
          mainTitle: findNodeByBaseId({ root: componentRootNode, baseId: "main-title" }),
          subTitle: findNodeByBaseId({ root: componentRootNode, baseId: "sub-title" }),
          streamingTime: findNodeByBaseId({
            root: componentRootNode,
            baseId: "streaming-time",
          }),
          streamingDate: findNodeByBaseId({
            root: componentRootNode,
            baseId: "streaming-date",
          }),
          streamingDay: findNodeByBaseId({ root: componentRootNode, baseId: "streaming-day" }),
        };

        const backgroundTargetNodes = {
          online: findNodeByBaseId({ root: componentRootNode, baseId: "online-background" }),
          multi: findNodeByBaseId({ root: componentRootNode, baseId: "multi-background" }),
          offline: findNodeByBaseId({ root: componentRootNode, baseId: "offline-background" }),
          offlineMemo: findNodeByBaseId({
            root: componentRootNode,
            baseId: "offline-memo-background",
          }),
        } as const;

        const sourceByStatus: Record<CardTextStatus, FigmaNode> = {
          online: onlineVariantSourceNode,
          multi: multiVariantSourceNode,
          offline: offlineVariantSourceNode,
          offlineMemo: offlineMemoVariantSourceNode,
        };

        statusPlans.forEach((plan) => {
          const sourceCandidate = sourceByStatus[plan.status];
          const backgroundNode = resolveCardBackgroundNode({
            candidate: sourceCandidate,
            statusValues: plan.statusValues,
            mode: plan.mode,
          });
          const targetBackgroundNode = backgroundTargetNodes[plan.status];
          if (
            targetBackgroundNode &&
            targetBackgroundNode.type === "image" &&
            typeof targetBackgroundNode.styles?.containerStyleKey === "string"
          ) {
            const backgroundRect = toRelativeRect({
              rootNode: sourceCandidate,
              targetNode: backgroundNode,
            });
            applyRectToLayoutObject({
              rect: backgroundRect,
              target: ensureCardStyleRecord(
                targetBackgroundNode.styles.containerStyleKey
              ) as Record<string, unknown>,
              includeRotation: false,
            });
          }

          const entrySources = collectCardEntrySources({
            candidate: sourceCandidate,
            status: plan.status,
          });
          const primaryEntrySource =
            entrySources.find((entry) => entry.index === 0) ?? entrySources[0];
          const sourceNodes = resolveCardTextNodesFromCandidate({
            candidate: sourceCandidate,
            sourceNode: primaryEntrySource?.node,
            status: plan.status,
          });
          const entryIndex = primaryEntrySource?.index ?? 0;
          const visibilityMode = visibilityModeByStatus({
            status: plan.status,
            hasMulti: hasMultiStatus,
            hasOfflineMemo: hasOfflineMemoStatus,
          });

          const resolveTargetTextNode = ({
            role,
            bindingKeyOverride,
          }: {
            role: "mainTitle" | "subTitle" | "streamingTime" | "streamingDate" | "streamingDay";
            bindingKeyOverride?: string;
          }): (typeof config.graph.nodes)[string] | undefined => {
            const baseNode = roleBaseNodes[role];
            if (!baseNode) return undefined;
            if (plan.status === "online") {
              const updatedNode = {
                ...baseNode,
                visibilityMode,
              };
              config.graph.nodes[baseNode.id] = updatedNode;
              return updatedNode;
            }
            return ensureStatusTextVariantNode({
              root: componentRootNode,
              baseNode,
              variantBaseId: `${getBaseNodeId(baseNode.id)}${plan.variantNodeSuffix}`,
              visibilityMode,
              entryIndex,
              bindingKeyOverride,
              labelSuffix: plan.status,
            });
          };

          const targetMainTitleNode = resolveTargetTextNode({
            role: "mainTitle",
            bindingKeyOverride: plan.status === "offlineMemo" ? "offlineMemo" : "mainTitle",
          });
          const targetSubTitleNode = resolveTargetTextNode({
            role: "subTitle",
            bindingKeyOverride: "subTitle",
          });
          const targetStreamingTimeNode = resolveTargetTextNode({ role: "streamingTime" });
          const targetStreamingDateNode = resolveTargetTextNode({ role: "streamingDate" });
          const targetStreamingDayNode = resolveTargetTextNode({ role: "streamingDay" });

          const applyTextSourceToTarget = ({
            sourceNode,
            targetNode,
          }: {
            sourceNode?: FigmaNode;
            targetNode?: (typeof config.graph.nodes)[string];
          }) => {
            if (!sourceNode || !targetNode) return;
            const targetContainerStyleKey =
              typeof targetNode.styles?.containerStyleKey === "string"
                ? targetNode.styles.containerStyleKey
                : undefined;
            const targetTextStyleKey =
              typeof targetNode.styles?.textStyleKey === "string"
                ? targetNode.styles.textStyleKey
                : undefined;
            if (!targetContainerStyleKey) return;
            const rect = toRelativeRect({
              rootNode: sourceCandidate,
              targetNode: sourceNode,
            });
            const containerTarget = ensureCardStyleRecord(targetContainerStyleKey);
            if (!containerTarget) return;
            if (targetNode.type === "flexibleText") {
              const wrapperStyleKey =
                typeof targetNode.styles?.wrapperStyleKey === "string"
                  ? targetNode.styles.wrapperStyleKey
                  : undefined;
              if (!wrapperStyleKey) return;
              const wrapperTarget = ensureCardStyleRecord(wrapperStyleKey);
              if (!wrapperTarget) return;
              applyFlexibleLayoutToTargets({
                rect,
                containerTarget,
                wrapperTarget,
              });
            } else {
              applyRectToLayoutObject({
                rect,
                target: containerTarget,
              });
            }
            if (targetTextStyleKey) {
              const textTarget = ensureCardStyleRecord(targetTextStyleKey);
              if (textTarget) {
                applyTextStyleFromContentNode({
                  containerNode: sourceNode,
                  target: textTarget,
                });
              }
            }
          };

          applyTextSourceToTarget({
            sourceNode: sourceNodes.mainTitleContainerNode,
            targetNode: targetMainTitleNode,
          });
          applyTextSourceToTarget({
            sourceNode: sourceNodes.subTitleContainerNode,
            targetNode: targetSubTitleNode,
          });
          applyTextSourceToTarget({
            sourceNode: sourceNodes.streamingTimeNode,
            targetNode: targetStreamingTimeNode,
          });
          applyTextSourceToTarget({
            sourceNode: sourceNodes.streamingDateNode,
            targetNode: targetStreamingDateNode,
          });
          applyTextSourceToTarget({
            sourceNode: sourceNodes.streamingDayNode,
            targetNode: targetStreamingDayNode,
          });

          pushStatusAuditRow({
            dayKey,
            status: plan.status,
            sourceNode: sourceCandidate,
            background: Boolean(backgroundNode && targetBackgroundNode),
            main: Boolean(sourceNodes.mainTitleContainerNode && targetMainTitleNode),
            sub: Boolean(sourceNodes.subTitleContainerNode && targetSubTitleNode),
            time: Boolean(sourceNodes.streamingTimeNode && targetStreamingTimeNode),
            date: Boolean(sourceNodes.streamingDateNode && targetStreamingDateNode),
            day: Boolean(sourceNodes.streamingDayNode && targetStreamingDayNode),
          });
        });
      });
      summary.applied.push("graph.card.dayStatusIndependentMapping");
    };

    applyPerDayCardOverrides();

    summary.warnings = summary.warnings.filter(
      (warning) =>
        !warning.includes("Card container alias matched") &&
        !warning.includes("Card root graph node not found; skipped status-based card text variant mapping.")
    );

    if (cardContainerCandidates.length > 0) {
      applyFreeLayoutFromCardCandidates({
        candidates: cardContainerCandidates,
        positionRootNode: gridNode ?? rootNode,
      });
    }
  } else {
    summary.warnings.push("Card container node not found by alias mapping.");
  }

  return summary;
};

const fetchFigmaNode = async ({
  fileKey,
  nodeId,
  figmaToken,
}: {
  fileKey: string;
  nodeId: string;
  figmaToken: string;
}) => {
  const requestUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(
    nodeId
  )}`;
  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "X-Figma-Token": figmaToken,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Figma API request failed (${response.status}): ${bodyText}`);
  }

  const payload = (await response.json()) as FigmaNodesResponse;
  const rootNode = payload.nodes?.[nodeId]?.document;
  if (!rootNode) {
    throw new Error(
      `Figma node not found in API response for nodeId=${nodeId} (fileKey=${fileKey})`
    );
  }
  return {
    fileName: payload.name ?? "Untitled",
    rootNode,
  };
};

const fetchFigmaFileComponentMap = async ({
  fileKey,
  figmaToken,
}: {
  fileKey: string;
  figmaToken: string;
}): Promise<Map<string, { name: string; componentSetId?: string }>> => {
  const requestUrl = `https://api.figma.com/v1/files/${fileKey}`;
  const response = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "X-Figma-Token": figmaToken,
    },
  });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Figma file request failed (${response.status}): ${bodyText}`);
  }
  const payload = (await response.json()) as FigmaFileResponse;
  const map = new Map<string, { name: string; componentSetId?: string }>();
  Object.entries(payload.components ?? {}).forEach(([componentId, component]) => {
    if (!componentId) return;
    map.set(componentId, {
      name: component.name ?? "",
      ...(typeof component.componentSetId === "string" && component.componentSetId.trim().length > 0
        ? { componentSetId: component.componentSetId.trim() }
        : {}),
    });
  });
  return map;
};

const fetchFigmaNodesByIds = async ({
  fileKey,
  nodeIds,
  figmaToken,
}: {
  fileKey: string;
  nodeIds: string[];
  figmaToken: string;
}): Promise<Record<string, FigmaNode>> => {
  if (nodeIds.length === 0) return {};
  const chunks = chunkArray(nodeIds, 50);
  const result: Record<string, FigmaNode> = {};

  for (const chunk of chunks) {
    const requestUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(
      chunk.join(",")
    )}`;
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "X-Figma-Token": figmaToken,
      },
    });
    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Figma nodes request failed (${response.status}): ${bodyText}`);
    }
    const payload = (await response.json()) as FigmaNodesResponse;
    Object.entries(payload.nodes ?? {}).forEach(([nodeId, entry]) => {
      if (!nodeId || !entry?.document) return;
      result[nodeId] = entry.document;
    });
  }

  return result;
};

const collectCardComponentIdsFromTemplateRoot = (rootNode: FigmaNode): string[] => {
  const candidates = flattenNodes(rootNode).filter((node) => {
    if (!node.componentId) return false;
    if (hasNodeTagValue({ node, key: "slot", values: ["card"] })) return true;
    const hasDayFromTag = Boolean(toDayTagKey(getNodeTagValue(node, "day")));
    const hasStatusFromTag = Boolean(
      normalizeCardTextStatus(getNodeTagValue(node, "status")) ??
        normalizeCardTextStatus(getNodeTagValue(node, "mode")) ??
        normalizeCardTextStatus(getNodeTagValue(node, "state"))
    );
    if (hasDayFromTag && hasStatusFromTag) return true;
    const hasDayFromName = Boolean(parseDayKeyFromNodeName(node.name));
    const hasStatusFromName = Boolean(parseCardStatusFromNodeName(node.name));
    return hasDayFromName && hasStatusFromName;
  });

  const prioritizedIds = Array.from(
    new Set(
      candidates
        .map((node) => node.componentId?.trim() ?? "")
        .filter((componentId) => componentId.length > 0)
    )
  );

  if (prioritizedIds.length > 0) {
    return prioritizedIds;
  }

  // Fallback: some templates keep instance names generic ("Card"), so we collect
  // all instance component ids from the frame and let component-set filtering narrow it down.
  return Array.from(
    new Set(
      flattenNodes(rootNode)
        .filter((node) => node.type === "INSTANCE")
        .map((node) => node.componentId?.trim() ?? "")
        .filter((componentId) => componentId.length > 0)
    )
  );
};

const fetchExternalCardVariantCandidates = async ({
  rootNode,
  fileKey,
  figmaToken,
  componentMapById,
}: {
  rootNode: FigmaNode;
  fileKey: string;
  figmaToken: string;
  componentMapById?: Map<string, { name: string; componentSetId?: string }>;
}): Promise<{ candidates: FigmaNode[]; warnings: string[] }> => {
  const warnings: string[] = [];
  const cardComponentIds = collectCardComponentIdsFromTemplateRoot(rootNode);
  if (cardComponentIds.length === 0) {
    return { candidates: [], warnings };
  }

  const componentMap =
    componentMapById ??
    (await fetchFigmaFileComponentMap({
      fileKey,
      figmaToken,
    }));

  const componentSetIds = Array.from(
    new Set(
      cardComponentIds
        .map((componentId) => componentMap.get(componentId)?.componentSetId)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    )
  );

  if (componentSetIds.length === 0) {
    warnings.push("Card componentSetId not found; component-set fallback skipped.");
    return { candidates: [], warnings };
  }

  const variantComponentIds = Array.from(
    new Set(
      Array.from(componentMap.entries())
        .filter(([, meta]) =>
          meta.componentSetId ? componentSetIds.includes(meta.componentSetId) : false
        )
        .map(([componentId]) => componentId)
    )
  );

  if (variantComponentIds.length === 0) {
    warnings.push("No variant components found in matched component sets.");
    return { candidates: [], warnings };
  }

  const variantNodesById = await fetchFigmaNodesByIds({
    fileKey,
    nodeIds: variantComponentIds,
    figmaToken,
  });

  const candidates = Object.values(variantNodesById).filter((node) => {
    if (!getBounds(node)) return false;
    const dayKey =
      toDayTagKey(getNodeTagValue(node, "day")) ?? parseDayKeyFromNodeName(node.name);
    const status =
      normalizeCardTextStatus(getNodeTagValue(node, "status")) ??
      normalizeCardTextStatus(getNodeTagValue(node, "mode")) ??
      normalizeCardTextStatus(getNodeTagValue(node, "state")) ??
      parseCardStatusFromNodeName(node.name);
    return Boolean(dayKey && status);
  });

  if (candidates.length === 0) {
    warnings.push("Component-set fallback resolved no day/status card variants.");
  }

  return { candidates, warnings };
};

const fetchFigmaImageUrls = async ({
  fileKey,
  nodeIds,
  figmaToken,
  format,
}: {
  fileKey: string;
  nodeIds: string[];
  figmaToken: string;
  format: "png" | "jpg" | "svg" | "pdf";
}): Promise<Record<string, string | null>> => {
  if (nodeIds.length === 0) return {};

  const chunks = chunkArray(nodeIds, 50);
  const result: Record<string, string | null> = {};

  for (const chunk of chunks) {
    const requestUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(
      chunk.join(",")
    )}&format=${format}&scale=1`;

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "X-Figma-Token": figmaToken,
      },
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`Figma images API failed (${response.status}): ${bodyText}`);
    }

    const payload = (await response.json()) as FigmaImagesResponse;
    if (payload.err) {
      throw new Error(`Figma images API returned error: ${payload.err}`);
    }

    const images = payload.images ?? {};
    Object.entries(images).forEach(([nodeId, url]) => {
      result[nodeId] = typeof url === "string" ? url : null;
    });
  }

  return result;
};

const downloadImageBufferFromUrl = async (url: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> => {
  const response = await fetch(url);
  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Failed to download image (${response.status}): ${bodyText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  return {
    buffer,
    contentType,
  };
};

const applyAssetToConfig = ({
  config,
  candidate,
  theme,
  url,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  candidate: AssetCandidate;
  theme: string;
  url: string;
}) => {
  if (candidate.targetType === "builtin") {
    const builtinKey = candidate.targetKey as V2TemplateBuiltinAssetKey;
    if (!config.assets[builtinKey]) return;

    config.assets[builtinKey][theme] = url;
    if (!config.assetDimensions[builtinKey]) {
      config.assetDimensions[builtinKey] = {};
    }
    config.assetDimensions[builtinKey][theme] = {
      width: round(candidate.width),
      height: round(candidate.height),
    };
    return;
  }

  const extraAssets = config.extraAssets as V2TemplateExtraAssetMap;
  const extraAssetDimensions =
    config.extraAssetDimensions as V2TemplateExtraAssetDimensionMap;
  if (!extraAssets[candidate.targetKey]) {
    extraAssets[candidate.targetKey] = {};
  }
  extraAssets[candidate.targetKey][theme] = url;
  if (!extraAssetDimensions[candidate.targetKey]) {
    extraAssetDimensions[candidate.targetKey] = {};
  }
  extraAssetDimensions[candidate.targetKey][theme] = {
    width: round(candidate.width),
    height: round(candidate.height),
  };
};

const tryAiMatchAssetTargets = async ({
  candidates,
  builtinAssetKeys,
  apiKey,
}: {
  candidates: Array<{
    nodeId: string;
    nodeName: string;
    explicitAssetTag?: string;
    suggestedTargetType?: "builtin" | "extra";
    suggestedTargetKey?: string;
    suggestedReason?: string;
  }>;
  builtinAssetKeys: string[];
  apiKey: string;
}): Promise<Record<string, string | null> | null> => {
  if (candidates.length === 0) return {};

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Review all Figma asset candidates and choose the best builtin key per node when appropriate. Return strict JSON only: {\"matches\":[{\"nodeId\":string,\"key\":string|null,\"reason\":string}]}. key must be one of provided builtinAssetKeys or null. Prefer explicit [asset=...] tags and clear semantic matches. Use null when it should stay unmatched/extra.",
          },
          {
            role: "user",
            content: JSON.stringify({
              candidates,
              builtinAssetKeys,
            }),
          },
        ],
      }),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      matches?: Array<{ nodeId?: string; key?: string | null }>;
    };

    const keySet = new Set(builtinAssetKeys);
    const mapped: Record<string, string | null> = {};
    (parsed.matches ?? []).forEach((item) => {
      if (!item || typeof item.nodeId !== "string") return;
      if (typeof item.key === "string" && keySet.has(item.key)) {
        mapped[item.nodeId] = item.key;
        return;
      }
      mapped[item.nodeId] = null;
    });
    return mapped;
  } catch {
    return null;
  }
};

const importFigmaAssetsToConfig = async ({
  config,
  rootNode,
  externalCardCandidates = [],
  fileKey,
  figmaToken,
  templateId,
  write,
  theme,
  format,
  enableAiMatch,
  openAiKey,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  rootNode: FigmaNode;
  externalCardCandidates?: FigmaNode[];
  fileKey: string;
  figmaToken: string;
  templateId: string;
  write: boolean;
  theme: string;
  format: "png" | "jpg" | "svg" | "pdf";
  enableAiMatch: boolean;
  openAiKey?: string;
}): Promise<AssetImportSummary> => {
  const summary: AssetImportSummary = {
    discovered: 0,
    mapped: 0,
    uploaded: 0,
    applied: 0,
    warnings: [],
    unresolved: [],
  };

  const builtinAssetKeys = Object.keys(config.assets);
  const builtinAssetKeySet = new Set(builtinAssetKeys);
  const builtinAssetKeyLookup = new Map<string, string>();
  builtinAssetKeys.forEach((key) => {
    builtinAssetKeyLookup.set(key, key);
    builtinAssetKeyLookup.set(key.toLowerCase(), key);
    builtinAssetKeyLookup.set(v2_normalizeAssetToken(key), key);
  });

  const recordsByNodeId = new Map<string, FigmaNodeRecord>();
  const recordRoots = [rootNode, ...externalCardCandidates];
  recordRoots.forEach((recordRoot) => {
    collectNodeRecords(recordRoot).forEach((record) => {
      const nodeId = record.node.id?.trim();
      if (!nodeId) return;
      if (recordsByNodeId.has(nodeId)) return;
      recordsByNodeId.set(nodeId, record);
    });
  });
  const records = Array.from(recordsByNodeId.values());
  const candidates: AssetCandidate[] = [];
  const candidateInputs: AssetCandidateInput[] = [];
  const unresolvedNodes: Array<{ nodeId: string; nodeName: string }> = [];
  const canRunAiMatch =
    enableAiMatch &&
    typeof openAiKey === "string" &&
    openAiKey.trim().length > 0;
  const ignoredStructuralSlots = new Set([
    "grid",
    "scene.grid",
    "scene.root",
    "card",
    "profile",
    "artist",
  ]);

  for (const record of records) {
    const nodeId = record.node.id;
    const nodeName = record.node.name ?? "";
    if (!nodeId || !nodeName.trim()) continue;
    if (record.node.visible === false) continue;
    if (record.node.type === "TEXT") continue;
    if (record.node === rootNode) continue;
    if (!isPotentialAssetNode(record.node)) continue;

    const bounds = getBounds(record.node);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;

    summary.discovered += 1;
    const explicitAssetTag = getTagValueFromRecord(record, "asset")?.trim();

    const ruleTarget = resolveAssetTargetFromRecord({
      record,
      builtinAssetKeys,
      builtinAssetKeySet,
      builtinAssetKeyLookup,
    });

    if (!ruleTarget) {
      const directSlot = normalizeAssetSlot(getNodeTagValue(record.node, "slot"));
      if (directSlot && ignoredStructuralSlots.has(directSlot)) {
        continue;
      }
    }

    candidateInputs.push({
      nodeId,
      nodeName,
      width: bounds.width,
      height: bounds.height,
      ...(explicitAssetTag ? { explicitAssetTag } : {}),
      ruleTarget,
    });
  }

  let matchedByAi: Record<string, string | null> | null = null;
  if (candidateInputs.length > 0 && canRunAiMatch) {
    matchedByAi = await tryAiMatchAssetTargets({
      candidates: candidateInputs.map((input) => ({
        nodeId: input.nodeId,
        nodeName: input.nodeName,
        ...(input.explicitAssetTag ? { explicitAssetTag: input.explicitAssetTag } : {}),
        ...(input.ruleTarget
          ? {
              suggestedTargetType: input.ruleTarget.targetType,
              suggestedTargetKey: input.ruleTarget.targetKey,
              suggestedReason: input.ruleTarget.reason,
            }
          : {}),
      })),
      builtinAssetKeys,
      apiKey: openAiKey.trim(),
    });
    if (!matchedByAi) {
      summary.warnings.push(
        "AI asset review failed; falling back to rule-based asset mapping."
      );
    }
  }

  candidateInputs.forEach((input) => {
    const aiKey =
      matchedByAi && Object.prototype.hasOwnProperty.call(matchedByAi, input.nodeId)
        ? matchedByAi[input.nodeId]
        : undefined;

    if (typeof aiKey === "string" && builtinAssetKeySet.has(aiKey)) {
      candidates.push({
        nodeId: input.nodeId,
        nodeName: input.nodeName,
        targetType: "builtin",
        targetKey: aiKey,
        width: input.width,
        height: input.height,
        score: 99,
        reason: "ai-review",
      });
      return;
    }

    if (input.ruleTarget) {
      candidates.push({
        nodeId: input.nodeId,
        nodeName: input.nodeName,
        targetType: input.ruleTarget.targetType,
        targetKey: input.ruleTarget.targetKey,
        width: input.width,
        height: input.height,
        score: input.ruleTarget.score,
        reason:
          typeof aiKey === "undefined"
            ? input.ruleTarget.reason
            : `${input.ruleTarget.reason} (ai-reviewed)`,
      });
      return;
    }

    unresolvedNodes.push({
      nodeId: input.nodeId,
      nodeName: input.nodeName,
    });
  });

  const dedupedCandidates = dedupeAssetCandidates(candidates);
  summary.mapped = dedupedCandidates.length;
  summary.unresolved = unresolvedNodes.map((item) => `${item.nodeName} (${item.nodeId})`);

  const mappedBuiltinTargetKeys = new Set(
    dedupedCandidates
      .filter((candidate) => candidate.targetType === "builtin")
      .map((candidate) => candidate.targetKey)
  );
  const hasOnlineDayAssets = IMPORT_DAY_KEYS.some((dayKey) =>
    mappedBuiltinTargetKeys.has(
      CARD_BACKGROUND_VARIANTS.online.dayAssetKeyByDay[dayKey]
    )
  );
  const hasOfflineDayAssets = IMPORT_DAY_KEYS.some((dayKey) =>
    mappedBuiltinTargetKeys.has(
      CARD_BACKGROUND_VARIANTS.offline.dayAssetKeyByDay[dayKey]
    )
  );
  const hasMultiDayAssets = IMPORT_DAY_KEYS.some((dayKey) =>
    mappedBuiltinTargetKeys.has(CARD_BACKGROUND_VARIANTS.multi.dayAssetKeyByDay[dayKey])
  );
  const hasOfflineMemoDayAssets = IMPORT_DAY_KEYS.some((dayKey) =>
    mappedBuiltinTargetKeys.has(
      CARD_BACKGROUND_VARIANTS.offlineMemo.dayAssetKeyByDay[dayKey]
    )
  );
  if (hasOnlineDayAssets) {
    applyCardBackgroundAssetsByDayToConfig({
      config,
      mode: "online",
      enabled: true,
    });
  }
  if (hasMultiDayAssets) {
    applyCardBackgroundAssetsByDayToConfig({
      config,
      mode: "multi",
      enabled: true,
    });
  }
  if (hasOfflineDayAssets) {
    applyCardBackgroundAssetsByDayToConfig({
      config,
      mode: "offline",
      enabled: true,
    });
  }
  if (hasOfflineMemoDayAssets) {
    applyCardBackgroundAssetsByDayToConfig({
      config,
      mode: "offlineMemo",
      enabled: true,
    });
  }

  if (dedupedCandidates.length === 0) {
    return summary;
  }

  const imageUrlsByNodeId = await fetchFigmaImageUrls({
    fileKey,
    nodeIds: dedupedCandidates.map((candidate) => candidate.nodeId),
    figmaToken,
    format,
  });

  if (!write) {
    for (const candidate of dedupedCandidates) {
      const url = imageUrlsByNodeId[candidate.nodeId];
      if (!url) {
        summary.warnings.push(
          `image export url missing: ${candidate.nodeName} -> ${candidate.targetKey}`
        );
      }
    }
    return summary;
  }

  const safeTemplateId = sanitizePathSegment(templateId, "local");
  const safeTheme = sanitizePathSegment(theme, "first");
  const folder = buildV2AssetUploadFolder({
    templateId: safeTemplateId,
    theme: safeTheme,
    basePrefix: process.env.V2_R2_UPLOAD_BASE_PREFIX,
  });
  const uploadedFileKeys: string[] = [];

  try {
    for (const candidate of dedupedCandidates) {
      const exportUrl = imageUrlsByNodeId[candidate.nodeId];
      if (!exportUrl) {
        summary.warnings.push(
          `export url missing: ${candidate.nodeName} (${candidate.nodeId})`
        );
        continue;
      }

      const downloaded = await downloadImageBufferFromUrl(exportUrl);
      const uploadFileName = `${sanitizePathSegment(candidate.targetKey, "asset")}.${format}`;
      const uploaded = await uploadFileToR2(
        downloaded.buffer,
        uploadFileName,
        downloaded.contentType,
        folder
      );
      uploadedFileKeys.push(uploaded.fileKey);
      summary.uploaded += 1;

      applyAssetToConfig({
        config,
        candidate,
        theme,
        url: uploaded.url,
      });
      summary.applied += 1;
    }

    return summary;
  } catch (error) {
    await Promise.all(
      uploadedFileKeys.map(async (fileKey) => {
        try {
          await deleteFileFromR2(fileKey);
        } catch {
          // ignore rollback failures
        }
      })
    );
    throw error;
  }
};

const resolveSupabaseConnection = ({
  options,
  mergedEnv,
}: {
  options: CliOptions;
  mergedEnv: Record<string, string>;
}): { supabaseUrl: string; supabaseServiceRoleKey: string } => {
  const statusEnv = resolveLocalSupabaseStatusEnv();

  const explicitUrl = options.supabaseUrl;
  const explicitKey = options.supabaseServiceRoleKey;
  if (explicitUrl || explicitKey) {
    if (!explicitUrl || !explicitKey) {
      throw new Error(
        "When using explicit Supabase override, provide both --supabase-url and --supabase-service-role-key."
      );
    }
    return {
      supabaseUrl: explicitUrl,
      supabaseServiceRoleKey: explicitKey,
    };
  }

  const processPairCandidates: Array<{ url?: string; key?: string; source: string }> = [
    {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      source: "process.env.SUPABASE_URL",
    },
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      source: "process.env.NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      url: mergedEnv.SUPABASE_URL,
      key: mergedEnv.SUPABASE_SERVICE_ROLE_KEY,
      source: "envfile.SUPABASE_URL",
    },
    {
      url: mergedEnv.NEXT_PUBLIC_SUPABASE_URL,
      key: mergedEnv.SUPABASE_SERVICE_ROLE_KEY,
      source: "envfile.NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      url: statusEnv.API_URL,
      key: statusEnv.SERVICE_ROLE_KEY,
      source: "supabase status -o env",
    },
  ];

  const resolvedPair = processPairCandidates.find(
    (candidate) => candidate.url && candidate.key
  );

  if (!resolvedPair?.url || !resolvedPair.key) {
    throw new Error(
      "Unable to resolve Supabase URL/service role key. Provide --supabase-url and --supabase-service-role-key or set env vars."
    );
  }

  if (statusEnv.API_URL && resolvedPair.url !== statusEnv.API_URL) {
    console.warn(
      `[import:v2:figma] warning: resolved Supabase URL from ${resolvedPair.source} (${resolvedPair.url}), not local status URL (${statusEnv.API_URL}).`
    );
  }

  return {
    supabaseUrl: resolvedPair.url,
    supabaseServiceRoleKey: resolvedPair.key,
  };
};

const ensureTemplate = async ({
  supabase,
  options,
  resolvedTemplateName,
  resolvedTemplateDescription,
}: {
  supabase: any;
  options: CliOptions;
  resolvedTemplateName: string;
  resolvedTemplateDescription: string;
}): Promise<{ templateId: string; created: boolean }> => {
  if (options.templateId) {
    const { data: existingById, error: existingByIdError } = await supabase
      .from("v2_templates")
      .select("id")
      .eq("id", options.templateId)
      .maybeSingle();

    if (existingByIdError) {
      throw existingByIdError;
    }
    if (!existingById?.id) {
      throw new Error(`v2 template not found for id=${options.templateId}`);
    }
    return { templateId: existingById.id, created: false };
  }

  const { data: existingByName, error: existingByNameError } = await supabase
    .from("v2_templates")
    .select("id")
    .eq("name", resolvedTemplateName)
    .maybeSingle();
  if (existingByNameError) {
    throw existingByNameError;
  }
  if (existingByName?.id) {
    return { templateId: existingByName.id, created: false };
  }

  if (!options.write) {
    return { templateId: "(to-be-created)", created: true };
  }

  const { data: createdTemplate, error: createError } = await supabase
    .from("v2_templates")
    .insert({
      name: resolvedTemplateName,
      description: resolvedTemplateDescription,
      is_public: options.public,
    })
    .select("id")
    .single();

  if (createError) {
    throw createError;
  }
  return { templateId: createdTemplate.id, created: true };
};

const assertCreatedByUserExists = async ({
  supabase,
  userId,
}: {
  supabase: any;
  userId: number;
}) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data?.id) {
    throw new Error(
      `--created-by user id(${userId}) is not present in users table.`
    );
  }
};

const run = async () => {
  const options = parseCliOptions();
  const loadedEnv = loadEnvFiles();
  const mergedEnv = {
    ...loadedEnv,
    ...Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] =>
        typeof entry[1] === "string"
      )
    ),
  };

  hydrateProcessEnvFromLoaded(loadedEnv, [
    "CLOUDFLARE_R2_ENDPOINT",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "CLOUDFLARE_R2_PUBLIC_URL",
    "NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL",
    "V2_R2_UPLOAD_BASE_PREFIX",
  ]);

  const figmaToken =
    options.figmaToken || process.env.FIGMA_ACCESS_TOKEN || loadedEnv.FIGMA_ACCESS_TOKEN;
  if (!figmaToken) {
    throw new Error(
      "FIGMA_ACCESS_TOKEN is required (or pass --figma-token)."
    );
  }

  const { fileKey, nodeId } = parseFigmaUrl(options.figmaUrl);
  const { fileName, rootNode } = await fetchFigmaNode({
    fileKey,
    nodeId,
    figmaToken,
  });
  let componentMapById: Map<string, { name: string; componentSetId?: string }> | undefined;
  let componentMapWarnings: string[] = [];
  try {
    componentMapById = await fetchFigmaFileComponentMap({
      fileKey,
      figmaToken,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown component metadata error";
    componentMapWarnings = [
      `Card component metadata fetch failed: ${message}`,
    ];
  }

  let externalCardCandidates: FigmaNode[] = [];
  let externalCardWarnings: string[] = [];
  try {
    const externalVariantSummary = await fetchExternalCardVariantCandidates({
      rootNode,
      fileKey,
      figmaToken,
      componentMapById,
    });
    externalCardCandidates = externalVariantSummary.candidates;
    externalCardWarnings = externalVariantSummary.warnings;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown component-set fallback error";
    externalCardWarnings = [
      `Card component-set fallback failed: ${message}`,
    ];
  }

  const baseConfig =
    options.configPreset === "empty"
      ? v2_createEmptyTemplateRenderConfig()
      : v2_createDefaultTemplateRenderConfig();

  const mappingSummary = applyLayoutMappingsFromFigma({
    rootNode,
    config: baseConfig,
    externalCardCandidates,
    externalWarnings: [...componentMapWarnings, ...externalCardWarnings],
    componentMapById,
  });
  applyNotApplicablePruning({
    config: baseConfig,
    summary: mappingSummary,
  });

  const nodeName = rootNode.name?.trim() || nodeId;
  const defaultTemplateName = sanitizeTemplateName(`${fileName} / ${nodeName}`);
  const resolvedTemplateName = sanitizeTemplateName(
    options.templateName && options.templateName.length > 0
      ? options.templateName
      : defaultTemplateName
  );

  const resolvedTemplateDescription =
    options.templateDescription && options.templateDescription.length > 0
      ? options.templateDescription
      : `Imported from Figma (${fileKey}:${nodeId})`;

  baseConfig.metadata = {
    schema: "v2_template_render_config",
    name: sanitizeTemplateName(`figma_${fileKey}_${nodeId.replace(/:/g, "_")}`),
    description: `Figma node import source=${options.figmaUrl}`,
  };

  const { supabaseUrl, supabaseServiceRoleKey } = resolveSupabaseConnection({
    options,
    mergedEnv,
  });

  const supabase: any = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (typeof options.createdBy === "number" && Number.isFinite(options.createdBy)) {
    await assertCreatedByUserExists({
      supabase,
      userId: options.createdBy,
    });
  }

  const ensuredTemplate = await ensureTemplate({
    supabase,
    options,
    resolvedTemplateName,
    resolvedTemplateDescription,
  });

  let assetImportSummary: AssetImportSummary | null = null;
  if (options.withAssets) {
    const templateIdForAssets =
      ensuredTemplate.templateId && ensuredTemplate.templateId !== "(to-be-created)"
        ? ensuredTemplate.templateId
        : "local";
    const openAiKey =
      process.env.OPENAI_ACCESS_TOKEN ||
      process.env.OPENAI_API_KEY ||
      loadedEnv.OPENAI_ACCESS_TOKEN ||
      loadedEnv.OPENAI_API_KEY;

    assetImportSummary = await importFigmaAssetsToConfig({
      config: baseConfig,
      rootNode,
      externalCardCandidates,
      fileKey,
      figmaToken,
      templateId: templateIdForAssets,
      write: options.write,
      theme: options.assetTheme,
      format: options.assetFormat,
      enableAiMatch: !options.noAiAssetMatch,
      openAiKey,
    });
  }

  const normalizedConfig = v2_normalizeTemplateRenderConfig(baseConfig);

  let existingDraftCount = 0;
  if (
    ensuredTemplate.templateId &&
    ensuredTemplate.templateId !== "(to-be-created)"
  ) {
    const { count: draftCount, error: draftCountError } = await supabase
      .from("v2_template_render_config_drafts")
      .select("id", { count: "exact", head: true })
      .eq("template_id", ensuredTemplate.templateId);
    if (draftCountError) {
      throw draftCountError;
    }
    existingDraftCount = draftCount ?? 0;
  }

  const summaryLines = [
    `[import:v2:figma] mode=${options.write ? "write" : "dry-run"}`,
    `[import:v2:figma] figma file=${fileName} (${fileKey}), node=${nodeName} (${nodeId})`,
    `[import:v2:figma] target template name="${resolvedTemplateName}" id=${ensuredTemplate.templateId}`,
    `[import:v2:figma] config preset=${options.configPreset}, configVersion=${normalizedConfig.version}`,
    `[import:v2:figma] applied mappings=${mappingSummary.applied.length}`,
    `[import:v2:figma] assets=${options.withAssets ? "enabled" : "disabled"} theme=${options.assetTheme} format=${options.assetFormat}`,
  ];
  if (assetImportSummary) {
    summaryLines.push(
      `[import:v2:figma] assets discovered=${assetImportSummary.discovered}, mapped=${assetImportSummary.mapped}, uploaded=${assetImportSummary.uploaded}, applied=${assetImportSummary.applied}, unresolved=${assetImportSummary.unresolved.length}`
    );
  }
  summaryLines.forEach((line) => console.log(line));

  if (mappingSummary.applied.length > 0) {
    console.log(`[import:v2:figma] mapping keys: ${mappingSummary.applied.join(", ")}`);
  }
  if (mappingSummary.statusSlotAuditRows.length > 0) {
    console.log("[import:v2:figma] card status slot audit:");
    console.log(
      "[import:v2:figma] status | source | bg | main | sub | time | date | day | missing"
    );
    mappingSummary.statusSlotAuditRows.forEach((row) => {
      const yesNo = (value: boolean) => (value ? "Y" : "N");
      console.log(
        `[import:v2:figma] ${row.status} | ${row.source} | ${yesNo(row.background)} | ${yesNo(row.main)} | ${yesNo(row.sub)} | ${yesNo(row.time)} | ${yesNo(row.date)} | ${yesNo(row.day)} | ${row.missing.length > 0 ? row.missing.join(",") : "-"}`
      );
    });
  }
  if (mappingSummary.warnings.length > 0) {
    mappingSummary.warnings.forEach((warning) => {
      console.warn(`[import:v2:figma] warning: ${warning}`);
    });
  }
  if (mappingSummary.notApplicable.length > 0) {
    console.log(
      `[import:v2:figma] not-applicable: ${mappingSummary.notApplicable.join(", ")}`
    );
  }
  if (assetImportSummary?.warnings.length) {
    assetImportSummary.warnings.forEach((warning) => {
      console.warn(`[import:v2:figma] asset warning: ${warning}`);
    });
  }
  if (assetImportSummary?.unresolved.length) {
    console.warn(
      `[import:v2:figma] unresolved asset nodes: ${assetImportSummary.unresolved.join(", ")}`
    );
  }
  if (existingDraftCount > 0) {
    console.warn(
      `[import:v2:figma] warning: ${existingDraftCount} draft(s) exist for template=${ensuredTemplate.templateId}. Admin editor loads draft first; imported config may not be visible until draft is cleared/published.`
    );
  }

  if (!options.write) {
    console.log(
      "[import:v2:figma] dry-run complete. Add --write to persist template/render config."
    );
    return;
  }

  if (!ensuredTemplate.templateId || ensuredTemplate.templateId === "(to-be-created)") {
    throw new Error("Template id could not be resolved before write.");
  }
  const templateId = ensuredTemplate.templateId;

  const { error: upsertConfigError } = await supabase
    .from("v2_template_render_configs")
    .upsert(
      {
        template_id: templateId,
        config_version: normalizedConfig.version,
        render_config: normalizedConfig,
      },
      { onConflict: "template_id" }
    );
  if (upsertConfigError) {
    throw upsertConfigError;
  }

  const { data: latestRevision, error: latestRevisionError } = await supabase
    .from("v2_template_render_config_revisions")
    .select("revision_no")
    .eq("template_id", templateId)
    .order("revision_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestRevisionError) {
    throw latestRevisionError;
  }
  const nextRevisionNo = (latestRevision?.revision_no ?? 0) + 1;

  const revisionPayload: Record<string, unknown> = {
    template_id: templateId,
    revision_no: nextRevisionNo,
    config_version: normalizedConfig.version,
    render_config: normalizedConfig,
    source: options.source,
  };
  if (typeof options.createdBy === "number" && Number.isFinite(options.createdBy)) {
    revisionPayload.created_by = options.createdBy;
  }

  const { error: insertRevisionError } = await supabase
    .from("v2_template_render_config_revisions")
    .insert(revisionPayload);
  if (insertRevisionError) {
    throw insertRevisionError;
  }

  console.log(
    `[import:v2:figma] write complete: templateId=${templateId}, revisionNo=${nextRevisionNo}`
  );
};

run().catch((error) => {
  console.error("[import:v2:figma] failed:", error);
  process.exit(1);
});
