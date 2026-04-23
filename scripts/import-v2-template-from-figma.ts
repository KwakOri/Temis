import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { deleteFileFromR2, uploadFileToR2 } from "../src/lib/r2";
import { v2_normalizeCardImportGraph } from "./lib/v2/v2-card-import-normalizer";
import {
  v2_extractDayKeyFromAssetToken,
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

type CardBackgroundAssetMode = "none" | "shared" | "byDay";

export type ImportV2TemplateFromFigmaOptions = {
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
  explicitExternalCardCandidates?: FigmaNode[];
  explicitExternalArtistVariantCandidates?: FigmaNode[];
  cardBackgroundModeByStatus?: Partial<
    Record<CardBackgroundVariantMode, CardBackgroundAssetMode>
  >;
  explicitExternalWarnings?: string[];
  skipExternalCardVariantAutodiscovery?: boolean;
  postProcessNormalizedConfig?: (
    config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>
  ) => ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
};

export type ImportV2TemplateFromFigmaResult = {
  mode: "dry-run" | "write";
  templateId: string;
  templateName: string;
  normalizedConfig: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  latestRevisionNo: number | null;
};

type CliOptions = ImportV2TemplateFromFigmaOptions;

export type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
  componentId?: string;
  componentSetId?: string;
  variantProperties?: Record<string, string>;
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
    dayKey?: V2TemplateDayKey;
    status: CardTextStatus;
    entryIndex?: number;
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
    artistText: boolean;
    artistObject: boolean;
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
type ArtistVariantState = "on" | "off";
type ImportRenderConfig = ReturnType<typeof v2_createDefaultTemplateRenderConfig>;

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

const findFirstDirectChildByTagValues = ({
  rootNode,
  key,
  values,
}: {
  rootNode: FigmaNode | undefined;
  key: string;
  values: readonly string[];
}): FigmaNode | undefined => {
  if (!rootNode || !Array.isArray(rootNode.children)) return undefined;
  return findFirstByTagValues(rootNode.children, key, values);
};

const findFirstDirectChildByNames = ({
  rootNode,
  aliases,
}: {
  rootNode: FigmaNode | undefined;
  aliases: readonly string[];
}): FigmaNode | undefined => {
  if (!rootNode || !Array.isArray(rootNode.children)) return undefined;
  return findFirstByNames(rootNode.children, aliases);
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
  "artist.background": "artistOnByTheme",
  "artist.object": "artistOnByTheme",
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
  artist: "artistOnByTheme",
  artiston: "artistOnByTheme",
  artist_on: "artistOnByTheme",
  "artist-on": "artistOnByTheme",
  artistoff: "artistOffByTheme",
  artist_off: "artistOffByTheme",
  "artist-off": "artistOffByTheme",
  noartist: "artistOffByTheme",
  no_artist: "artistOffByTheme",
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

const applyCardBackgroundModeToConfig = ({
  config,
  mode,
  backgroundMode,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  mode: CardBackgroundVariantMode;
  backgroundMode: CardBackgroundAssetMode;
}) => {
  const variant = CARD_BACKGROUND_VARIANTS[mode];
  const dayMap = backgroundMode === "byDay" ? buildCardBackgroundDayAssetRefMap(mode) : null;

  Object.entries(config.graph.nodes).forEach(([nodeId, node]) => {
    if (!isCardBackgroundNodeForVariant({ node, mode })) return;

    const nextMeta = {
      ...(node.meta ?? {}),
    };

    if (backgroundMode === "byDay" && dayMap) {
      nextMeta.assetRefByDayKey = dayMap;
    } else {
      delete nextMeta.assetRefByDayKey;
    }

    if (variant.builtinAssetKey) {
      nextMeta.assetRef = {
        source: "builtin",
        key: variant.builtinAssetKey,
      };
    }

    config.graph.nodes[nodeId] = {
      ...node,
      meta: nextMeta,
    };
  });

  const optionKey = variant.editorOptionByDayKey;
  if (optionKey) {
    config.editorOptions[optionKey] = backgroundMode === "byDay";
  }
};

const resolveCardBackgroundModeFromMappedBuiltinKeys = ({
  mappedBuiltinTargetKeys,
  mode,
}: {
  mappedBuiltinTargetKeys: Set<V2TemplateBuiltinAssetKey>;
  mode: CardBackgroundVariantMode;
}): CardBackgroundAssetMode => {
  const variant = CARD_BACKGROUND_VARIANTS[mode];
  const hasAnyDayAsset = IMPORT_DAY_KEYS.some((dayKey) =>
    mappedBuiltinTargetKeys.has(variant.dayAssetKeyByDay[dayKey])
  );
  if (hasAnyDayAsset) {
    return "byDay";
  }
  if (variant.builtinAssetKey && mappedBuiltinTargetKeys.has(variant.builtinAssetKey)) {
    return "shared";
  }
  return "none";
};

const promoteSharedCardBackgroundAsset = ({
  config,
  mode,
  theme,
  summary,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  mode: CardBackgroundVariantMode;
  theme: string;
  summary: AssetImportSummary;
}) => {
  const variant = CARD_BACKGROUND_VARIANTS[mode];
  if (!variant.builtinAssetKey) return;

  const sharedKey = variant.builtinAssetKey;
  if (config.assets[sharedKey]?.[theme]) return;

  const sourceDayKey = IMPORT_DAY_KEYS.find(
    (dayKey) => config.assets[variant.dayAssetKeyByDay[dayKey]]?.[theme]
  );
  if (!sourceDayKey) return;

  const sourceKey = variant.dayAssetKeyByDay[sourceDayKey];
  const sourceUrl = config.assets[sourceKey]?.[theme];
  if (!sourceUrl) return;

  config.assets[sharedKey][theme] = sourceUrl;
  const sourceDimensions = config.assetDimensions[sourceKey]?.[theme];
  if (sourceDimensions) {
    if (!config.assetDimensions[sharedKey]) {
      config.assetDimensions[sharedKey] = {};
    }
    config.assetDimensions[sharedKey][theme] = sourceDimensions;
  }

  summary.warnings.push(
    `Promoted ${sourceKey} -> ${sharedKey} for shared ${mode} background.`
  );
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

const remapRelativeRectToPlacedRoot = ({
  templateRootNode,
  placedRootNode,
  sourceRootNode,
  rect,
}: {
  templateRootNode: FigmaNode;
  placedRootNode: FigmaNode | undefined;
  sourceRootNode: FigmaNode;
  rect: Rect | null;
}): Rect | null => {
  if (!placedRootNode || !rect) return null;

  const templateBounds = getBounds(templateRootNode);
  const placedBounds = getBounds(placedRootNode);
  const sourceBounds = getBounds(sourceRootNode);
  if (!templateBounds || !placedBounds || !sourceBounds) {
    return null;
  }

  const scaleX =
    sourceBounds.width > 0 ? placedBounds.width / sourceBounds.width : 1;
  const scaleY =
    sourceBounds.height > 0 ? placedBounds.height / sourceBounds.height : 1;

  return {
    left: round(placedBounds.x - templateBounds.x + rect.left * scaleX),
    top: round(placedBounds.y - templateBounds.y + rect.top * scaleY),
    width: round(rect.width * scaleX),
    height: round(rect.height * scaleY),
    ...(rect.rotateDeg !== undefined ? { rotateDeg: rect.rotateDeg } : {}),
  };
};

const findNodePathWithin = ({
  rootNode,
  targetNodeId,
}: {
  rootNode: FigmaNode;
  targetNodeId: string;
}): FigmaNode[] | null => {
  const visit = (currentNode: FigmaNode, path: FigmaNode[]): FigmaNode[] | null => {
    const currentId = typeof currentNode.id === "string" ? currentNode.id.trim() : "";
    const nextPath = [...path, currentNode];
    if (currentId.length > 0 && currentId === targetNodeId) {
      return nextPath;
    }
    if (!Array.isArray(currentNode.children) || currentNode.children.length === 0) {
      return null;
    }
    for (const childNode of currentNode.children) {
      const found = visit(childNode, nextPath);
      if (found) return found;
    }
    return null;
  };

  return visit(rootNode, []);
};

const resolvePositionContextRootByFrame = ({
  sourceRootNode,
  targetNode,
}: {
  sourceRootNode: FigmaNode;
  targetNode: FigmaNode | undefined;
}): FigmaNode => {
  const targetNodeId =
    typeof targetNode?.id === "string" ? targetNode.id.trim() : "";
  if (!targetNode || targetNodeId.length === 0) return sourceRootNode;

  const path = findNodePathWithin({
    rootNode: sourceRootNode,
    targetNodeId,
  });
  if (!path || path.length === 0) return sourceRootNode;

  // Group is a semantic wrapper (position:none).
  // The closest FRAME ancestor becomes the local coordinate context.
  for (let index = path.length - 2; index >= 0; index -= 1) {
    const ancestor = path[index];
    if ((ancestor.type ?? "").toUpperCase() === "FRAME") {
      return ancestor;
    }
  }
  return sourceRootNode;
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

const findNodeByCanonicalPath = ({
  rootNode,
  pathAliases,
}: {
  rootNode: FigmaNode;
  pathAliases: readonly (readonly string[])[];
}): FigmaNode | undefined => {
  let currentNode: FigmaNode | undefined = rootNode;
  for (const aliases of pathAliases) {
    currentNode = findFirstDirectChildByNames({
      rootNode: currentNode,
      aliases,
    });
    if (!currentNode) return undefined;
  }
  return currentNode;
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

const parseArtistVariantStateFromRecord = (
  record: FigmaNodeRecord
): ArtistVariantState | undefined => {
  const direct = parseArtistVariantStateFromNode(record.node);
  if (direct) return direct;
  for (const ancestor of record.ancestors) {
    const parsed = parseArtistVariantStateFromNode(ancestor);
    if (parsed) return parsed;
  }
  return undefined;
};

const parseCardStatusFromRecord = (
  record: FigmaNodeRecord
): CardTextStatus | undefined => {
  const fromNode =
    normalizeCardTextStatus(getNodeTagValue(record.node, "status")) ??
    normalizeCardTextStatus(getNodeTagValue(record.node, "mode")) ??
    normalizeCardTextStatus(getNodeTagValue(record.node, "state")) ??
    parseCardStatusFromNodeName(record.node.name);
  if (fromNode) return fromNode;
  for (const ancestor of record.ancestors) {
    const parsed =
      normalizeCardTextStatus(getNodeTagValue(ancestor, "status")) ??
      normalizeCardTextStatus(getNodeTagValue(ancestor, "mode")) ??
      normalizeCardTextStatus(getNodeTagValue(ancestor, "state")) ??
      parseCardStatusFromNodeName(ancestor.name);
    if (parsed) return parsed;
  }
  return undefined;
};

const parseDayKeyFromRecord = (
  record: FigmaNodeRecord
): V2TemplateDayKey | undefined => {
  const fromNode =
    toDayTagKey(getNodeTagValue(record.node, "day")) ??
    parseDayKeyFromNodeName(record.node.name);
  if (fromNode) return fromNode as V2TemplateDayKey;
  for (const ancestor of record.ancestors) {
    const parsed =
      toDayTagKey(getNodeTagValue(ancestor, "day")) ??
      parseDayKeyFromNodeName(ancestor.name);
    if (parsed) return parsed as V2TemplateDayKey;
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

const ARTIST_VARIANT_STATE_ALIASES: Record<string, ArtistVariantState> = {
  on: "on",
  artiston: "on",
  artist_on: "on",
  "artist-on": "on",
  off: "off",
  artistoff: "off",
  artist_off: "off",
  "artist-off": "off",
  noartist: "off",
  no_artist: "off",
  noartistobject: "off",
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

const normalizeArtistVariantState = (
  value: string | undefined
): ArtistVariantState | undefined => {
  if (!value) return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return ARTIST_VARIANT_STATE_ALIASES[normalized];
};

const tokenizeNodeName = (value: string | undefined): string[] => {
  if (!value) return [];
  const baseName = stripNodeNameMetadata(value).toLowerCase();
  return baseName
    .split(/[^a-z0-9가-힣]+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const parseArtistVariantStateFromNode = (
  node: FigmaNode | undefined
): ArtistVariantState | undefined => {
  if (!node) return undefined;

  for (const [rawKey, rawValue] of Object.entries(node.variantProperties ?? {})) {
    const key = canonicalName(rawKey);
    if (!key.includes("artist")) continue;
    const normalized = normalizeArtistVariantState(rawValue);
    if (normalized) return normalized;
  }

  const tokens = tokenizeNodeName(node.name);
  const isArtistName =
    tokens.includes("artist") ||
    tokens.includes("artiston") ||
    tokens.includes("artistoff") ||
    tokens.includes("noartist");
  if (!isArtistName) return undefined;
  if (tokens.includes("off") || tokens.includes("artistoff") || tokens.includes("noartist")) {
    return "off";
  }
  if (tokens.includes("on") || tokens.includes("artiston")) {
    return "on";
  }
  return undefined;
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

  const explicitDayKey = v2_extractDayKeyFromAssetToken(normalizedTag);
  const explicitStatus = (() => {
    const direct = normalizeAssetStatus(trimmed) ?? normalizeAssetStatus(normalizedTag);
    if (direct) return direct;
    if (
      normalizedTag.startsWith("offline_memo_") ||
      normalizedTag.startsWith("offlinememo_") ||
      normalizedTag.startsWith("memo_offline_") ||
      normalizedTag.startsWith("memooffline_")
    ) {
      return "offlineMemo" as const;
    }
    if (normalizedTag.startsWith("multi_")) return "multi" as const;
    if (normalizedTag.startsWith("online_")) return "online" as const;
    if (normalizedTag.startsWith("offline_")) return "offline" as const;
    return undefined;
  })();
  if (explicitStatus && explicitDayKey) {
    const explicitDayAssetKey =
      explicitStatus === "offlineMemo"
        ? `offlineMemo_${explicitDayKey}`
        : `${explicitStatus}_${explicitDayKey}`;
    if (builtinAssetKeySet.has(explicitDayAssetKey)) {
      return {
        targetType: "builtin",
        targetKey: explicitDayAssetKey,
        score: 97,
        reason: `[asset=${assetTagValue}] explicit status/day builtin`,
      };
    }
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
    normalizeAssetStatus(getTagValueFromRecord(record, "mode")) ??
    parseCardStatusFromRecord(record);
  const dayTag = parseDayKeyFromRecord(record);
  const nodeCanonicalName = canonicalName(nodeName);
  const artistVariantState = parseArtistVariantStateFromRecord(record);
  const isGenericBackgroundNode = [
    "imagebg",
    "bg",
    "background",
    "imagebackground",
  ].includes(nodeCanonicalName);
  const isArtistBackgroundNode = Boolean(artistVariantState && isGenericBackgroundNode);
  if (isArtistBackgroundNode) {
    return {
      targetType: "builtin",
      targetKey:
        artistVariantState === "on" ? "artistOnByTheme" : "artistOffByTheme",
      score: 88,
      reason: `artist-variant(${artistVariantState})`,
    };
  }

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

  const isGenericCardBackgroundNode = isGenericBackgroundNode;
  if (isGenericCardBackgroundNode && statusTag) {
    if (statusTag === "online" && dayTag && builtinAssetKeySet.has(`online_${dayTag}`)) {
      return {
        targetType: "builtin",
        targetKey: `online_${dayTag}`,
        score: 83,
        reason: `name(${nodeCanonicalName}) + status(${statusTag}) + day(${dayTag})`,
      };
    }
    if (statusTag === "offline" && dayTag && builtinAssetKeySet.has(`offline_${dayTag}`)) {
      return {
        targetType: "builtin",
        targetKey: `offline_${dayTag}`,
        score: 83,
        reason: `name(${nodeCanonicalName}) + status(${statusTag}) + day(${dayTag})`,
      };
    }
    if (statusTag === "multi" && dayTag && builtinAssetKeySet.has(`multi_${dayTag}`)) {
      return {
        targetType: "builtin",
        targetKey: `multi_${dayTag}`,
        score: 83,
        reason: `name(${nodeCanonicalName}) + status(${statusTag}) + day(${dayTag})`,
      };
    }
    if (
      statusTag === "offlineMemo" &&
      dayTag &&
      builtinAssetKeySet.has(`offlineMemo_${dayTag}`)
    ) {
      return {
        targetType: "builtin",
        targetKey: `offlineMemo_${dayTag}`,
        score: 83,
        reason: `name(${nodeCanonicalName}) + status(${statusTag}) + day(${dayTag})`,
      };
    }
    if (statusTag === "online") {
      if (builtinAssetKeySet.has("onlineByTheme")) {
        return {
          targetType: "builtin",
          targetKey: "onlineByTheme",
          score: 76,
          reason: `name(${nodeCanonicalName}) + status(${statusTag})`,
        };
      }
    }
    if (statusTag === "offline") {
      if (builtinAssetKeySet.has("offlineByTheme")) {
        return {
          targetType: "builtin",
          targetKey: "offlineByTheme",
          score: 76,
          reason: `name(${nodeCanonicalName}) + status(${statusTag})`,
        };
      }
    }
    if (statusTag === "multi") {
      if (builtinAssetKeySet.has("multiByTheme")) {
        return {
          targetType: "builtin",
          targetKey: "multiByTheme",
          score: 76,
          reason: `name(${nodeCanonicalName}) + status(${statusTag})`,
        };
      }
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

const DEFAULT_NETWORK_TIMEOUT_MS = 60_000;

const fetchWithTimeout = async (
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("aborted"))
    ) {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${input}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

const CARD_INSTANCE_MARKER = "__inst__";
const CARD_STYLE_REF_KEYS = [
  "styleKey",
  "containerStyleKey",
  "textStyleKey",
  "wrapperStyleKey",
  "optionsKey",
] as const;

const makeUniqueGraphId = (base: string, used: Set<string>): string => {
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}:${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
};

const makeUniqueCardStyleKey = (base: string, used: Set<string>): string => {
  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
};

const collectComponentSubtreeNodeIds = ({
  rootNodeId,
  nodes,
}: {
  rootNodeId: string;
  nodes: ImportRenderConfig["graph"]["nodes"];
}): string[] => {
  const visited = new Set<string>();
  const queue = [rootNodeId];
  const collected: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    const node = nodes[current];
    if (!node) continue;
    collected.push(current);
    queue.push(...node.childIds);
  }

  return collected;
};

const detachCardComponentPerInstance = ({
  config,
}: {
  config: ImportRenderConfig;
}): number => {
  const instanceNodes = Object.values(config.graph.nodes).filter((node) => {
    if (!node || node.type !== "componentInstance") return false;
    const dayKey = toDayTagKey(
      typeof node.meta?.dayKey === "string" ? node.meta.dayKey : undefined
    );
    if (!dayKey) return false;
    const componentId =
      typeof node.meta?.componentId === "string" ? node.meta.componentId.trim() : "";
    return componentId.length > 0 && Boolean(config.graph.componentDefinitions[componentId]);
  });
  if (instanceNodes.length === 0) return 0;

  const instanceComponentIds = instanceNodes
    .map((node) =>
      typeof node.meta?.componentId === "string" ? node.meta.componentId.trim() : ""
    )
    .filter((componentId) => componentId.length > 0);
  const alreadyDetachedPerInstance =
    instanceComponentIds.length === instanceNodes.length &&
    new Set(instanceComponentIds).size === instanceNodes.length &&
    instanceComponentIds.every((componentId) =>
      componentId.includes(CARD_INSTANCE_MARKER)
    );
  if (alreadyDetachedPerInstance) {
    return 0;
  }

  const usedNodeIds = new Set(Object.keys(config.graph.nodes));
  const usedComponentIds = new Set(Object.keys(config.graph.componentDefinitions));
  const usedCardStyleKeys = new Set(Object.keys(config.layout.card));
  const clonedDefinitionBySourceAndToken = new Map<string, string>();
  const assignedComponentIds = new Set<string>();

  instanceNodes.forEach((instanceNode, instanceIndex) => {
    const sourceComponentId =
      typeof instanceNode.meta?.componentId === "string"
        ? instanceNode.meta.componentId.trim()
        : "";
    if (!sourceComponentId) return;
    const sourceDefinition = config.graph.componentDefinitions[sourceComponentId];
    if (!sourceDefinition) return;
    const sourceRootNode = config.graph.nodes[sourceDefinition.rootNodeId];
    if (!sourceRootNode) return;

    const dayKeyToken =
      toDayTagKey(
        typeof instanceNode.meta?.dayKey === "string" ? instanceNode.meta.dayKey : undefined
      ) ?? `index_${instanceIndex}`;
    const instanceIdToken =
      typeof instanceNode.meta?.instanceId === "string" &&
      instanceNode.meta.instanceId.trim().length > 0
        ? instanceNode.meta.instanceId.trim()
        : String(instanceIndex);
    const instanceToken = `${dayKeyToken}_${instanceIdToken}`
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .toLowerCase();
    const cloneMapKey = `${sourceComponentId}::${instanceToken}`;
    let detachedComponentId = clonedDefinitionBySourceAndToken.get(cloneMapKey);

    if (!detachedComponentId) {
      const detachedNodeIds = collectComponentSubtreeNodeIds({
        rootNodeId: sourceDefinition.rootNodeId,
        nodes: config.graph.nodes,
      });
      if (detachedNodeIds.length === 0) return;

      const oldToNewNodeId = new Map<string, string>();
      detachedNodeIds.forEach((oldNodeId) => {
        const nextNodeId = makeUniqueGraphId(
          `${oldNodeId}${CARD_INSTANCE_MARKER}${instanceToken}`,
          usedNodeIds
        );
        oldToNewNodeId.set(oldNodeId, nextNodeId);
      });

      const styleKeyMap = new Map<string, string>();
      detachedNodeIds.forEach((oldNodeId) => {
        const sourceNode = config.graph.nodes[oldNodeId];
        if (!sourceNode?.styles) return;
        CARD_STYLE_REF_KEYS.forEach((styleRefKey) => {
          const sourceStyleKey = sourceNode.styles?.[styleRefKey];
          if (typeof sourceStyleKey !== "string" || sourceStyleKey.trim().length === 0) {
            return;
          }
          if (!Object.prototype.hasOwnProperty.call(config.layout.card, sourceStyleKey)) return;
          if (styleKeyMap.has(sourceStyleKey)) return;
          const nextStyleKey = makeUniqueCardStyleKey(
            `${sourceStyleKey}${CARD_INSTANCE_MARKER}${instanceToken}`,
            usedCardStyleKeys
          );
          styleKeyMap.set(sourceStyleKey, nextStyleKey);
          config.layout.card[nextStyleKey] = {
            ...(config.layout.card[sourceStyleKey] as Record<string, unknown>),
          };
        });
      });

      detachedNodeIds.forEach((oldNodeId) => {
        const sourceNode = config.graph.nodes[oldNodeId];
        if (!sourceNode) return;
        const newNodeId = oldToNewNodeId.get(oldNodeId);
        if (!newNodeId) return;

        const clonedStyles = sourceNode.styles
          ? ({
              ...sourceNode.styles,
            } as Record<string, string | undefined>)
          : undefined;
        if (clonedStyles) {
          CARD_STYLE_REF_KEYS.forEach((styleRefKey) => {
            const sourceStyleKey = clonedStyles[styleRefKey];
            if (typeof sourceStyleKey !== "string") return;
            if (styleKeyMap.has(sourceStyleKey)) {
              clonedStyles[styleRefKey] = styleKeyMap.get(sourceStyleKey);
            }
          });
        }

        const sourceParentId =
          typeof sourceNode.parentId === "string" ? sourceNode.parentId : null;
        const nextParentId =
          sourceParentId && oldToNewNodeId.has(sourceParentId)
            ? (oldToNewNodeId.get(sourceParentId) ?? null)
            : null;
        const clonedLayerIdBase = sourceNode.layerId ?? sourceNode.id;
        const clonedMeta = sourceNode.meta
          ? ({
              ...sourceNode.meta,
            } as Record<string, unknown>)
          : undefined;
        if (
          clonedMeta &&
          typeof clonedMeta.layerSectionKey === "string" &&
          styleKeyMap.has(clonedMeta.layerSectionKey)
        ) {
          clonedMeta.layerSectionKey = styleKeyMap.get(clonedMeta.layerSectionKey);
        }

        config.graph.nodes[newNodeId] = {
          ...sourceNode,
          id: newNodeId,
          parentId: nextParentId,
          childIds: sourceNode.childIds
            .map((childId) => oldToNewNodeId.get(childId) ?? null)
            .filter((childId): childId is string => Boolean(childId)),
          layerId: `${clonedLayerIdBase}${CARD_INSTANCE_MARKER}${instanceToken}`,
          ...(clonedStyles ? { styles: clonedStyles } : {}),
          ...(clonedMeta ? { meta: clonedMeta } : {}),
        };
      });

      const detachedRootNodeId = oldToNewNodeId.get(sourceDefinition.rootNodeId);
      if (!detachedRootNodeId) return;

      detachedComponentId = makeUniqueGraphId(
        `${sourceComponentId}${CARD_INSTANCE_MARKER}${instanceToken}`,
        usedComponentIds
      );
      config.graph.componentDefinitions[detachedComponentId] = {
        ...sourceDefinition,
        id: detachedComponentId,
        rootNodeId: detachedRootNodeId,
        instanceMode: "detached",
        instanceTransforms: {},
      };
      clonedDefinitionBySourceAndToken.set(cloneMapKey, detachedComponentId);
    }

    if (!detachedComponentId) return;
    const nextMeta = {
      ...(instanceNode.meta ?? {}),
      componentId: detachedComponentId,
    };
    config.graph.nodes[instanceNode.id] = {
      ...instanceNode,
      meta: nextMeta,
    };
    assignedComponentIds.add(detachedComponentId);
  });

  if (assignedComponentIds.size === 0) return 0;

  Object.values(config.graph.nodes).forEach((node) => {
    if (!node || node.type !== "cardCollection") return;
    const firstInstance = node.childIds
      .map((childId) => config.graph.nodes[childId])
      .find((childNode) => childNode?.type === "componentInstance");
    const nextComponentId =
      typeof firstInstance?.meta?.componentId === "string"
        ? firstInstance.meta.componentId
        : undefined;
    if (!nextComponentId) return;
    config.graph.nodes[node.id] = {
      ...node,
      meta: {
        ...(node.meta ?? {}),
        componentId: nextComponentId,
      },
    };
  });

  const referencedComponentIds = new Set<string>();
  Object.values(config.graph.nodes).forEach((node) => {
    if (!node || node.type !== "componentInstance") return;
    const componentId =
      typeof node.meta?.componentId === "string" ? node.meta.componentId.trim() : "";
    if (!componentId) return;
    if (!config.graph.componentDefinitions[componentId]) return;
    referencedComponentIds.add(componentId);
  });
  Object.keys(config.graph.componentDefinitions).forEach((componentId) => {
    if (referencedComponentIds.has(componentId)) return;
    delete config.graph.componentDefinitions[componentId];
  });

  return assignedComponentIds.size;
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
  if (tokens.includes("offline") || tokens.includes("rest")) {
    return "offline";
  }
  if (tokens.includes("online") || tokens.includes("live")) {
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

const findDirectChildContainerNodeByTextBind = ({
  rootNode,
  bindValues,
}: {
  rootNode: FigmaNode | undefined;
  bindValues: readonly string[];
}): FigmaNode | undefined => {
  if (!rootNode || !Array.isArray(rootNode.children) || bindValues.length === 0) {
    return undefined;
  }
  return rootNode.children.find((childNode) =>
    Boolean(
      findContainerNodeByTextBind({
        rootNode: childNode,
        bindValues,
      })
    )
  );
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

  // Figma line-height does not map cleanly to the editor/runtime model.
  // Keep imported text at lineHeight=1 and let the editor opt into adjustments.
  next.lineHeight = 1;

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
  if (contentNode) {
    applyTextStyleFromFigmaNode({
      node: contentNode,
      target,
    });
    return true;
  }

  // Some templates place text style directly on the slot node without a nested `Content` node.
  if (containerNode?.style) {
    applyTextStyleFromFigmaNode({
      node: containerNode,
      target,
    });
    return true;
  }

  return false;
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

  if (!presence.artistText) {
    removeGraphSubtree({
      config,
      nodeId: "scene-artist-text",
      summary,
      reason: "scene.artistText",
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

  if (!presence.artistText && !presence.artistObject) {
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
    presence.artistText || presence.artistObject || presence.profileImage || presence.profileFrame;
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
  externalArtistVariantCandidates = [],
  externalWarnings = [],
  componentMapById,
}: {
  rootNode: FigmaNode;
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  externalCardCandidates?: FigmaNode[];
  externalArtistVariantCandidates?: FigmaNode[];
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
      artistText: false,
      artistObject: false,
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
      "imageprofile",
      "imageprofileimage",
      "artistimage",
      "profile image",
    ],
    profileFrame: [
      "profileframe",
      "imageframe",
      "imageprofileframe",
      "artistframe",
      "profile frame",
    ],
    artistText: [
      "artisttext",
      "artistname",
      "textartist",
      "flexibletextartist",
      "flexibletextartistname",
      "artist text",
      "artist name",
    ],
    artistObject: [
      "artistobject",
      "sceneartist",
      "imageartistobject",
      "profiletextartistimagestyle",
      "artiston",
      "artistoff",
      "noartist",
    ],
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
    artistText: ["artist.text", "scene.artist.text"],
    artistObject: ["artist.background", "artist.object"],
    cardContainer: ["card"],
    cardBackground: ["card.background", "card.bg"],
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
      const slotTag = normalizeAssetSlot(getNodeTagValue(node, "slot"));
      if (slotTag === "card.entry") return false;
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
    const candidateSlot = normalizeAssetSlot(getNodeTagValue(candidate, "slot"));
    const dayTag = resolveCandidateDayKey(candidate);
    if (dayTag) score += 10;
    if (candidateSlot === "card") score += 6;
    if (candidateSlot === "card.entry") score -= 12;
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
    if (findFirstByTagValues(nodes, "slot", slot.cardBackground)) {
      score += 12;
    }
    if (findFirstByTagValues(nodes, "role", ["base", "background"])) {
      score += 4;
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

  const sceneGridNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/grid", "grid"]],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.grid,
      aliases: alias.grid,
    });
  const sceneWeekDatesNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/weekdates", "weekdates", "weekdate"]],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.weekFlag,
      aliases: alias.weekFlag,
    });
  const sceneTopObjectNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/topobject", "topobject"]],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.topObject,
      aliases: alias.topObject,
    });
  const sceneProfileImageNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [
        ["scene/frame", "frame", "sceneframe"],
        ["image/profile", "profileimage", "imageprofile"],
      ],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.profileImage,
      aliases: alias.profileImage,
    });
  const sceneProfileFrameNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [
        ["scene/frame", "frame", "sceneframe"],
        ["image/frame", "profileframe", "imageframe"],
      ],
    }) ??
    findFirstByTagCriteria(allNodes, {
      slot: slot.profileFrame,
      role: ["frame"],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.profileFrame,
      aliases: alias.profileFrame,
    });
  const sceneArtistNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/artist", "artist", "sceneartist"]],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.artistObject,
      aliases: alias.artistObject,
    });

  const assignSceneGroupFrame = ({
    nodeId,
    styleKey,
    frameNode,
    reason,
  }: {
    nodeId: string;
    styleKey: string;
    frameNode: FigmaNode | undefined;
    reason: string;
  }): FigmaNode => {
    if (!frameNode || frameNode === rootNode) return rootNode;
    const frameBounds = getBounds(frameNode);
    if (
      frameBounds &&
      Math.abs(frameBounds.x - rootBounds.x) < 0.5 &&
      Math.abs(frameBounds.y - rootBounds.y) < 0.5 &&
      Math.abs(frameBounds.width - rootBounds.width) < 0.5 &&
      Math.abs(frameBounds.height - rootBounds.height) < 0.5
    ) {
      return rootNode;
    }
    const groupNode = config.graph.nodes[nodeId];
    if (!groupNode || groupNode.type !== "group") return rootNode;
    groupNode.styles = {
      ...(groupNode.styles ?? {}),
      styleKey,
    };
    groupNode.meta = {
      ...(groupNode.meta ?? {}),
      layerTarget: `sceneNode:${nodeId}`,
      layerSectionKey: styleKey,
      layerIcon: "group",
    };
    const target = (config.layout.scene[styleKey] ?? {}) as Record<string, unknown>;
    config.layout.scene[styleKey] = target as typeof config.layout.scene[string];
    target.position = "absolute";
    applyRectToLayoutObject({
      rect: toRelativeRect({ rootNode, targetNode: frameNode }),
      target,
    });
    summary.applied.push(reason);
    return frameNode;
  };

  config.templateSize = {
    width: round(rootBounds.width),
    height: round(rootBounds.height),
  };
  summary.applied.push(
    `templateSize(${config.templateSize.width}x${config.templateSize.height})`
  );

  const gridNode = sceneGridNode;
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

  const weekFlagNode = sceneWeekDatesNode;
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

  const topObjectNode = sceneTopObjectNode;
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

  const profileFrameRootNode =
    sceneProfileImageNode || sceneProfileFrameNode
      ? resolvePositionContextRootByFrame({
          sourceRootNode: rootNode,
          targetNode: sceneProfileImageNode ?? sceneProfileFrameNode,
        })
      : rootNode;
  const profilePositionRootNode = assignSceneGroupFrame({
    nodeId: "scene-profile",
    styleKey: "sceneProfileFrame",
    frameNode: profileFrameRootNode,
    reason: "layout.scene.sceneProfileFrame",
  });

  const profileImageNode = sceneProfileImageNode;
  summary.presence.profileImage = Boolean(profileImageNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({
      rootNode: profilePositionRootNode,
      targetNode: profileImageNode,
    }),
    target: config.layout.profileImage as unknown as Record<string, unknown>,
  });
  if (profileImageNode) {
    summary.applied.push("layout.profileImage");
  }

  const profileFrameNode = sceneProfileFrameNode;
  summary.presence.profileFrame = Boolean(profileFrameNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({
      rootNode: profilePositionRootNode,
      targetNode: profileFrameNode,
    }),
    target: config.layout.profileFrame as unknown as Record<string, unknown>,
  });
  if (profileFrameNode) {
    summary.applied.push("layout.profileFrame");
  }

  const artistObjectNode = sceneArtistNode;
  summary.presence.artistObject = Boolean(artistObjectNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: artistObjectNode }),
    target: config.layout.artistObjectStyle as unknown as Record<string, unknown>,
  });
  if (artistObjectNode) {
    summary.applied.push("layout.artistObjectStyle");
  }

  const placedArtistTextNode = sceneArtistNode
    ? findNodeByTagOrAlias({
        nodes: flattenNodes(sceneArtistNode).filter(
          (candidate) => candidate.id !== sceneArtistNode.id
        ),
        tagValues: slot.artistText,
        aliases: alias.artistText,
      })
    : undefined;
  const artistOnVariantNode =
    externalArtistVariantCandidates.find(
      (candidate) => parseArtistVariantStateFromNode(candidate) === "on"
    ) ?? externalArtistVariantCandidates[0];
  const variantArtistTextNode = artistOnVariantNode
    ? findNodeByTagOrAlias({
        nodes: flattenNodes(artistOnVariantNode).filter(
          (candidate) => candidate.id !== artistOnVariantNode.id
        ),
        tagValues: slot.artistText,
        aliases: alias.artistText,
      })
    : undefined;
  const artistTextNode = placedArtistTextNode ?? variantArtistTextNode;
  summary.presence.artistText = Boolean(artistTextNode);
  if (artistTextNode) {
    const artistTextRect = placedArtistTextNode
      ? toRelativeRect({
          rootNode,
          targetNode: placedArtistTextNode,
        })
      : remapRelativeRectToPlacedRoot({
          templateRootNode: rootNode,
          placedRootNode: artistObjectNode,
          sourceRootNode: artistOnVariantNode ?? artistObjectNode ?? rootNode,
          rect: toRelativeRect({
            rootNode: artistOnVariantNode ?? rootNode,
            targetNode: variantArtistTextNode,
          }),
        });
    applyFlexibleLayoutToTargets({
      rect: artistTextRect,
      containerTarget: config.layout.artistTextRootStyle as unknown as Record<string, unknown>,
      wrapperTarget: config.layout.artistTextWrapperStyle as unknown as Record<string, unknown>,
    });
    summary.applied.push("layout.artistTextRootStyle");
    summary.applied.push("layout.artistTextWrapperStyle");

    const appliedArtistTextStyle = applyTextStyleFromContentNode({
      containerNode: artistTextNode,
      target: config.layout.artistTextStyle as unknown as Record<string, unknown>,
    });
    if (!appliedArtistTextStyle) {
      summary.warnings.push("ArtistText Content(TEXT) not found; text style skipped.");
    }
    summary.applied.push("layout.artistTextStyle");
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
        Record<CardTextStatus, { score: number; x: number; y: number }>
      > = {};

      candidates.forEach((candidate) => {
        const status = resolveCandidateStatus(candidate);
        if (!status) return;
        const score = scoreCardContainerCandidate(candidate);
        const bounds = getBounds(candidate);
        const x = bounds?.x ?? Number.POSITIVE_INFINITY;
        const y = bounds?.y ?? Number.POSITIVE_INFINITY;
        const prev = rankByStatus[status];
        if (!prev) {
          next[status] = candidate;
          rankByStatus[status] = { score, x, y };
          return;
        }
        if (score > prev.score) {
          next[status] = candidate;
          rankByStatus[status] = { score, x, y };
          return;
        }
        if (score === prev.score) {
          const isMoreTopLeft = y < prev.y || (y === prev.y && x < prev.x);
          if (isMoreTopLeft) {
            next[status] = candidate;
            rankByStatus[status] = { score, x, y };
          }
        }
      });

      return next;
    };

    const hasExplicitCardStatusSource = externalCardCandidates.length > 0;
    const statusCandidatePool = (
      hasExplicitCardStatusSource
        ? externalCardCandidates
        : [...cardContainerCandidates, ...externalCardCandidates]
    ).filter((candidate): candidate is FigmaNode => Boolean(candidate));
    const statusCandidateById = new Map<string, FigmaNode>();
    statusCandidatePool.forEach((candidate) => {
      const candidateId = candidate.id?.trim();
      if (!candidateId) return;
      if (!statusCandidateById.has(candidateId)) {
        statusCandidateById.set(candidateId, candidate);
      }
    });
    const dedupedStatusCandidates = Array.from(statusCandidateById.values());
    const candidateByDayStatus = collectCardCandidatesByDayStatus(dedupedStatusCandidates);
    const resolveDayStatusCandidate = ({
      dayKey,
      status,
    }: {
      dayKey: V2TemplateDayKey;
      status: CardTextStatus;
    }): FigmaNode | undefined => {
      return candidateByDayStatus[dayKey]?.[status];
    };
    summary.applied.push(
      hasExplicitCardStatusSource
        ? "graph.card.statusSource=componentSet"
        : "graph.card.statusSource=rootFallback"
    );

    const applyCardContainerRectToRuntimeStyles = (rect: Rect | null) => {
      if (!rect) return;
      Object.values(config.graph.componentDefinitions).forEach((definition) => {
        const root = config.graph.nodes[definition.rootNodeId];
        const styleKey =
          typeof root?.styles?.containerStyleKey === "string"
            ? root.styles.containerStyleKey
            : undefined;
        if (!styleKey) return;
        const current = config.layout.card[styleKey];
        const target =
          current && typeof current === "object"
            ? (current as Record<string, unknown>)
            : (config.layout.card[styleKey] = {});
        applyRectToLayoutObject({
          rect,
          target: target as Record<string, unknown>,
        });
      });
    };

    const cardContainerSizeSource =
      (hasExplicitCardStatusSource
        ? dedupedStatusCandidates.find(
            (candidate) => resolveCandidateStatus(candidate) === "online"
          ) ?? dedupedStatusCandidates[0]
        : undefined) ?? cardContainerNode;

    // Card container is rendered inside each grid slot.
    // Prefer the component source dimensions; placed instances may be inflated by rotated parents.
    const cardContainerRect = toRelativeRect({
      rootNode: cardContainerSizeSource,
      targetNode: cardContainerSizeSource,
    });
    applyRectToLayoutObject({
      rect: cardContainerRect,
      target: config.layout.card.container as unknown as Record<string, unknown>,
    });
    if (cardContainerRect) {
      config.cardSizes.online = {
        width: cardContainerRect.width,
        height: cardContainerRect.height,
      };
      config.cardSizes.offline = {
        width: cardContainerRect.width,
        height: cardContainerRect.height,
      };
      applyCardContainerRectToRuntimeStyles(cardContainerRect);
    }
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
          findFirstByNames(candidateNodes, ["imagebg"]) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardBackground) ??
          findFirstByNames(candidateNodes, alias.cardSharedBackground)
        );
      }
      if (mode === "offlineMemo") {
        return (
          findFirstByNames(candidateNodes, alias.cardOfflineMemoBackground) ??
          findFirstByNames(candidateNodes, ["imagebg"]) ??
          findFirstByTagValues(candidateNodes, "slot", slot.cardBackground) ??
          findFirstByNames(candidateNodes, alias.cardSharedBackground)
        );
      }
      return (
        findFirstByNames(candidateNodes, alias.cardOfflineBackground) ??
        findFirstByNames(candidateNodes, ["imagebg"]) ??
        findFirstByTagValues(candidateNodes, "slot", slot.cardBackground) ??
        findFirstByNames(candidateNodes, alias.cardSharedBackground)
      );
    };

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
    }): Array<{ index: number; node: FigmaNode; isFallbackRoot: boolean }> => {
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
          isFallbackRoot: false,
        }))
        .sort((left, right) => left.index - right.index);

      if (nodes.length > 0) {
        return nodes;
      }
      const namedEntryFrames = (candidate.children ?? [])
        .filter((node) => {
          const nodeType = (node.type ?? "").toUpperCase();
          if (nodeType !== "FRAME") return false;
          return canonicalName(node.name ?? "") === canonicalName("Entry");
        })
        .sort((left, right) => {
          const leftBounds = getBounds(left);
          const rightBounds = getBounds(right);
          const leftY = leftBounds?.y ?? Number.POSITIVE_INFINITY;
          const rightY = rightBounds?.y ?? Number.POSITIVE_INFINITY;
          if (leftY !== rightY) return leftY - rightY;
          const leftX = leftBounds?.x ?? Number.POSITIVE_INFINITY;
          const rightX = rightBounds?.x ?? Number.POSITIVE_INFINITY;
          return leftX - rightX;
        })
        .map((node, index) => ({
          index,
          node,
          isFallbackRoot: false,
        }));

      if (namedEntryFrames.length > 0) {
        return namedEntryFrames;
      }
      return [{ index: 0, node: candidate, isFallbackRoot: true }];
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
      const legacyOfflineMemoNode =
        status === "offlineMemo"
          ? findContainerNodeByTextBind({
              rootNode: candidate,
              bindValues: ["entry.offlineMemo"],
            })
          : undefined;
      const offlineMemoMainTitleNode =
        status === "offlineMemo"
          ? findDirectChildContainerNodeByTextBind({
              rootNode: candidate,
              bindValues: ["card.offlineMemo"],
            }) ??
            findFirstDirectChildByTagValues({
              rootNode: candidate,
              key: "slot",
              values: slot.cardOfflineMemo,
            })
          : undefined;
      if (
        status === "offlineMemo" &&
        !offlineMemoMainTitleNode &&
        legacyOfflineMemoNode
      ) {
        summary.warnings.push(
          `offlineMemo must be a direct child of the offlineMemo status root (legacy entry-scoped node found): ${candidate.name || candidate.id || "(unknown)"}`
        );
      }
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

    const ensureCardStyleRecord = (styleKey?: string): Record<string, unknown> | null => {
      if (!styleKey) return null;
      const current = config.layout.card[styleKey];
      if (current && typeof current === "object") {
        return current as Record<string, unknown>;
      }
      config.layout.card[styleKey] = {};
      return config.layout.card[styleKey] as Record<string, unknown>;
    };

    const applyPerDayCardOverrides = () => {
      const detachedComponentCount = detachCardComponentPerInstance({ config });
      if (detachedComponentCount > 0) {
        summary.applied.push(
          `graph.card.detachedPerInstance(${detachedComponentCount})`
        );
      }

      const instanceNodes = Object.values(config.graph.nodes).filter((node) => {
        if (node.type !== "componentInstance") return false;
        return Boolean(toDayTagKey(node.meta?.dayKey));
      });
      if (instanceNodes.length === 0) return;

      const getBaseNodeId = (nodeId: string): string => {
        const markerIndex = nodeId.indexOf(CARD_INSTANCE_MARKER);
        if (markerIndex < 0) return nodeId;
        return nodeId.slice(0, markerIndex);
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
        "entryStyleKey",
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
        const suffixToken = `__${normalizedSuffix}`;
        if (sourceKey.endsWith(suffixToken)) {
          return sourceKey;
        }
        let targetKey = `${sourceKey}${suffixToken}`;
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

      const cloneNodeStyleRefsWithSuffix = ({
        node,
        suffix,
        entryStyleKey,
      }: {
        node: (typeof config.graph.nodes)[string];
        suffix: string;
        entryStyleKey?: string;
      }): (typeof config.graph.nodes)[string] => {
        const nextStyles = node.styles
          ? ({
              ...node.styles,
            } as Record<string, string | undefined>)
          : {};
        styleRefKeys.forEach((styleRefKey) => {
          const sourceStyleKey =
            typeof nextStyles[styleRefKey] === "string"
              ? (nextStyles[styleRefKey] as string)
              : undefined;
          if (!sourceStyleKey) return;
          const targetStyleKey = cloneCardLayoutRecordWithSuffix({
            sourceKey: sourceStyleKey,
            suffix,
          });
          if (targetStyleKey) {
            nextStyles[styleRefKey] = targetStyleKey;
          }
        });
        if (entryStyleKey) {
          nextStyles.entryStyleKey = entryStyleKey;
        } else {
          delete nextStyles.entryStyleKey;
        }
        const updatedNode = {
          ...node,
          styles: nextStyles,
          meta: {
            ...(node.meta ?? {}),
            ...(typeof nextStyles.containerStyleKey === "string"
              ? { layerSectionKey: nextStyles.containerStyleKey }
              : {}),
          },
        };
        config.graph.nodes[node.id] = updatedNode;
        return updatedNode;
      };

      const ensureStatusTextVariantNode = ({
        root,
        baseNode,
        variantBaseId,
        visibilityMode,
        entryIndex,
        bindingKeyOverride,
        bindingScopeOverride,
        entryStyleKey,
        labelSuffix,
        labelOverride,
        layerIdBaseOverride,
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
        bindingScopeOverride?: "entry" | "card" | "global";
        entryStyleKey?: string;
        labelSuffix: string;
        labelOverride?: string;
        layerIdBaseOverride?: string;
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
            const nextScope = bindingScopeOverride ?? node.binding.scope;
            return {
              ...node.binding,
              scope: nextScope,
              ...(bindingKeyOverride ? { key: bindingKeyOverride } : {}),
              ...(nextScope === "entry"
                ? {
                    entrySelector: {
                      mode: "index" as const,
                      index: entryIndex,
                    },
                  }
                : {
                    entrySelector: undefined,
                  }),
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
          const nextStyles = {
            ...(existingNode.styles ?? {}),
          } as Record<string, string | undefined>;
          const nextLayerIdBase = (
            layerIdBaseOverride ??
            existingNode.layerId ??
            baseNode.layerId ??
            baseNode.id
          ).replace(/[^a-zA-Z0-9_-]+/g, "_");
          const variantToken = variantBaseId.replace(/[^a-zA-Z0-9_-]+/g, "_");
          const nextLayerId = `${nextLayerIdBase}__${variantToken}`;
          if (entryStyleKey) {
            nextStyles.entryStyleKey = entryStyleKey;
          } else {
            delete nextStyles.entryStyleKey;
          }
          const updatedNode = {
            ...existingNode,
            label: labelOverride ?? existingNode.label,
            layerId: nextLayerId,
            visibilityMode,
            binding: applyBinding(existingNode),
            styles: nextStyles,
            meta: {
              ...(existingNode.meta ?? {}),
              importOmitted: false,
            },
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
        const nextLayerIdBase = (
          layerIdBaseOverride ??
          baseNode.layerId ??
          baseNodeIdToken
        ).replace(/[^a-zA-Z0-9_-]+/g, "_");
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
          label: labelOverride ?? `${baseNode.label} (${labelSuffix})`,
          parentId: root.id,
          childIds: [],
          layerId: nextLayerId,
          visibilityMode,
          binding: applyBinding(baseNode),
          styles: clonedStyles,
          meta: {
            ...(baseNode.meta ?? {}),
            importOmitted: false,
            ...(typeof clonedStyles.containerStyleKey === "string"
              ? { layerSectionKey: clonedStyles.containerStyleKey }
              : {}),
          },
        };
        if (entryStyleKey) {
          createdNode.styles = {
            ...(createdNode.styles ?? {}),
            entryStyleKey,
          };
        }
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
        entryIndex,
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
        entryIndex: number;
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
          dayKey,
          status,
          entryIndex,
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

        const dayStatusSources: Partial<Record<CardTextStatus, FigmaNode>> = {
          online: resolveDayStatusCandidate({ dayKey, status: "online" }),
          multi: resolveDayStatusCandidate({ dayKey, status: "multi" }),
          offline: resolveDayStatusCandidate({ dayKey, status: "offline" }),
          offlineMemo: resolveDayStatusCandidate({
            dayKey,
            status: "offlineMemo",
          }),
        };
        const onlineVariantSourceNode = dayStatusSources.online;
        const multiVariantSourceNode = dayStatusSources.multi;
        const offlineVariantSourceNode = dayStatusSources.offline;
        const offlineMemoVariantSourceNode = dayStatusSources.offlineMemo;
        const hasAnyStatusSource = Boolean(
          onlineVariantSourceNode ||
            multiVariantSourceNode ||
            offlineVariantSourceNode ||
            offlineMemoVariantSourceNode
        );
        if (!hasAnyStatusSource) {
          statusPlans.forEach((plan) => {
            const missing: string[] = ["background"];
            if (!roleIsOptionalByStatus(plan.status, "mainTitle")) missing.push("main");
            if (!roleIsOptionalByStatus(plan.status, "subTitle")) missing.push("sub");
            if (!roleIsOptionalByStatus(plan.status, "streamingTime")) missing.push("time");
            if (!roleIsOptionalByStatus(plan.status, "streamingDate")) missing.push("date");
            if (!roleIsOptionalByStatus(plan.status, "streamingDay")) missing.push("day");
            summary.statusSlotAuditRows.push({
              dayKey,
              status: plan.status,
              entryIndex: 0,
              source: `${dayKey}:(missing all statuses)`,
              background: false,
              main: false,
              sub: false,
              time: false,
              date: false,
              day: false,
              missing,
            });
          });
          summary.warnings.push(
            `Card day/status mapping missing all statuses: day=${dayKey}`
          );
          return;
        }

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

        const sourceByStatus: Partial<Record<CardTextStatus, FigmaNode>> = {
          online: onlineVariantSourceNode,
          multi: multiVariantSourceNode,
          offline: offlineVariantSourceNode,
          offlineMemo: offlineMemoVariantSourceNode,
        };

        statusPlans.forEach((plan) => {
          const sourceCandidate = sourceByStatus[plan.status];
          if (!sourceCandidate) {
            const missing: string[] = ["background"];
            if (!roleIsOptionalByStatus(plan.status, "mainTitle")) missing.push("main");
            if (!roleIsOptionalByStatus(plan.status, "subTitle")) missing.push("sub");
            if (!roleIsOptionalByStatus(plan.status, "streamingTime")) missing.push("time");
            if (!roleIsOptionalByStatus(plan.status, "streamingDate")) missing.push("date");
            if (!roleIsOptionalByStatus(plan.status, "streamingDay")) missing.push("day");
            summary.statusSlotAuditRows.push({
              dayKey,
              status: plan.status,
              entryIndex: 0,
              source: `${dayKey}:(missing ${plan.status})`,
              background: false,
              main: false,
              sub: false,
              time: false,
              date: false,
              day: false,
              missing,
            });
            summary.warnings.push(
              `Card day/status source missing: day=${dayKey}, status=${plan.status}`
            );
            return;
          }
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
          if (plan.status === "online" || plan.status === "multi") {
            entrySources.forEach((entrySource) => {
              const entryType = (entrySource.node.type ?? "").toUpperCase();
              if (!entrySource.isFallbackRoot && entryType === "FRAME") return;
              if (entryType.length === 0) return;
              summary.warnings.push(
                entrySource.isFallbackRoot
                  ? `Card entry wrapper missing (fallback to status root): day=${dayKey}, status=${plan.status}, entry=${entrySource.index}, type=${entryType}`
                  : `Card entry should be FRAME for stable local coordinates: day=${dayKey}, status=${plan.status}, entry=${entrySource.index}, type=${entryType}`
              );
            });
          }
          const visibilityMode = visibilityModeByStatus({
            status: plan.status,
            hasMulti: hasMultiStatus,
            hasOfflineMemo: hasOfflineMemoStatus,
          });

          entrySources.forEach((entrySource) => {
            const sourceNodes = resolveCardTextNodesFromCandidate({
              candidate: sourceCandidate,
              sourceNode: entrySource.node,
              status: plan.status,
            });
            const entryIndex = entrySource.index;
            const entryContainerStyleKey = (() => {
              const targetStyleKey = `entryContainer__${dayKey}__${plan.status}__e${entryIndex}`;
              const entryTarget = ensureCardStyleRecord(targetStyleKey);
              if (!entryTarget) return undefined;
              const rect = toRelativeRect({
                rootNode: sourceCandidate,
                targetNode: entrySource.node,
              });
              applyRectToLayoutObject({
                rect,
                target: entryTarget,
                includeRotation: false,
              });
              return targetStyleKey;
            })();

            const resolveTargetTextNode = ({
              role,
              bindingKeyOverride,
              bindingScopeOverride,
              entryStyleKey,
              labelOverride,
              layerIdBaseOverride,
            }: {
              role:
                | "mainTitle"
                | "subTitle"
                | "streamingTime"
                | "streamingDate"
                | "streamingDay";
              bindingKeyOverride?: string;
              bindingScopeOverride?: "entry" | "card" | "global";
              entryStyleKey?: string;
              labelOverride?: string;
              layerIdBaseOverride?: string;
            }): (typeof config.graph.nodes)[string] | undefined => {
              const baseNode = roleBaseNodes[role];
              if (!baseNode) return undefined;
              if (plan.status === "online") {
                const updatedNode = {
                  ...cloneNodeStyleRefsWithSuffix({
                    node: baseNode,
                    suffix: `${getBaseNodeId(baseNode.id)}__${dayKey}__${plan.status}__e${entryIndex}`,
                    entryStyleKey,
                  }),
                  visibilityMode,
                };
                config.graph.nodes[baseNode.id] = updatedNode;
                return updatedNode;
              }
              return ensureStatusTextVariantNode({
                root: componentRootNode,
                baseNode,
                variantBaseId: `${getBaseNodeId(baseNode.id)}__${dayKey}__${plan.status}__e${entryIndex}${plan.variantNodeSuffix}`,
                visibilityMode,
                entryIndex,
                bindingKeyOverride,
                bindingScopeOverride,
                entryStyleKey,
                labelSuffix: `${dayKey}/${plan.status}/e${entryIndex}`,
                labelOverride,
                layerIdBaseOverride,
              });
            };

            const targetMainTitleNode = resolveTargetTextNode({
              role: "mainTitle",
              bindingKeyOverride: plan.status === "offlineMemo" ? "offlineMemo" : "mainTitle",
              bindingScopeOverride: plan.status === "offlineMemo" ? "card" : "entry",
              entryStyleKey:
                plan.status === "offlineMemo" ? undefined : entryContainerStyleKey,
              labelOverride: plan.status === "offlineMemo" ? "OfflineMemo" : undefined,
              layerIdBaseOverride: plan.status === "offlineMemo" ? "offline-memo" : undefined,
            });
            const targetSubTitleNode = resolveTargetTextNode({
              role: "subTitle",
              bindingKeyOverride: "subTitle",
              entryStyleKey: entryContainerStyleKey,
            });
            const targetStreamingTimeNode = resolveTargetTextNode({
              role: "streamingTime",
              entryStyleKey: entryContainerStyleKey,
            });
            const targetStreamingDateNode = resolveTargetTextNode({
              role: "streamingDate",
              entryStyleKey: entryContainerStyleKey,
            });
            const targetStreamingDayNode = resolveTargetTextNode({
              role: "streamingDay",
              entryStyleKey: entryContainerStyleKey,
            });

            const setTargetNodeRendered = ({
              targetNode,
              visible,
              omitFromRuntime = false,
            }: {
              targetNode?: (typeof config.graph.nodes)[string];
              visible: boolean;
              omitFromRuntime?: boolean;
            }) => {
              if (!targetNode) return;
              targetNode.meta = {
                ...(targetNode.meta ?? {}),
                importOmitted: !visible && omitFromRuntime,
              };
              const styleKeys = [
                typeof targetNode.styles?.containerStyleKey === "string"
                  ? targetNode.styles.containerStyleKey
                  : undefined,
                typeof targetNode.styles?.wrapperStyleKey === "string"
                  ? targetNode.styles.wrapperStyleKey
                  : undefined,
              ];
              styleKeys.forEach((styleKey) => {
                const target = ensureCardStyleRecord(styleKey);
                if (!target) return;
                if (visible) {
                  delete target.display;
                  delete target.visibility;
                  return;
                }
                delete target.rotateDeg;
                delete target.transform;
                delete target.transformOrigin;
                target.display = "none";
              });
            };

            const applyTextSourceToTarget = ({
              role,
              sourceNode,
              targetNode,
            }: {
              role:
                | "mainTitle"
                | "subTitle"
                | "streamingTime"
                | "streamingDate"
                | "streamingDay";
              sourceNode?: FigmaNode;
              targetNode?: (typeof config.graph.nodes)[string];
            }) => {
              if (!targetNode) return;
              const targetContainerStyleKey =
                typeof targetNode.styles?.containerStyleKey === "string"
                  ? targetNode.styles.containerStyleKey
                  : undefined;
              const targetTextStyleKey =
                typeof targetNode.styles?.textStyleKey === "string"
                  ? targetNode.styles.textStyleKey
                  : undefined;
              if (!targetContainerStyleKey) return;
              if (!sourceNode) {
                setTargetNodeRendered({
                  targetNode,
                  visible: false,
                  omitFromRuntime: roleIsOptionalByStatus(plan.status, role),
                });
                return;
              }
              setTargetNodeRendered({ targetNode, visible: true });
              const positionRootNode = resolvePositionContextRootByFrame({
                sourceRootNode: sourceCandidate,
                targetNode: sourceNode,
              });
              const rect = toRelativeRect({
                rootNode: positionRootNode,
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
              role: "mainTitle",
              sourceNode: sourceNodes.mainTitleContainerNode,
              targetNode: targetMainTitleNode,
            });
            applyTextSourceToTarget({
              role: "subTitle",
              sourceNode: sourceNodes.subTitleContainerNode,
              targetNode: targetSubTitleNode,
            });
            applyTextSourceToTarget({
              role: "streamingTime",
              sourceNode: sourceNodes.streamingTimeNode,
              targetNode: targetStreamingTimeNode,
            });
            applyTextSourceToTarget({
              role: "streamingDate",
              sourceNode: sourceNodes.streamingDateNode,
              targetNode: targetStreamingDateNode,
            });
            applyTextSourceToTarget({
              role: "streamingDay",
              sourceNode: sourceNodes.streamingDayNode,
              targetNode: targetStreamingDayNode,
            });

            pushStatusAuditRow({
              dayKey,
              status: plan.status,
              entryIndex,
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
      });
      const auditedRows = summary.statusSlotAuditRows.filter((row) =>
        typeof row.dayKey === "string" &&
        IMPORT_DAY_KEYS.includes(row.dayKey)
      );
      summary.presence.cardMainTitle = auditedRows.some((row) => row.main);
      summary.presence.cardSubTitle = auditedRows.some((row) => row.sub);
      summary.presence.cardStreamingTime = auditedRows.some((row) => row.time);
      summary.presence.cardStreamingDate = auditedRows.some((row) => row.date);
      summary.presence.cardStreamingDay = auditedRows.some((row) => row.day);
      const expectedRows = Math.max(1, instanceNodes.length) * statusPlans.length;
      if (auditedRows.length < expectedRows) {
        summary.warnings.push(
          `Card status slot audit rows incomplete: expected=${expectedRows}, actual=${auditedRows.length}`
        );
      } else {
        summary.applied.push(
          `graph.card.statusSlotAuditRows(${auditedRows.length})`
        );
      }
      summary.applied.push("graph.card.dayStatusIndependentMapping");
    };

    applyPerDayCardOverrides();

    const cardNormalizeSummary = v2_normalizeCardImportGraph({
      graph: config.graph,
      layout: config.layout,
    });
    if (cardNormalizeSummary.prunedLegacyNodes > 0) {
      summary.applied.push(
        `graph.card.prunedLegacyNodes(${cardNormalizeSummary.prunedLegacyNodes})`
      );
    }
    if (cardNormalizeSummary.hydratedStyleRecords > 0) {
      summary.applied.push(
        `layout.card.hydratedStyleRecords(${cardNormalizeSummary.hydratedStyleRecords})`
      );
    }
    if (cardNormalizeSummary.touchedRoots > 0) {
      summary.applied.push(`graph.card.touchedRoots(${cardNormalizeSummary.touchedRoots})`);
    }

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
    const response = await fetchWithTimeout(requestUrl, {
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

export const collectCardComponentIdsFromTemplateRoot = (
  rootNode: FigmaNode
): string[] => {
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

const fetchExternalArtistVariantCandidates = async ({
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
  const sceneArtistNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/artist", "artist", "sceneartist"]],
    }) ??
    findNodeByTagOrAlias({
      nodes: flattenNodes(rootNode),
      tagValues: ["artist.background", "artist.object"],
      aliases: ["sceneartist", "artist"],
    });

  const artistComponentId = sceneArtistNode?.componentId?.trim();
  if (!artistComponentId) {
    return { candidates: [], warnings };
  }

  const componentMap =
    componentMapById ??
    (await fetchFigmaFileComponentMap({
      fileKey,
      figmaToken,
    }));

  const componentSetId = componentMap.get(artistComponentId)?.componentSetId?.trim();
  if (!componentSetId) {
    warnings.push("Scene/Artist componentSetId not found; artist component-set fallback skipped.");
    return { candidates: [], warnings };
  }

  const variantComponentIds = Array.from(
    new Set(
      Array.from(componentMap.entries())
        .filter(([, meta]) => meta.componentSetId?.trim() === componentSetId)
        .map(([componentId]) => componentId)
    )
  );

  if (variantComponentIds.length === 0) {
    warnings.push("No artist variant components found in matched component set.");
    return { candidates: [], warnings };
  }

  const variantNodesById = await fetchFigmaNodesByIds({
    fileKey,
    nodeIds: variantComponentIds,
    figmaToken,
  });

  const candidates = Object.values(variantNodesById).filter((node) => {
    if (!getBounds(node)) return false;
    return Boolean(parseArtistVariantStateFromNode(node));
  });

  if (candidates.length === 0) {
    warnings.push("Artist component-set fallback resolved no on/off variants.");
  }

  return { candidates, warnings };
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

  // Figma images API can return render-timeout for large batches on heavy frames.
  // Keep chunk size small to improve stability during bulk asset imports.
  const chunks = chunkArray(nodeIds, 10);
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
  const response = await fetchWithTimeout(url);
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
    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
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
  externalArtistVariantCandidates = [],
  cardBackgroundModeByStatus,
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
  externalArtistVariantCandidates?: FigmaNode[];
  cardBackgroundModeByStatus?: Partial<
    Record<CardBackgroundVariantMode, CardBackgroundAssetMode>
  >;
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
  const recordRoots = [rootNode, ...externalCardCandidates, ...externalArtistVariantCandidates];
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
      .map((candidate) => candidate.targetKey as V2TemplateBuiltinAssetKey)
  );
  const resolvedCardBackgroundModeByStatus: Record<
    CardBackgroundVariantMode,
    CardBackgroundAssetMode
  > = {
    online:
      cardBackgroundModeByStatus?.online ??
      resolveCardBackgroundModeFromMappedBuiltinKeys({
        mappedBuiltinTargetKeys,
        mode: "online",
      }),
    multi:
      cardBackgroundModeByStatus?.multi ??
      resolveCardBackgroundModeFromMappedBuiltinKeys({
        mappedBuiltinTargetKeys,
        mode: "multi",
      }),
    offline:
      cardBackgroundModeByStatus?.offline ??
      resolveCardBackgroundModeFromMappedBuiltinKeys({
        mappedBuiltinTargetKeys,
        mode: "offline",
      }),
    offlineMemo:
      cardBackgroundModeByStatus?.offlineMemo ??
      resolveCardBackgroundModeFromMappedBuiltinKeys({
        mappedBuiltinTargetKeys,
        mode: "offlineMemo",
      }),
  };

  (Object.keys(resolvedCardBackgroundModeByStatus) as CardBackgroundVariantMode[]).forEach(
    (mode) => {
      applyCardBackgroundModeToConfig({
        config,
        mode,
        backgroundMode: resolvedCardBackgroundModeByStatus[mode],
      });
    }
  );

  if (dedupedCandidates.length === 0) {
    return summary;
  }

  const imageUrlsByNodeId = await fetchFigmaImageUrls({
    fileKey,
    nodeIds: dedupedCandidates.map((candidate) => candidate.nodeId),
    figmaToken,
    format,
  });
  console.log(
    `[import:v2:figma] asset export urls resolved=${Object.values(imageUrlsByNodeId).filter(Boolean).length}/${dedupedCandidates.length}`
  );

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
    for (const [candidateIndex, candidate] of dedupedCandidates.entries()) {
      const exportUrl = imageUrlsByNodeId[candidate.nodeId];
      if (!exportUrl) {
        summary.warnings.push(
          `export url missing: ${candidate.nodeName} (${candidate.nodeId})`
        );
        continue;
      }

      console.log(
        `[import:v2:figma] asset ${candidateIndex + 1}/${dedupedCandidates.length}: target=${candidate.targetKey} node=${candidate.nodeName}`
      );

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

    (Object.entries(resolvedCardBackgroundModeByStatus) as Array<
      [CardBackgroundVariantMode, CardBackgroundAssetMode]
    >).forEach(([mode, backgroundMode]) => {
      if (backgroundMode !== "shared") return;
      promoteSharedCardBackgroundAsset({
        config,
        mode,
        theme,
        summary,
      });
    });

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

export const runImportV2TemplateFromFigma = async (
  rawOptions: ImportV2TemplateFromFigmaOptions
): Promise<ImportV2TemplateFromFigmaResult> => {
  const options: CliOptions = {
    ...rawOptions,
    configPreset: rawOptions.configPreset ?? "default",
    source: rawOptions.source ?? "system",
    write: Boolean(rawOptions.write),
    public: Boolean(rawOptions.public),
    withAssets: rawOptions.withAssets !== false,
    assetTheme:
      typeof rawOptions.assetTheme === "string" &&
      rawOptions.assetTheme.trim().length > 0
        ? rawOptions.assetTheme.trim()
        : "first",
    assetFormat: rawOptions.assetFormat ?? "png",
    noAiAssetMatch: Boolean(rawOptions.noAiAssetMatch),
    explicitExternalCardCandidates: Array.isArray(
      rawOptions.explicitExternalCardCandidates
    )
      ? rawOptions.explicitExternalCardCandidates
      : [],
    explicitExternalArtistVariantCandidates: Array.isArray(
      rawOptions.explicitExternalArtistVariantCandidates
    )
      ? rawOptions.explicitExternalArtistVariantCandidates
      : [],
    cardBackgroundModeByStatus: rawOptions.cardBackgroundModeByStatus,
    explicitExternalWarnings: Array.isArray(rawOptions.explicitExternalWarnings)
      ? rawOptions.explicitExternalWarnings
      : [],
    skipExternalCardVariantAutodiscovery:
      rawOptions.skipExternalCardVariantAutodiscovery === true,
    postProcessNormalizedConfig: rawOptions.postProcessNormalizedConfig,
  };

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

  let externalCardCandidates: FigmaNode[] = Array.isArray(
    options.explicitExternalCardCandidates
  )
    ? [...options.explicitExternalCardCandidates]
    : [];
  let externalCardWarnings: string[] = Array.isArray(
    options.explicitExternalWarnings
  )
    ? [...options.explicitExternalWarnings]
    : [];
  let externalArtistVariantCandidates: FigmaNode[] = Array.isArray(
    options.explicitExternalArtistVariantCandidates
  )
    ? [...options.explicitExternalArtistVariantCandidates]
    : [];
  let externalArtistWarnings: string[] = [];

  if (
    externalCardCandidates.length === 0 &&
    !options.skipExternalCardVariantAutodiscovery
  ) {
    try {
      const externalVariantSummary = await fetchExternalCardVariantCandidates({
        rootNode,
        fileKey,
        figmaToken,
        componentMapById,
      });
      externalCardCandidates = externalVariantSummary.candidates;
      externalCardWarnings = [
        ...externalCardWarnings,
        ...externalVariantSummary.warnings,
      ];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown component-set fallback error";
      externalCardWarnings = [
        ...externalCardWarnings,
        `Card component-set fallback failed: ${message}`,
      ];
    }
  }

  if (externalArtistVariantCandidates.length === 0) {
    try {
      const externalArtistSummary = await fetchExternalArtistVariantCandidates({
        rootNode,
        fileKey,
        figmaToken,
        componentMapById,
      });
      externalArtistVariantCandidates = externalArtistSummary.candidates;
      externalArtistWarnings = externalArtistSummary.warnings;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown artist component-set fallback error";
      externalArtistWarnings = [
        ...externalArtistWarnings,
        `Artist component-set fallback failed: ${message}`,
      ];
    }
  }

  const baseConfig =
    options.configPreset === "empty"
      ? v2_createEmptyTemplateRenderConfig()
      : v2_createDefaultTemplateRenderConfig();

  const mappingSummary = applyLayoutMappingsFromFigma({
    rootNode,
    config: baseConfig,
    externalCardCandidates,
    externalArtistVariantCandidates,
    externalWarnings: [
      ...componentMapWarnings,
      ...externalCardWarnings,
      ...externalArtistWarnings,
    ],
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

  let supabase: any = null;
  let hasSupabaseConnection = false;
  let ensuredTemplate: { templateId: string; created: boolean } = {
    templateId: "(dry-run-local)",
    created: false,
  };
  let supabaseConnectionWarning: string | null = null;

  try {
    const { supabaseUrl, supabaseServiceRoleKey } = resolveSupabaseConnection({
      options,
      mergedEnv,
    });

    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    hasSupabaseConnection = true;

    if (typeof options.createdBy === "number" && Number.isFinite(options.createdBy)) {
      await assertCreatedByUserExists({
        supabase,
        userId: options.createdBy,
      });
    }

    ensuredTemplate = await ensureTemplate({
      supabase,
      options,
      resolvedTemplateName,
      resolvedTemplateDescription,
    });
  } catch (error) {
    if (options.write) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "unknown";
    supabaseConnectionWarning = `Supabase connection unavailable in dry-run mode: ${message}`;
  }

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
      externalArtistVariantCandidates,
      cardBackgroundModeByStatus: options.cardBackgroundModeByStatus,
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

  let normalizedConfig = v2_normalizeTemplateRenderConfig(baseConfig);
  const componentRootNodeIdSet = new Set(
    Object.values(normalizedConfig.graph.componentDefinitions ?? {}).map(
      (definition) => definition.rootNodeId
    )
  );
  const sanitizedRootNodeIds = normalizedConfig.graph.rootNodeIds.filter(
    (nodeId) =>
      !componentRootNodeIdSet.has(nodeId) && !nodeId.startsWith("component-")
  );
  if (sanitizedRootNodeIds.length !== normalizedConfig.graph.rootNodeIds.length) {
    const prunedCount = normalizedConfig.graph.rootNodeIds.length - sanitizedRootNodeIds.length;
    normalizedConfig.graph.rootNodeIds = sanitizedRootNodeIds;
    mappingSummary.applied.push(`graph.rootNodeIds.prunedComponentRoots(${prunedCount})`);
  }
  const postNormalizeCardSummary = v2_normalizeCardImportGraph({
    graph: normalizedConfig.graph,
    layout: normalizedConfig.layout,
  });
  if (postNormalizeCardSummary.prunedLegacyNodes > 0) {
    mappingSummary.applied.push(
      `graph.card.postNormalizePruned(${postNormalizeCardSummary.prunedLegacyNodes})`
    );
  }
  if (postNormalizeCardSummary.hydratedStyleRecords > 0) {
    mappingSummary.applied.push(
      `layout.card.postNormalizeHydrated(${postNormalizeCardSummary.hydratedStyleRecords})`
    );
  }
  if (postNormalizeCardSummary.touchedRoots > 0) {
    mappingSummary.applied.push(
      `graph.card.postNormalizeTouchedRoots(${postNormalizeCardSummary.touchedRoots})`
    );
  }
  if (typeof options.postProcessNormalizedConfig === "function") {
    normalizedConfig = options.postProcessNormalizedConfig(normalizedConfig);
  }

  let existingDraftCount = 0;
  if (
    hasSupabaseConnection &&
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
      "[import:v2:figma] day | status | entry | source | bg | main | sub | time | date | dayText | missing"
    );
    mappingSummary.statusSlotAuditRows.forEach((row) => {
      const yesNo = (value: boolean) => (value ? "Y" : "N");
      const dayLabel = row.dayKey ?? "-";
      const entryLabel = Number.isFinite(row.entryIndex as number)
        ? String(row.entryIndex)
        : "-";
      console.log(
        `[import:v2:figma] ${dayLabel} | ${row.status} | ${entryLabel} | ${row.source} | ${yesNo(row.background)} | ${yesNo(row.main)} | ${yesNo(row.sub)} | ${yesNo(row.time)} | ${yesNo(row.date)} | ${yesNo(row.day)} | ${row.missing.length > 0 ? row.missing.join(",") : "-"}`
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
  if (supabaseConnectionWarning) {
    console.warn(`[import:v2:figma] warning: ${supabaseConnectionWarning}`);
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
    return {
      mode: "dry-run",
      templateId: ensuredTemplate.templateId,
      templateName: resolvedTemplateName,
      normalizedConfig,
      latestRevisionNo: null,
    };
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
  return {
    mode: "write",
    templateId,
    templateName: resolvedTemplateName,
    normalizedConfig,
    latestRevisionNo: nextRevisionNo,
  };
};

const runCli = async () => {
  const options = parseCliOptions();
  await runImportV2TemplateFromFigma(options);
};

if (require.main === module) {
  runCli().catch((error) => {
    console.error("[import:v2:figma] failed:", error);
    process.exit(1);
  });
}
