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
  V2TemplateCardFrameNode,
  V2TemplateCardNode,
  V2TemplateCardStructure,
  V2TemplateDayKey,
  V2TemplateExtraAssetDimensionMap,
  V2TemplateExtraAssetMap,
  V2TemplateTimetableCardComponent,
  V2TemplateTimetableCardState,
} from "../src/types/time-table/template-render-config";

type CardBackgroundAssetMode = "none" | "shared" | "byDay";

export type ImportV2CardComponentGroup = {
  id: string;
  label?: string;
  candidates: FigmaNode[];
};

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
  uploadAssetsWithoutWrite?: boolean;
  assetTheme: string;
  assetFormat: "png" | "jpg" | "svg" | "pdf";
  noAiAssetMatch: boolean;
  explicitExternalCardCandidates?: FigmaNode[];
  explicitExternalCardComponentGroups?: ImportV2CardComponentGroup[];
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

export type ImportV2DetectedFeature = {
  enabled: boolean;
  on: boolean;
  off: boolean;
  object: boolean;
  text: boolean;
};

export type ImportV2DetectedFeatures = {
  artist: ImportV2DetectedFeature & {
    profile: boolean;
  };
  memo: ImportV2DetectedFeature;
};

export type ImportV2TemplateFromFigmaResult = {
  mode: "dry-run" | "write";
  templateId: string;
  templateName: string;
  normalizedConfig: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  latestRevisionNo: number | null;
  assetImportSummary: AssetImportSummary | null;
  detectedFeatures: ImportV2DetectedFeatures;
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
  size?: {
    x?: number;
    y?: number;
  };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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

export type AssetImportSummary = {
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
    board: boolean;
    frameBg: boolean;
    gridBg: boolean;
    grid: boolean;
    weekFlag: boolean;
    topObject: boolean;
    memoObject: boolean;
    memoText: boolean;
    artistText: boolean;
    artistObject: boolean;
    frameArtwork: boolean;
    frameObject: boolean;
    cardContainer: boolean;
    cardMainTitle: boolean;
    cardSubTitle: boolean;
    cardStreamingTime: boolean;
    cardStreamingDate: boolean;
    cardStreamingDay: boolean;
  };
};

type CardTextStatus = "online" | "multi" | "offline" | "offlineMemo";
type OnOffVariantState = "on" | "off";
type ArtistVariantState = OnOffVariantState;
type MemoVariantState = OnOffVariantState;
type ImportRenderConfig = ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
// Supabase table types are not generated for this admin script.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdminClient = any;

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
  "scene.background": "bgByTheme",
  "board": "boardByTheme",
  "scene.board": "boardByTheme",
  "board.bg": "boardByTheme",
  "scene.board.bg": "boardByTheme",
  "frame.bg": "frameBgByTheme",
  "scene.frame.bg": "frameBgByTheme",
  "frame.background": "frameBgByTheme",
  "frame.frame": "frameByTheme",
  "scene.frame.frame": "frameByTheme",
  "frame.object": "frameByTheme",
  "scene.frame.object": "frameByTheme",
  "grid.bg": "gridBgByTheme",
  "scene.grid.bg": "gridBgByTheme",
  "grid.background": "gridBgByTheme",
  "scene.grid.background": "gridBgByTheme",
  "frame.artwork": "profileBgByTheme",
  "scene.frame.artwork": "profileBgByTheme",
  "frame.profile": "profileBgByTheme",
  "scene.topobject": "topObjectByTheme",
  "scene.top": "topObjectByTheme",
  "scene.memo": "memoByTheme",
  "memo.container": "memoByTheme",
  "artist.background": "artistOnByTheme",
  "artist.object": "artistOnByTheme",
  "artist.off": "artistOffByTheme",
  "artist.off.object": "artistOffByTheme",
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
  board: "boardByTheme",
  boardbg: "boardByTheme",
  board_bg: "boardByTheme",
  sceneboard: "boardByTheme",
  scene_board: "boardByTheme",
  frame: "frameByTheme",
  frameobject: "frameByTheme",
  frame_object: "frameByTheme",
  frameoverlay: "frameByTheme",
  frame_overlay: "frameByTheme",
  framebg: "frameBgByTheme",
  frame_bg: "frameBgByTheme",
  framebackground: "frameBgByTheme",
  frame_background: "frameBgByTheme",
  gridbg: "gridBgByTheme",
  grid_bg: "gridBgByTheme",
  gridbackground: "gridBgByTheme",
  grid_background: "gridBgByTheme",
  scenegridbg: "gridBgByTheme",
  scene_grid_bg: "gridBgByTheme",
  artwork: "profileBgByTheme",
  frameartwork: "profileBgByTheme",
  frame_artwork: "profileBgByTheme",
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

  Object.values(config.timetable.components).forEach((component) => {
    const state = component.states[mode];
    if (!state) return;
    Object.values(state.card.nodes).forEach((node) => {
      if (node.kind !== "image") return;
      const assetRef = node.assetRef;
      const keyPrefix = mode === "offlineMemo" ? "offlineMemo_" : `${mode}_`;
      const isExpectedNode =
        node.highlightTarget === variant.layerTarget ||
        node.id === `${mode}-background` ||
        (mode === "offlineMemo" && node.id === "offline-memo-background") ||
        (assetRef?.source === "builtin" &&
          (assetRef.key === variant.builtinAssetKey ||
            assetRef.key.startsWith(keyPrefix)));
      if (!isExpectedNode) return;

      if (backgroundMode === "byDay" && dayMap) {
        node.assetRefByDayKey = dayMap;
      } else {
        node.assetRefByDayKey = undefined;
      }

      if (variant.builtinAssetKey && node.assetRef?.source !== "extra") {
        node.assetRef = {
          source: "builtin",
          key: variant.builtinAssetKey,
        };
      }
    });
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

const getNodeSize = (
  node: FigmaNode | undefined
): { width: number; height: number } | null => {
  if (!node) return null;

  const width = Number(node.width ?? node.size?.x);
  const height = Number(node.height ?? node.size?.y);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return {
    width,
    height,
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

const hasRenderableRotation = (rotateDeg: number | undefined): rotateDeg is number =>
  typeof rotateDeg === "number" &&
  Number.isFinite(rotateDeg) &&
  Math.abs(rotateDeg) > 0.0001;

const adjustFigmaRectForCssCenterRotation = ({
  left,
  top,
  width,
  height,
  rotateDeg,
  rotatedWidth,
  rotatedHeight,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  rotateDeg: number | undefined;
  rotatedWidth?: number;
  rotatedHeight?: number;
}): { left: number; top: number; width: number; height: number } => {
  if (!hasRenderableRotation(rotateDeg)) {
    return { left, top, width, height };
  }

  if (Number.isFinite(rotatedWidth) && Number.isFinite(rotatedHeight)) {
    return {
      left: left + (Number(rotatedWidth) - width) / 2,
      top: top + (Number(rotatedHeight) - height) / 2,
      width,
      height,
    };
  }

  const radians = (rotateDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    left: left + (cos * width - sin * height - width) / 2,
    top: top + (sin * width + cos * height - height) / 2,
    width,
    height,
  };
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
  const size = hasRenderableRotation(rotateDeg) ? getNodeSize(targetNode) : null;
  const width = size?.width ?? targetBounds.width;
  const height = size?.height ?? targetBounds.height;
  const adjusted = adjustFigmaRectForCssCenterRotation({
    left: targetBounds.x - rootBounds.x,
    top: targetBounds.y - rootBounds.y,
    width,
    height,
    rotateDeg,
    rotatedWidth: targetBounds.width,
    rotatedHeight: targetBounds.height,
  });

  return {
    left: round(adjusted.left),
    top: round(adjusted.top),
    width: round(adjusted.width),
    height: round(adjusted.height),
    ...(hasRenderableRotation(rotateDeg) ? { rotateDeg } : {}),
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

const MEMO_VARIANT_STATE_ALIASES: Record<string, MemoVariantState> = {
  on: "on",
  memoon: "on",
  memo_on: "on",
  "memo-on": "on",
  weeklymemoon: "on",
  weekly_memo_on: "on",
  withmemo: "on",
  with_memo: "on",
  off: "off",
  memooff: "off",
  memo_off: "off",
  "memo-off": "off",
  weeklymemooff: "off",
  weekly_memo_off: "off",
  nomemo: "off",
  no_memo: "off",
  noweeklymemo: "off",
  no_weekly_memo: "off",
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

const normalizeMemoVariantState = (
  value: string | undefined
): MemoVariantState | undefined => {
  if (!value) return undefined;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return MEMO_VARIANT_STATE_ALIASES[normalized];
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

const parseMemoVariantStateFromNode = (
  node: FigmaNode | undefined
): MemoVariantState | undefined => {
  if (!node) return undefined;

  for (const [rawKey, rawValue] of Object.entries(node.variantProperties ?? {})) {
    const key = canonicalName(rawKey);
    if (!key.includes("memo")) continue;
    const normalized = normalizeMemoVariantState(rawValue);
    if (normalized) return normalized;
  }

  const tokens = tokenizeNodeName(node.name);
  const isMemoName =
    tokens.includes("memo") ||
    tokens.includes("weeklymemo") ||
    tokens.includes("memoon") ||
    tokens.includes("memooff") ||
    tokens.includes("nomemo");
  if (!isMemoName) return undefined;
  if (tokens.includes("off") || tokens.includes("memooff") || tokens.includes("nomemo")) {
    return "off";
  }
  if (tokens.includes("on") || tokens.includes("memoon")) {
    return "on";
  }
  return undefined;
};

const appendFigmaNodeTag = ({
  node,
  key,
  value,
}: {
  node: FigmaNode;
  key: string;
  value: string;
}) => {
  const currentName = node.name?.trim() ?? "";
  const tagPattern = new RegExp(`\\[${key}\\s*=`, "i");
  if (tagPattern.test(currentName)) return;
  node.name = `${currentName || node.id || "node"} [${key}=${value}]`;
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

const isExportableAssetContainerNode = (node: FigmaNode): boolean => {
  if (!node.name) return false;
  const nodeType = (node.type ?? "").toUpperCase();
  return (
    nodeType !== "TEXT" &&
    nodeType !== "SECTION" &&
    nodeType !== "PAGE" &&
    nodeType !== "DOCUMENT"
  );
};

const isNamedAssetContainerCandidate = (nodeName: string): boolean => {
  const canonical = canonicalName(nodeName);
  return [
    "imagebg",
    "bg",
    "background",
    "imagebackground",
    "topobject",
    "imagetopobject",
    "memoobject",
    "imagememo",
    "board",
    "boardbg",
    "sceneboard",
    "framebg",
    "framebackground",
    "frameobject",
    "frameartwork",
    "profileimage",
    "profileframe",
    "guideoverlay",
  ].includes(canonical);
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

const getLocalNodeRect = (node: FigmaNode | undefined): Rect | null => {
  if (!node) return null;

  const directLeft = Number(node.x);
  const directTop = Number(node.y);
  const transformLeft = Number(node.relativeTransform?.[0]?.[2]);
  const transformTop = Number(node.relativeTransform?.[1]?.[2]);
  const size = getNodeSize(node);
  const width = Number(size?.width ?? node.absoluteBoundingBox?.width);
  const height = Number(size?.height ?? node.absoluteBoundingBox?.height);
  const left = Number.isFinite(directLeft) ? directLeft : transformLeft;
  const top = Number.isFinite(directTop) ? directTop : transformTop;

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  const rotateDeg = getRotationDeg(node);
  const adjusted = adjustFigmaRectForCssCenterRotation({
    left,
    top,
    width,
    height,
    rotateDeg,
  });

  return {
    left: round(adjusted.left),
    top: round(adjusted.top),
    width: round(adjusted.width),
    height: round(adjusted.height),
    ...(hasRenderableRotation(rotateDeg) ? { rotateDeg } : {}),
  };
};

const cloneImportJson = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const sanitizeTimetableStyleKeyPart = (value: string): string => {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
  return sanitized.replace(/^-+|-+$/g, "") || "style";
};

const buildTimetableScopedStyleKey = ({
  componentId,
  status,
  nodeId,
  part,
  sourceKey,
}: {
  componentId: string;
  status: CardTextStatus;
  nodeId: string;
  part: string;
  sourceKey: string;
}): string => {
  const expectedPrefix = [
    "timetable",
    sanitizeTimetableStyleKeyPart(componentId),
    status,
    sanitizeTimetableStyleKeyPart(nodeId),
    sanitizeTimetableStyleKeyPart(part),
  ].join(":");
  if (sourceKey.startsWith(`${expectedPrefix}:`)) {
    return sourceKey;
  }
  return `${expectedPrefix}:${sanitizeTimetableStyleKeyPart(sourceKey)}`;
};

const applyFlexibleLayoutToTargets = ({
  rect,
  containerTarget,
  wrapperTarget,
}: {
  rect: Rect | null;
  containerTarget: Record<string, unknown>;
  wrapperTarget?: Record<string, unknown>;
}) => {
  if (!rect) return;

  applyRectToLayoutObject({
    rect,
    target: containerTarget,
    includeRotation: !wrapperTarget,
  });

  if (!wrapperTarget) return;

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

const findDirectWeekDateChild = ({
  rootNode,
  aliases,
}: {
  rootNode: FigmaNode | undefined;
  aliases: readonly string[];
}): FigmaNode | undefined => {
  if (!rootNode || !Array.isArray(rootNode.children)) return undefined;
  return rootNode.children.find((child) => {
    const childName = child.name;
    if (!childName) return false;
    return aliases.some((alias) => canonicalName(alias) === canonicalName(childName));
  });
};

const getWeekDateTextPartNode = ({
  rootNode,
  aliases,
}: {
  rootNode: FigmaNode | undefined;
  aliases: readonly string[];
}): FigmaNode | undefined => {
  if (!rootNode) return undefined;
  const direct = findDirectWeekDateChild({ rootNode, aliases });
  if (direct && isTextNode(direct)) return direct;
  const descendants = flattenNodes(rootNode).slice(1);
  return descendants.find(
    (node) => {
      const nodeName = node.name;
      return (
        isTextNode(node) &&
        Boolean(
          nodeName &&
            aliases.some((alias) => canonicalName(alias) === canonicalName(nodeName))
        )
      );
    }
  );
};

const applyLocalRectToSceneStyle = ({
  node,
  parentNode,
  target,
}: {
  node: FigmaNode | undefined;
  parentNode?: FigmaNode;
  target: Record<string, unknown>;
}) => {
  target.position = "absolute";
  const fallbackRect = parentNode
    ? toRelativeRect({
        rootNode: parentNode,
        targetNode: node,
      })
    : null;
  applyRectToLayoutObject({
    rect: getLocalNodeRect(node) ?? fallbackRect,
    target,
  });
};

const applySeparatedWeekDatesFromFigmaNode = ({
  config,
  rootNode,
  weekDatesNode,
  summary,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  rootNode: FigmaNode;
  weekDatesNode: FigmaNode | undefined;
  summary: MappingSummary;
}): boolean => {
  if (!weekDatesNode) return false;

  const startNode = findDirectWeekDateChild({
    rootNode: weekDatesNode,
    aliases: ["start", "weekStart", "week.start"],
  });
  const endNode = findDirectWeekDateChild({
    rootNode: weekDatesNode,
    aliases: ["end", "weekEnd", "week.end"],
  });
  const startMonthNode = getWeekDateTextPartNode({
    rootNode: startNode,
    aliases: ["mm", "MM", "month", "startMonth"],
  });
  const startDateNode = getWeekDateTextPartNode({
    rootNode: startNode,
    aliases: ["dd", "DD", "date", "day", "startDate"],
  });
  const endMonthNode = getWeekDateTextPartNode({
    rootNode: endNode,
    aliases: ["mm", "MM", "month", "endMonth"],
  });
  const endDateNode = getWeekDateTextPartNode({
    rootNode: endNode,
    aliases: ["dd", "DD", "date", "day", "endDate"],
  });

  const hasSeparatedStructure = Boolean(
    startNode &&
      endNode &&
      startMonthNode &&
      startDateNode &&
      endMonthNode &&
      endDateNode
  );
  if (!hasSeparatedStructure) return false;

  const sceneLayout = config.layout.scene as Record<string, Record<string, unknown>>;
  const ensureSceneStyle = (styleKey: string): Record<string, unknown> => {
    const current = sceneLayout[styleKey];
    const next =
      current && typeof current === "object" && !Array.isArray(current)
        ? current
        : {};
    sceneLayout[styleKey] = next;
    return next;
  };

  const weekDatesStyle = ensureSceneStyle("weekDates");
  weekDatesStyle.position = "absolute";
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: weekDatesNode }),
    target: weekDatesStyle,
    includeRotation: false,
  });

  const startStyle = ensureSceneStyle("weekDatesStart");
  applyLocalRectToSceneStyle({
    node: startNode,
    parentNode: weekDatesNode,
    target: startStyle,
  });

  const endStyle = ensureSceneStyle("weekDatesEnd");
  applyLocalRectToSceneStyle({
    node: endNode,
    parentNode: weekDatesNode,
    target: endStyle,
  });

  const textParts = [
    {
      id: "scene-week-start-month",
      label: "MM",
      layerId: "week-start-month",
      parentId: "scene-week-dates-start",
      bindingKey: "weekStartMonth",
      styleKey: "weekStartMonth",
      node: startMonthNode,
    },
    {
      id: "scene-week-start-date",
      label: "DD",
      layerId: "week-start-date",
      parentId: "scene-week-dates-start",
      bindingKey: "weekStartDate",
      styleKey: "weekStartDate",
      node: startDateNode,
    },
    {
      id: "scene-week-end-month",
      label: "MM",
      layerId: "week-end-month",
      parentId: "scene-week-dates-end",
      bindingKey: "weekEndMonth",
      styleKey: "weekEndMonth",
      node: endMonthNode,
    },
    {
      id: "scene-week-end-date",
      label: "DD",
      layerId: "week-end-date",
      parentId: "scene-week-dates-end",
      bindingKey: "weekEndDate",
      styleKey: "weekEndDate",
      node: endDateNode,
    },
  ] as const;

  textParts.forEach((part) => {
    const target = ensureSceneStyle(part.styleKey);
    const parentNode = part.parentId === "scene-week-dates-start" ? startNode : endNode;
    applyLocalRectToSceneStyle({ node: part.node, parentNode, target });
    applyTextStyleFromContentNode({
      containerNode: part.node,
      target,
    });
  });

  const weekFlagGraphNode = config.graph.nodes["scene-week-flag"];
  if (weekFlagGraphNode) {
    weekFlagGraphNode.type = "group";
    weekFlagGraphNode.label = "WeekDates";
    weekFlagGraphNode.layerId = "week-flag";
    weekFlagGraphNode.childIds = ["scene-week-dates-end", "scene-week-dates-start"];
    weekFlagGraphNode.styles = {
      styleKey: "weekDates",
    };
    weekFlagGraphNode.meta = {
      layerTarget: "sceneNode:scene-week-flag",
      layerSectionKey: "weekDates",
      layerIcon: "calendar",
      layerComponentKey: "weekFlag",
    };
    delete weekFlagGraphNode.binding;
    delete weekFlagGraphNode.highlightTarget;
  } else {
    config.graph.rootNodeIds.push("scene-week-flag");
    config.graph.nodes["scene-week-flag"] = {
      id: "scene-week-flag",
      type: "group",
      label: "WeekDates",
      parentId: null,
      childIds: ["scene-week-dates-end", "scene-week-dates-start"],
      layerId: "week-flag",
      visibilityMode: "always",
      styles: {
        styleKey: "weekDates",
      },
      meta: {
        layerTarget: "sceneNode:scene-week-flag",
        layerSectionKey: "weekDates",
        layerIcon: "calendar",
        layerComponentKey: "weekFlag",
      },
    };
  }

  config.graph.nodes["scene-week-dates-end"] = {
    id: "scene-week-dates-end",
    type: "group",
    label: "end",
    parentId: "scene-week-flag",
    childIds: ["scene-week-end-date", "scene-week-end-month"],
    layerId: "week-dates-end",
    visibilityMode: "always",
    styles: {
      styleKey: "weekDatesEnd",
    },
    meta: {
      layerTarget: "sceneNode:scene-week-dates-end",
      layerSectionKey: "weekDatesEnd",
      layerIcon: "group",
    },
  };
  config.graph.nodes["scene-week-dates-start"] = {
    id: "scene-week-dates-start",
    type: "group",
    label: "start",
    parentId: "scene-week-flag",
    childIds: ["scene-week-start-date", "scene-week-start-month"],
    layerId: "week-dates-start",
    visibilityMode: "always",
    styles: {
      styleKey: "weekDatesStart",
    },
    meta: {
      layerTarget: "sceneNode:scene-week-dates-start",
      layerSectionKey: "weekDatesStart",
      layerIcon: "group",
    },
  };

  textParts.forEach((part) => {
    config.graph.nodes[part.id] = {
      id: part.id,
      type: "text",
      label: part.label,
      parentId: part.parentId,
      childIds: [],
      layerId: part.layerId,
      visibilityMode: "always",
      binding: {
        mode: "computed",
        key: part.bindingKey,
      },
      styles: {
        containerStyleKey: part.styleKey,
      },
      highlightTarget: `sceneNode:${part.id}`,
      meta: {
        colorKey: "WEEKLY_FLAG",
        fontKey: "WEEKLY_FLAG",
        layerTarget: `sceneNode:${part.id}`,
        layerSectionKey: part.styleKey,
        layerIcon: "calendar",
        containerClassName: "absolute flex items-center justify-center",
      },
    };
  });

  summary.applied.push("graph.weekDates.separatedParts");
  summary.applied.push("layout.weekDates.parts");
  return true;
};

const applyNotApplicablePruning = ({
  config,
  summary,
}: {
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  summary: MappingSummary;
}) => {
  const { presence } = summary;
  const hasArtistCapability = presence.artistText || presence.artistObject;

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

  const hasMemoCapability = presence.memoObject || presence.memoText;
  config.editorOptions.isMemo = hasMemoCapability;
  if (!hasMemoCapability) {
    removeGraphSubtree({
      config,
      nodeId: "scene-memo",
      summary,
      reason: "scene.memoGroup",
    });
    summary.notApplicable.push("editorOptions.isMemo=false");
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
    removeGraphSubtree({
      config,
      nodeId: "scene-artist-object-off",
      summary,
      reason: "scene.artistObjectOff",
    });
  }

  if (!hasArtistCapability) {
    removeGraphSubtree({
      config,
      nodeId: "scene-artist-group",
      summary,
      reason: "scene.artistGroup",
    });
    removeGraphSubtree({
      config,
      nodeId: "scene-artist",
      summary,
      reason: "scene.artistGroup",
    });
  }

  if (!presence.board) {
    removeGraphSubtree({
      config,
      nodeId: "scene-board",
      summary,
      reason: "scene.board",
    });
  }

  if (!presence.frameBg) {
    removeGraphSubtree({
      config,
      nodeId: "scene-frame-bg",
      summary,
      reason: "scene.frameBg",
    });
  }

  if (!presence.frameArtwork) {
    removeGraphSubtree({
      config,
      nodeId: "scene-frame-artwork",
      summary,
      reason: "scene.frameArtwork",
    });
  }

  if (!presence.frameObject) {
    removeGraphSubtree({
      config,
      nodeId: "scene-frame-frame",
      summary,
      reason: "scene.frameObject",
    });
  }

  if (!presence.frameBg && !presence.frameArtwork && !presence.frameObject) {
    removeGraphSubtree({
      config,
      nodeId: "scene-frame",
      summary,
      reason: "scene.frame",
    });
  }

  // Frame is a separate scene area; only artist text/object controls artist status.
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

  if (!presence.gridBg) {
    removeGraphSubtree({
      config,
      nodeId: "scene-grid-bg",
      summary,
      reason: "scene.gridBg",
    });
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
  externalCardComponentGroups = [],
  externalArtistVariantCandidates = [],
  externalWarnings = [],
  componentMapById,
}: {
  rootNode: FigmaNode;
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
  externalCardCandidates?: FigmaNode[];
  externalCardComponentGroups?: ImportV2CardComponentGroup[];
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
      board: false,
      frameBg: false,
      gridBg: false,
      grid: false,
      weekFlag: false,
      topObject: false,
      memoObject: false,
      memoText: false,
      artistText: false,
      artistObject: false,
      frameArtwork: false,
      frameObject: false,
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
  const sceneLayout = config.layout.scene as Record<
    string,
    Record<string, unknown> | undefined
  >;
  const ensureSceneLayoutObject = (styleKey: string): Record<string, unknown> => {
    const current = sceneLayout[styleKey];
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return current;
    }
    const next: Record<string, unknown> = {};
    sceneLayout[styleKey] = next;
    return next;
  };
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
    board: ["board", "sceneboard", "imageboard", "board bg"],
    gridBg: [
      "gridbg",
      "gridbackground",
      "scenegridbg",
      "grid bg",
    ],
    frameBg: [
      "framebg",
      "framebackground",
      "sceneframebg",
      "frame bg",
    ],
    profileImage: [
      "profileimage",
      "imageprofile",
      "imageprofileimage",
      "artistimage",
      "profile image",
      "artwork",
      "frameartwork",
      "frame artwork",
    ],
    profileFrame: [
      "profileframe",
      "frameframe",
      "frameobject",
      "imageframe",
      "imageprofileframe",
      "artistframe",
      "profile frame",
      "frame object",
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
    sceneBackground: ["imagebg", "bg", "background", "imagebackground"],
  } as const;

  const slot = {
    sceneBackground: ["scene.bg", "scene.background"],
    board: ["board", "scene.board", "board.bg", "scene.board.bg"],
    gridBg: ["grid.bg", "scene.grid.bg", "grid.background"],
    frameBg: ["frame.bg", "scene.frame.bg", "frame.background"],
    grid: ["grid", "scene.grid"],
    weekFlag: ["weekFlag", "week.flag", "scene.weekFlag"],
    topObject: ["scene.topObject", "topObject", "top.object"],
    memoContainer: ["memo", "scene.memo", "memo.container"],
    memoContentContainer: ["memo.text", "memo.content"],
    memoTextContainer: ["memo.text"],
    memoText: ["memo.text.content"],
    profileImage: [
      "profile.image",
      "frame.artwork",
      "scene.frame.artwork",
      "frame.profile",
    ],
    profileFrame: ["frame.frame", "scene.frame.frame", "profile.frame", "profile"],
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

  const countDayStatusCardDescendants = (node: FigmaNode | undefined): number => {
    if (!node) return 0;
    return collectDayStatusCardCandidates(flattenNodes(node)).length;
  };

  const getNodeArea = (node: FigmaNode | undefined): number => {
    const bounds = getBounds(node);
    if (!bounds) return Number.POSITIVE_INFINITY;
    return bounds.width * bounds.height;
  };

  const resolveGridLayoutNode = (
    gridWrapperNode: FigmaNode | undefined
  ): FigmaNode | undefined => {
    if (!gridWrapperNode) return undefined;

    const explicitFrameGridNode = findFirstDirectChildByNames({
      rootNode: gridWrapperNode,
      aliases: ["frame/grid", "framegrid", "grid"],
    });
    if (explicitFrameGridNode && getBounds(explicitFrameGridNode)) {
      summary.applied.push("layout.grid.source=Scene/Grid>Frame/Grid");
      return explicitFrameGridNode;
    }

    const wrapperChildren = Array.isArray(gridWrapperNode.children)
      ? gridWrapperNode.children
      : [];
    const rankedChildCandidates = wrapperChildren
      .map((child, index) => ({
        child,
        index,
        cardCount: countDayStatusCardDescendants(child),
        area: getNodeArea(child),
      }))
      .filter((entry) => entry.cardCount >= 2 && Number.isFinite(entry.area))
      .sort((left, right) => {
        if (right.cardCount !== left.cardCount) return right.cardCount - left.cardCount;
        if (left.area !== right.area) return left.area - right.area;
        return left.index - right.index;
      });

    const bestChildCandidate = rankedChildCandidates[0]?.child;
    if (bestChildCandidate) {
      summary.applied.push("layout.grid.source=Scene/Grid>card-wrapper");
      return bestChildCandidate;
    }

    summary.warnings.push(
      "Grid layout wrapper not found; using Scene/Grid as layout root."
    );
    return gridWrapperNode;
  };

  const rootBounds = getBounds(rootNode);
  if (!rootBounds) {
    summary.warnings.push("Root absoluteBoundingBox is missing.");
    return summary;
  }

  const sceneBoardNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/board", "board", "sceneboard"]],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.board,
      aliases: alias.board,
    });
  const sceneBoardBgNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [
        ["scene/board", "board", "sceneboard"],
        ["image/bg", "bg", "imagebg", "background"],
      ],
    }) ??
    findFirstByTagCriteria(allNodes, {
      slot: slot.board,
      role: ["background", "bg"],
    });
  const sceneFrameNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/frame", "frame", "sceneframe"]],
    }) ??
    findFirstDirectChildByNames({
      rootNode,
      aliases: ["scene/frame", "frame", "sceneframe"],
    });
  const sceneFrameBgNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [
        ["scene/frame", "frame", "sceneframe"],
        ["image/bg", "bg", "imagebg", "background"],
      ],
    }) ??
    findFirstByTagCriteria(allNodes, {
      slot: slot.frameBg,
      role: ["background", "bg"],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.frameBg,
      aliases: alias.frameBg,
    });
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
  const sceneGridBgNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [
        ["scene/grid", "grid"],
        ["image/bg", "bg", "imagebg", "background"],
      ],
    }) ??
    findFirstByTagCriteria(allNodes, {
      slot: slot.gridBg,
      role: ["background", "bg"],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.gridBg,
      aliases: alias.gridBg,
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
  const sceneFrameArtworkNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [
        ["scene/frame", "frame", "sceneframe"],
        ["image/profile", "profileimage", "imageprofile", "image/artwork", "artwork"],
      ],
    }) ??
    findNodeByTagOrAlias({
      nodes: allNodes,
      tagValues: slot.profileImage,
      aliases: alias.profileImage,
    });
  const sceneFrameObjectNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [
        ["scene/frame", "frame", "sceneframe"],
        ["image/frame", "profileframe", "imageframe", "frameobject"],
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

  const sceneBackgroundNode =
    findFirstDirectChildByTagValues({
      rootNode,
      key: "slot",
      values: slot.sceneBackground,
    }) ??
    findFirstDirectChildByNames({
      rootNode,
      aliases: alias.sceneBackground,
    }) ??
    findFirstByTagValues(allNodes, "slot", slot.sceneBackground);
  if (sceneBackgroundNode) {
    appendFigmaNodeTag({
      node: sceneBackgroundNode,
      key: "asset",
      value: "bgByTheme",
    });
    summary.applied.push("asset.scene.background=bgByTheme");
  }

  const boardRootNode = sceneBoardNode ?? sceneBoardBgNode;
  const boardPositionRootNode = assignSceneGroupFrame({
    nodeId: "scene-board",
    styleKey: "sceneBoard",
    frameNode: boardRootNode,
    reason: "layout.scene.sceneBoard",
  });
  const boardBgNode = sceneBoardBgNode ?? sceneBoardNode;
  summary.presence.board = Boolean(boardBgNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({
      rootNode: boardPositionRootNode,
      targetNode: boardBgNode,
    }),
    target: ensureSceneLayoutObject("boardBg"),
  });
  if (boardBgNode) {
    appendFigmaNodeTag({
      node: boardBgNode,
      key: "asset",
      value: "boardByTheme",
    });
    summary.applied.push("layout.scene.boardBg");
    summary.applied.push("asset.board.bg=boardByTheme");
  }

  const frameRootNode =
    sceneFrameNode ?? sceneFrameBgNode ?? sceneFrameArtworkNode ?? sceneFrameObjectNode;
  const framePositionRootNode = assignSceneGroupFrame({
    nodeId: "scene-frame",
    styleKey: "sceneFrame",
    frameNode: frameRootNode,
    reason: "layout.scene.sceneFrame",
  });
  summary.presence.frameBg = Boolean(sceneFrameBgNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({
      rootNode: framePositionRootNode,
      targetNode: sceneFrameBgNode,
    }),
    target: ensureSceneLayoutObject("frameBg"),
  });
  if (sceneFrameBgNode) {
    appendFigmaNodeTag({
      node: sceneFrameBgNode,
      key: "asset",
      value: "frameBgByTheme",
    });
    summary.applied.push("layout.scene.frameBg");
    summary.applied.push("asset.frame.bg=frameBgByTheme");
  }

  const gridNode = resolveGridLayoutNode(sceneGridNode);
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

  summary.presence.gridBg = Boolean(sceneGridBgNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: sceneGridBgNode }),
    target: ensureSceneLayoutObject("gridBg"),
  });
  if (sceneGridBgNode) {
    appendFigmaNodeTag({
      node: sceneGridBgNode,
      key: "asset",
      value: "gridBgByTheme",
    });
    summary.applied.push("layout.scene.gridBg");
    summary.applied.push("asset.grid.bg=gridBgByTheme");
  }

  const weekFlagNode = sceneWeekDatesNode;
  summary.presence.weekFlag = Boolean(weekFlagNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: weekFlagNode }),
    target: config.layout.weekFlag as unknown as Record<string, unknown>,
    includeRotation: false,
  });
  if (weekFlagNode) {
    const appliedSeparatedWeekDates = applySeparatedWeekDatesFromFigmaNode({
      config,
      rootNode,
      weekDatesNode: weekFlagNode,
      summary,
    });
    if (!appliedSeparatedWeekDates) {
      const appliedWeekFlagTextStyle = applyTextStyleFromContentNode({
        containerNode: weekFlagNode,
        target: config.layout.weekFlag as unknown as Record<string, unknown>,
      });
      if (!appliedWeekFlagTextStyle) {
        summary.warnings.push("WeekFlag Content(TEXT) not found; text style skipped.");
      }
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
    target: ensureSceneLayoutObject("memoContainer"),
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
    target: ensureSceneLayoutObject("memoContentContainer"),
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
    target: ensureSceneLayoutObject("memoTextContainer"),
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
      target: ensureSceneLayoutObject("memoTextStyle"),
    });
    if (!appliedMemoTextStyle) {
      summary.warnings.push("Memo Content(TEXT) not found; text style skipped.");
    }
    summary.applied.push("layout.scene.memoTextStyle");
  }

  const frameArtworkNode = sceneFrameArtworkNode;
  summary.presence.frameArtwork = Boolean(frameArtworkNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({
      rootNode: framePositionRootNode,
      targetNode: frameArtworkNode,
    }),
    target: ensureSceneLayoutObject("frameArtwork"),
  });
  if (frameArtworkNode) {
    ensureSceneLayoutObject("frameArtwork").zIndex = 20;
    appendFigmaNodeTag({
      node: frameArtworkNode,
      key: "asset",
      value: "profileBgByTheme",
    });
    summary.applied.push("layout.scene.frameArtwork");
    summary.applied.push("asset.frame.artwork=profileBgByTheme");
  }

  const frameObjectNode = sceneFrameObjectNode;
  summary.presence.frameObject = Boolean(frameObjectNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({
      rootNode: framePositionRootNode,
      targetNode: frameObjectNode,
    }),
    target: ensureSceneLayoutObject("frameObject"),
  });
  if (frameObjectNode) {
    ensureSceneLayoutObject("frameObject").zIndex = 30;
    appendFigmaNodeTag({
      node: frameObjectNode,
      key: "asset",
      value: "frameByTheme",
    });
    summary.applied.push("layout.scene.frameObject");
    summary.applied.push("asset.frame.frame=frameByTheme");
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
      wrapperTarget: config.layout.artistTextWrapperStyle as
        | Record<string, unknown>
        | undefined,
    });
    summary.applied.push("layout.artistTextRootStyle");
    if (config.layout.artistTextWrapperStyle) {
      summary.applied.push("layout.artistTextWrapperStyle");
    }

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
    const hasExplicitCardComponentGroups = externalCardComponentGroups.length > 0;
    const buildScopedCardBackgroundAssetKey = ({
      componentId,
      status,
    }: {
      componentId: string;
      status: CardTextStatus;
    }): string =>
      v2_normalizeAssetToken(`figma_${componentId}_${status}_background`) ||
      `figma_${componentId}_${status}_background`;
    const getCardBackgroundAssetRef = ({
      componentId,
      status,
      forceScoped,
    }: {
      componentId: string;
      status: CardTextStatus;
      forceScoped: boolean;
    }): V2TemplateAssetRef => {
      const sharedKeyByStatus: Partial<Record<CardTextStatus, V2TemplateBuiltinAssetKey>> = {
        online: "onlineByTheme",
        offline: "offlineByTheme",
      };
      const sharedKey = forceScoped ? undefined : sharedKeyByStatus[status];
      if (sharedKey) {
        return {
          source: "builtin",
          key: sharedKey,
        };
      }
      return {
        source: "extra",
        key: buildScopedCardBackgroundAssetKey({
          componentId,
          status,
        }),
      };
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

    const applyTimetableCardMappingsFromFigma = () => {
      const defaultComponentId =
        config.timetable.componentOrder[0] ??
        Object.keys(config.timetable.components)[0] ??
        "card-1";
      const baseComponent = config.timetable.components[defaultComponentId];
      if (!baseComponent) return;

      const timetableStatusPlans = [
        { status: "online", statusValues: ["online"] as const },
        {
          status: "multi",
          statusValues: ["multi", "multiple", "online_multi", "onlinemultiple"] as const,
        },
        {
          status: "offline",
          statusValues: ["offline", "offlinememo", "offlineMemo"] as const,
        },
        {
          status: "offlineMemo",
          statusValues: ["offlineMemo", "offlinememo", "offline_memo", "memooffline"] as const,
        },
      ] satisfies Array<{
        status: CardTextStatus;
        statusValues: readonly string[];
      }>;

      const statusCandidatesByStatus = timetableStatusPlans.reduce<
        Partial<Record<CardTextStatus, FigmaNode[]>>
      >((acc, plan) => {
        acc[plan.status] = dedupedStatusCandidates.filter(
          (candidate) => resolveCandidateStatus(candidate) === plan.status
        );
        return acc;
      }, {});
      const activeStatuses = timetableStatusPlans
        .map((plan) => plan.status)
        .filter((status) => (statusCandidatesByStatus[status]?.length ?? 0) > 0);
      if (activeStatuses.length === 0) return;
      config.timetable.statusOptions = {
        ...config.timetable.statusOptions,
        online: true,
        offline: true,
        multi: activeStatuses.includes("multi"),
        offlineMemo: activeStatuses.includes("offlineMemo"),
      };

      const isSharedSyntheticStatus = (status: CardTextStatus): boolean => {
        const candidates = statusCandidatesByStatus[status] ?? [];
        return (
          candidates.length > 0 &&
          candidates.every((candidate) =>
            (candidate.id ?? "").includes("::shared-status::")
          )
        );
      };
      const shouldCreateDayComponents = activeStatuses.some((status) => {
        if (hasExplicitCardComponentGroups) return false;
        if (isSharedSyntheticStatus(status)) return false;
        return IMPORT_DAY_KEYS.some((dayKey) =>
          Boolean(resolveDayStatusCandidate({ dayKey, status }))
        );
      });

      const statusBackgroundNodeId: Record<CardTextStatus, string> = {
        online: "online-background",
        multi: "multi-background",
        offline: "offline-background",
        offlineMemo: "offline-memo-background",
      };
      const copyCardLayoutRecord = (sourceKey: string, targetKey: string) => {
        if (sourceKey === targetKey) return;
        if (config.layout.card[targetKey] !== undefined) return;
        const sourceRecord = config.layout.card[sourceKey];
        config.layout.card[targetKey] =
          sourceRecord && typeof sourceRecord === "object"
            ? cloneImportJson(sourceRecord)
            : {};
      };
      const scopeStyleKey = ({
        componentId,
        status,
        nodeId,
        part,
        sourceKey,
      }: {
        componentId: string;
        status: CardTextStatus;
        nodeId: string;
        part: string;
        sourceKey: string;
      }): string => {
        const targetKey = buildTimetableScopedStyleKey({
          componentId,
          status,
          nodeId,
          part,
          sourceKey,
        });
        copyCardLayoutRecord(sourceKey, targetKey);
        return targetKey;
      };
      const scopeNodeStyleRefs = ({
        componentId,
        status,
        node,
      }: {
        componentId: string;
        status: CardTextStatus;
        node: V2TemplateCardNode;
      }): V2TemplateCardNode => ({
        ...node,
        containerStyleKey: scopeStyleKey({
          componentId,
          status,
          nodeId: node.id,
          part: "container",
          sourceKey: node.containerStyleKey,
        }),
        ...(node.entryStyleKey
          ? {
              entryStyleKey: scopeStyleKey({
                componentId,
                status,
                nodeId: node.id,
                part: "entry",
                sourceKey: node.entryStyleKey,
              }),
            }
          : {}),
        ...(node.textStyleKey
          ? {
              textStyleKey: scopeStyleKey({
                componentId,
                status,
                nodeId: node.id,
                part: "text",
                sourceKey: node.textStyleKey,
              }),
            }
          : {}),
        ...(node.wrapperStyleKey
          ? {
              wrapperStyleKey: scopeStyleKey({
                componentId,
                status,
                nodeId: node.id,
                part: "wrapper",
                sourceKey: node.wrapperStyleKey,
              }),
            }
          : {}),
        ...(node.optionsKey
          ? {
              optionsKey: scopeStyleKey({
                componentId,
                status,
                nodeId: node.id,
                part: "options",
                sourceKey: node.optionsKey,
              }),
            }
          : {}),
      });
      const scopeFrameStyleRef = ({
        componentId,
        status,
        frame,
      }: {
        componentId: string;
        status: CardTextStatus;
        frame: V2TemplateCardFrameNode;
      }): V2TemplateCardFrameNode => ({
        ...frame,
        styleKey: scopeStyleKey({
          componentId,
          status,
          nodeId: frame.id,
          part: "frame",
          sourceKey: frame.styleKey,
        }),
      });
      const scopeCardStructure = ({
        componentId,
        status,
        card,
      }: {
        componentId: string;
        status: CardTextStatus;
        card: V2TemplateCardStructure;
      }): V2TemplateCardStructure => ({
        ...card,
        containerStyleKey: scopeStyleKey({
          componentId,
          status,
          nodeId: "card",
          part: "container",
          sourceKey: card.containerStyleKey,
        }),
        nodes: Object.fromEntries(
          Object.entries(card.nodes).map(([nodeId, node]) => [
            nodeId,
            scopeNodeStyleRefs({ componentId, status, node }),
          ])
        ),
        ...(card.frameNodes
          ? {
              frameNodes: Object.fromEntries(
                Object.entries(card.frameNodes).map(([frameId, frame]) => [
                  frameId,
                  scopeFrameStyleRef({ componentId, status, frame }),
                ])
              ),
            }
          : {}),
      });
      const scopeComponent = (
        component: V2TemplateTimetableCardComponent
      ): V2TemplateTimetableCardComponent => {
        const nextStates = { ...component.states };
        timetableStatusPlans.forEach((plan) => {
          const state = nextStates[plan.status];
          if (!state) return;
          nextStates[plan.status] = {
            ...state,
            card: scopeCardStructure({
              componentId: component.id,
              status: plan.status,
              card: state.card,
            }),
          };
        });
        return {
          ...component,
          states: nextStates,
        };
      };

      const componentEntries = shouldCreateDayComponents
        ? IMPORT_DAY_KEYS.map((dayKey, index) => ({
            dayKey,
            componentId: `card-${index + 1}`,
            label: `${dayKey.toUpperCase()} Card`,
            candidates: undefined as FigmaNode[] | undefined,
          }))
        : hasExplicitCardComponentGroups
          ? externalCardComponentGroups.slice(0, 7).map((group, index) => ({
              dayKey: "mon" as V2TemplateDayKey,
              componentId: `card-${index + 1}`,
              label: group.label ?? `Card ${index + 1}`,
              candidates: group.candidates,
            }))
          : [
              {
                dayKey: "mon" as V2TemplateDayKey,
                componentId: "card-1",
                label: "Card 1",
                candidates: undefined as FigmaNode[] | undefined,
              },
            ];

      const components = Object.fromEntries(
        componentEntries.map((entry) => {
          const sourceComponent =
            config.timetable.components[entry.componentId] ?? baseComponent;
          const cloned = cloneImportJson(sourceComponent);
          cloned.id = entry.componentId;
          cloned.label = entry.label;
          return [entry.componentId, scopeComponent(cloned)];
        })
      ) as Record<string, V2TemplateTimetableCardComponent>;

      config.timetable.componentOrder = componentEntries.map(
        (entry) => entry.componentId
      );
      config.timetable.components = components;
      config.timetable.slots = IMPORT_DAY_KEYS.reduce(
        (acc, dayKey, index) => {
          acc[dayKey] = {
            ...(config.timetable.slots[dayKey] ?? { dayKey }),
            dayKey,
            componentId:
              shouldCreateDayComponents && !hasExplicitCardComponentGroups
                ? `card-${index + 1}`
                : componentEntries[0].componentId,
          };
          return acc;
        },
        {} as typeof config.timetable.slots
      );

      const selectRepresentativeCandidate = ({
        candidates,
        status,
        dayKey,
      }: {
        candidates: FigmaNode[];
        status: CardTextStatus;
        dayKey: V2TemplateDayKey;
      }): FigmaNode | undefined => {
        const statusCandidates = candidates.filter(
          (candidate) => resolveCandidateStatus(candidate) === status
        );
        return (
          statusCandidates.find(
            (candidate) => resolveCandidateDayKey(candidate) === dayKey
          ) ??
          statusCandidates.find((candidate) => !resolveCandidateDayKey(candidate)) ??
          statusCandidates[0]
        );
      };
      const getRepresentativeCandidate = (
        status: CardTextStatus,
        dayKey: V2TemplateDayKey,
        candidates?: FigmaNode[]
      ): FigmaNode | undefined =>
        candidates
          ? selectRepresentativeCandidate({ candidates, status, dayKey })
          : resolveDayStatusCandidate({ dayKey, status }) ??
            statusCandidatesByStatus[status]?.[0];

      const ensureRootObject = (card: V2TemplateCardStructure, objectId: string) => {
        const rootObjectIds = card.rootObjectIds ?? [...card.nodeOrder];
        if (!rootObjectIds.includes(objectId)) {
          rootObjectIds.push(objectId);
        }
        card.rootObjectIds = rootObjectIds;
      };
      const removeObjectFromParents = (
        card: V2TemplateCardStructure,
        objectId: string
      ) => {
        card.rootObjectIds = (card.rootObjectIds ?? []).filter(
          (rootObjectId) => rootObjectId !== objectId
        );
        Object.values(card.frameNodes ?? {}).forEach((frame) => {
          frame.childIds = frame.childIds.filter((childId) => childId !== objectId);
        });
      };
      const attachObjectToFrame = ({
        card,
        objectId,
        frameId,
      }: {
        card: V2TemplateCardStructure;
        objectId: string;
        frameId: string;
      }) => {
        const frame = card.frameNodes?.[frameId];
        if (!frame) return;
        removeObjectFromParents(card, objectId);
        if (!frame.childIds.includes(objectId)) {
          frame.childIds.push(objectId);
        }
        const node = card.nodes[objectId];
        if (node) {
          node.parentId = frameId;
        }
        const childFrame = card.frameNodes?.[objectId];
        if (childFrame) {
          childFrame.parentId = frameId;
        }
      };
      const attachObjectToRoot = ({
        card,
        objectId,
      }: {
        card: V2TemplateCardStructure;
        objectId: string;
      }) => {
        removeObjectFromParents(card, objectId);
        ensureRootObject(card, objectId);
        const node = card.nodes[objectId];
        if (node) {
          node.parentId = null;
        }
        const frame = card.frameNodes?.[objectId];
        if (frame) {
          frame.parentId = null;
        }
      };
      const ensureFrameNode = ({
        componentId,
        state,
        status,
        frameId,
        entryIndex,
      }: {
        componentId: string;
        state: V2TemplateTimetableCardState;
        status: CardTextStatus;
        frameId: string;
        entryIndex: number;
      }): V2TemplateCardFrameNode => {
        const card = state.card;
        const frameNodes = card.frameNodes ?? {};
        card.frameNodes = frameNodes;
        const fallbackFrame =
          frameNodes[frameId] ??
          Object.values(frameNodes).find((frame) =>
            frame.id.startsWith("entry-frame-")
          );
        const frame =
          frameNodes[frameId] ??
          scopeFrameStyleRef({
            componentId,
            status,
            frame: {
              ...(fallbackFrame
                ? cloneImportJson(fallbackFrame)
                : {
                    id: frameId,
                    label: `Entry Frame ${entryIndex + 1}`,
                    kind: "frame" as const,
                    layerId: frameId,
                    highlightTarget: `cardFrame:${frameId}` as V2TemplateCardFrameNode["highlightTarget"],
                    parentId: null,
                    visibilityMode: "always" as const,
                    styleKey: `entryFrame${entryIndex + 1}`,
                    childIds: [],
                    bindingContext: {
                      scope: "entry" as const,
                      entryIndex,
                    },
                    containerClassName: "absolute",
                  }),
              id: frameId,
              label: `Entry Frame ${entryIndex + 1}`,
              layerId: frameId,
              highlightTarget: `cardFrame:${frameId}` as V2TemplateCardFrameNode["highlightTarget"],
              parentId: null,
              visibilityMode: "always",
              childIds: [],
              bindingContext: {
                scope: "entry",
                entryIndex,
              },
              containerClassName: "absolute",
            },
          });
        frameNodes[frameId] = frame;
        ensureRootObject(card, frameId);
        return frame;
      };
      const findSourceNodeTemplate = ({
        component,
        status,
        nodeId,
        fallbackNodeId,
      }: {
        component: V2TemplateTimetableCardComponent;
        status: CardTextStatus;
        nodeId: string;
        fallbackNodeId: string;
      }): V2TemplateCardNode | undefined => {
        const statusState = component.states[status];
        const onlineState = component.states.online;
        return (
          statusState?.card.nodes[nodeId] ??
          statusState?.card.nodes[fallbackNodeId] ??
          onlineState.card.nodes[nodeId] ??
          onlineState.card.nodes[fallbackNodeId]
        );
      };
      const applyEntrySelector = (
        node: V2TemplateCardNode,
        entryIndex: number
      ): V2TemplateCardNode => {
        if (node.binding.mode !== "field" && node.binding.mode !== "computed") {
          return node;
        }
        return {
          ...node,
          binding: {
            ...node.binding,
            entrySelector: {
              mode: "index",
              index: entryIndex,
            },
          },
        } as V2TemplateCardNode;
      };
      const ensureCardNode = ({
        component,
        state,
        componentId,
        status,
        nodeId,
        fallbackNodeId,
        label,
        entryIndex,
      }: {
        component: V2TemplateTimetableCardComponent;
        state: V2TemplateTimetableCardState;
        componentId: string;
        status: CardTextStatus;
        nodeId: string;
        fallbackNodeId: string;
        label?: string;
        entryIndex?: number;
      }): V2TemplateCardNode | null => {
        const existing = state.card.nodes[nodeId];
        if (existing) return existing;
        const templateNode = findSourceNodeTemplate({
          component,
          status,
          nodeId,
          fallbackNodeId,
        });
        if (!templateNode) return null;
        const cloned = scopeNodeStyleRefs({
          componentId,
          status,
          node: {
            ...cloneImportJson(templateNode),
            id: nodeId,
            label: label ?? templateNode.label,
            layerId: nodeId,
            highlightTarget: `cardNode:${nodeId}` as V2TemplateCardNode["highlightTarget"],
            parentId: null,
            visibilityMode: "always",
          },
        });
        state.card.nodes[nodeId] =
          typeof entryIndex === "number" ? applyEntrySelector(cloned, entryIndex) : cloned;
        if (!state.card.nodeOrder.includes(nodeId)) {
          state.card.nodeOrder.push(nodeId);
        }
        return state.card.nodes[nodeId];
      };
      const applyRectToCardStyle = ({
        root,
        sourceNode,
        styleKey,
        includeRotation = true,
      }: {
        root: FigmaNode;
        sourceNode: FigmaNode | undefined;
        styleKey: string;
        includeRotation?: boolean;
      }) => {
        const target = ensureCardStyleRecord(styleKey);
        if (!target) return;
        target.position = "absolute";
        applyRectToLayoutObject({
          rect: toRelativeRect({ rootNode: root, targetNode: sourceNode }),
          target,
          includeRotation,
        });
      };
      const applyTextStyleToCardNode = ({
        node,
        sourceNode,
      }: {
        node: V2TemplateCardNode;
        sourceNode: FigmaNode | undefined;
      }) => {
        if (!node.textStyleKey) return;
        const textTarget = ensureCardStyleRecord(node.textStyleKey);
        if (!textTarget) return;
        applyTextStyleFromContentNode({
          containerNode: sourceNode,
          target: textTarget,
        });
        if (node.optionsKey && typeof textTarget.fontSize === "number") {
          const optionsTarget = ensureCardStyleRecord(node.optionsKey);
          if (optionsTarget) {
            optionsTarget.maxFontSize = textTarget.fontSize;
            optionsTarget.multiline = true;
          }
        }
      };
      const mapRoleNode = ({
        component,
        state,
        componentId,
        status,
        role,
        sourceNode,
        positionRoot,
        frameId,
        entryIndex,
      }: {
        component: V2TemplateTimetableCardComponent;
        state: V2TemplateTimetableCardState;
        componentId: string;
        status: CardTextStatus;
        role:
          | "mainTitle"
          | "subTitle"
          | "streamingTime"
          | "streamingDate"
          | "streamingDay";
        sourceNode: FigmaNode | undefined;
        positionRoot: FigmaNode;
        frameId?: string;
        entryIndex?: number;
      }) => {
        if (!sourceNode) return false;
        const entryNumber =
          typeof entryIndex === "number" ? Math.max(1, entryIndex + 1) : 1;
        const roleConfig = {
          mainTitle: {
            fallbackNodeId: "main-title-entry-1",
            nodeId: `main-title-entry-${entryNumber}`,
            label: `MainTitle ${entryNumber}`,
            presenceKey: "cardMainTitle" as const,
          },
          subTitle: {
            fallbackNodeId: "sub-title-entry-1",
            nodeId: `sub-title-entry-${entryNumber}`,
            label: `SubTitle ${entryNumber}`,
            presenceKey: "cardSubTitle" as const,
          },
          streamingTime: {
            fallbackNodeId: "streaming-time-entry-1",
            nodeId: `streaming-time-entry-${entryNumber}`,
            label: `StreamingTime ${entryNumber}`,
            presenceKey: "cardStreamingTime" as const,
          },
          streamingDate: {
            fallbackNodeId: "streaming-date",
            nodeId:
              frameId && entryNumber > 1
                ? `streaming-date-entry-${entryNumber}`
                : "streaming-date",
            label:
              frameId && entryNumber > 1
                ? `StreamingDate ${entryNumber}`
                : "StreamingDate",
            presenceKey: "cardStreamingDate" as const,
          },
          streamingDay: {
            fallbackNodeId: "streaming-day",
            nodeId:
              frameId && entryNumber > 1
                ? `streaming-day-entry-${entryNumber}`
                : "streaming-day",
            label:
              frameId && entryNumber > 1
                ? `StreamingDay ${entryNumber}`
                : "StreamingDay",
            presenceKey: "cardStreamingDay" as const,
          },
        }[role];
        const node = ensureCardNode({
          component,
          state,
          componentId,
          status,
          nodeId: roleConfig.nodeId,
          fallbackNodeId: roleConfig.fallbackNodeId,
          label: roleConfig.label,
          entryIndex,
        });
        if (!node) return false;
        applyRectToCardStyle({
          root: positionRoot,
          sourceNode,
          styleKey: node.containerStyleKey,
        });
        const containerTarget = ensureCardStyleRecord(node.containerStyleKey);
        if (containerTarget) {
          containerTarget.opacity = 1;
          containerTarget.pointerEvents = "auto";
        }
        applyTextStyleToCardNode({ node, sourceNode });
        if (node.textStyleKey) {
          const textTarget = ensureCardStyleRecord(node.textStyleKey);
          if (textTarget) {
            textTarget.opacity = 1;
          }
        }
        if (frameId) {
          attachObjectToFrame({
            card: state.card,
            objectId: node.id,
            frameId,
          });
        } else {
          attachObjectToRoot({
            card: state.card,
            objectId: node.id,
          });
        }
        summary.presence[roleConfig.presenceKey] = true;
        return true;
      };
      const syncRootObjectOrder = (card: V2TemplateCardStructure) => {
        const objectIds = new Set([
          ...Object.keys(card.nodes),
          ...Object.keys(card.frameNodes ?? {}),
        ]);
        const parented = new Set<string>();
        Object.values(card.nodes).forEach((node) => {
          if (node.parentId) parented.add(node.id);
        });
        Object.values(card.frameNodes ?? {}).forEach((frame) => {
          if (frame.parentId) parented.add(frame.id);
        });
        card.rootObjectIds = Array.from(
          new Set([
            ...(card.rootObjectIds ?? []),
            ...card.nodeOrder,
            ...Object.keys(card.frameNodes ?? {}),
          ])
        ).filter((objectId) => objectIds.has(objectId) && !parented.has(objectId));
      };

      let maxDetectedEntryCount = 1;
      componentEntries.forEach((entry) => {
        const component = components[entry.componentId];
        if (!component) return;

        activeStatuses.forEach((status) => {
          const candidate = getRepresentativeCandidate(
            status,
            entry.dayKey,
            entry.candidates
          );
          if (!candidate) return;
          const state = component.states[status];
          if (!state) return;
          const card = state.card;
          const size = getNodeSize(candidate) ?? getBounds(candidate);
          if (size) {
            state.size = {
              width: round(size.width),
              height: round(size.height),
            };
            const containerTarget = ensureCardStyleRecord(card.containerStyleKey);
            if (containerTarget) {
              containerTarget.left = 0;
              containerTarget.top = 0;
              containerTarget.width = round(size.width);
              containerTarget.height = round(size.height);
            }
          }

          const backgroundNodeId = statusBackgroundNodeId[status];
          const backgroundNode = card.nodes[backgroundNodeId];
          const backgroundSourceNode = resolveCardBackgroundNode({
            candidate,
            statusValues:
              timetableStatusPlans.find((plan) => plan.status === status)?.statusValues ?? [
                status,
              ],
            mode: status,
          });
          if (backgroundNode && backgroundSourceNode) {
            applyRectToCardStyle({
              root: candidate,
              sourceNode: backgroundSourceNode,
              styleKey: backgroundNode.containerStyleKey,
              includeRotation: false,
            });
            const backgroundAssetRef = getCardBackgroundAssetRef({
              componentId: component.id,
              status,
              forceScoped: hasExplicitCardComponentGroups,
            });
            appendFigmaNodeTag({
              node: backgroundSourceNode,
              key: "asset",
              value: backgroundAssetRef.key,
            });
            backgroundNode.assetRef = backgroundAssetRef;
            backgroundNode.assetRefByDayKey = undefined;
            if (backgroundAssetRef.source === "extra") {
              const scopedAssetKey = backgroundAssetRef.key;
              if (!config.extraAssets[scopedAssetKey]) {
                config.extraAssets[scopedAssetKey] = {};
              }
              if (!config.extraAssetDimensions[scopedAssetKey]) {
                config.extraAssetDimensions[scopedAssetKey] = {};
              }
            }
            if (hasExplicitCardComponentGroups) {
              summary.applied.push(
                `timetable.card.${component.id}.${status}.backgroundAssetRef=extra`
              );
            } else {
              summary.applied.push(
                `timetable.card.${component.id}.${status}.backgroundAssetRef=${backgroundAssetRef.key}`
              );
            }
            summary.presence.cardContainer = true;
          }

          const entrySources = collectCardEntrySources({ candidate, status });
          maxDetectedEntryCount = Math.max(maxDetectedEntryCount, entrySources.length);
          const mappedDateOrDayInsideEntry = {
            streamingDate: false,
            streamingDay: false,
          };

          entrySources.forEach((entrySource) => {
            const isFrameEntry =
              !entrySource.isFallbackRoot &&
              (entrySource.node.type ?? "").toUpperCase() === "FRAME";
            const frameId = `entry-frame-${entrySource.index + 1}`;
            const frame = isFrameEntry
              ? ensureFrameNode({
                  componentId: component.id,
                  state,
                  status,
                  frameId,
                  entryIndex: entrySource.index,
                })
              : null;
            if (frame) {
              const frameTarget = ensureCardStyleRecord(frame.styleKey);
              if (frameTarget) {
                frameTarget.position = "absolute";
                frameTarget.overflow = "visible";
                applyRectToLayoutObject({
                  rect: toRelativeRect({
                    rootNode: candidate,
                    targetNode: entrySource.node,
                  }),
                  target: frameTarget,
                });
              }
            }

            const sourceNodes = resolveCardTextNodesFromCandidate({
              candidate,
              sourceNode: entrySource.node,
              status,
            });
            const positionRoot = frame ? entrySource.node : candidate;
            mapRoleNode({
              component,
              state,
              componentId: component.id,
              status,
              role: "mainTitle",
              sourceNode: sourceNodes.mainTitleContainerNode,
              positionRoot,
              frameId: frame?.id,
              entryIndex: entrySource.index,
            });
            mapRoleNode({
              component,
              state,
              componentId: component.id,
              status,
              role: "subTitle",
              sourceNode: sourceNodes.subTitleContainerNode,
              positionRoot,
              frameId: frame?.id,
              entryIndex: entrySource.index,
            });
            mapRoleNode({
              component,
              state,
              componentId: component.id,
              status,
              role: "streamingTime",
              sourceNode: sourceNodes.streamingTimeNode,
              positionRoot,
              frameId: frame?.id,
              entryIndex: entrySource.index,
            });
            if (sourceNodes.streamingDateNode) {
              mappedDateOrDayInsideEntry.streamingDate = true;
              mapRoleNode({
                component,
                state,
                componentId: component.id,
                status,
                role: "streamingDate",
                sourceNode: sourceNodes.streamingDateNode,
                positionRoot,
                frameId: frame?.id,
                entryIndex: entrySource.index,
              });
            }
            if (sourceNodes.streamingDayNode) {
              mappedDateOrDayInsideEntry.streamingDay = true;
              mapRoleNode({
                component,
                state,
                componentId: component.id,
                status,
                role: "streamingDay",
                sourceNode: sourceNodes.streamingDayNode,
                positionRoot,
                frameId: frame?.id,
                entryIndex: entrySource.index,
              });
            }
          });

          const rootSourceNodes = resolveCardTextNodesFromCandidate({
            candidate,
            status,
          });
          if (!mappedDateOrDayInsideEntry.streamingDate) {
            mapRoleNode({
              component,
              state,
              componentId: component.id,
              status,
              role: "streamingDate",
              sourceNode: rootSourceNodes.streamingDateNode,
              positionRoot: candidate,
            });
          }
          if (!mappedDateOrDayInsideEntry.streamingDay) {
            mapRoleNode({
              component,
              state,
              componentId: component.id,
              status,
              role: "streamingDay",
              sourceNode: rootSourceNodes.streamingDayNode,
              positionRoot: candidate,
            });
          }

          syncRootObjectOrder(card);
        });
      });

      if (activeStatuses.includes("multi")) {
        config.timetable.multiEntryCount = Math.max(2, maxDetectedEntryCount);
      }

      summary.applied.push(
        `timetable.card.componentsFromFigma(${componentEntries.length})`
      );
      summary.applied.push(
        `timetable.card.statusOptions(multi=${config.timetable.statusOptions.multi ? "on" : "off"},offlineMemo=${config.timetable.statusOptions.offlineMemo ? "on" : "off"})`
      );
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
        const targetKey = `${sourceKey}${suffixToken}`;
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

      const statusFromVisibilityMode = (
        visibilityMode: unknown
      ): CardTextStatus | undefined => {
        if (visibilityMode === "onlineOnly" || visibilityMode === "onlineSingleOnly") {
          return "online";
        }
        if (visibilityMode === "onlineMultipleOnly") return "multi";
        if (visibilityMode === "offlineOnly" || visibilityMode === "offlineNoMemoOnly") {
          return "offline";
        }
        if (visibilityMode === "offlineMemoOnly") return "offlineMemo";
        return undefined;
      };

      const pruneUnavailableStatusNodes = ({
        root,
        unavailableStatuses,
      }: {
        root: (typeof config.graph.nodes)[string];
        unavailableStatuses: Set<CardTextStatus>;
      }): number => {
        if (unavailableStatuses.size === 0) return 0;
        let prunedCount = 0;
        root.childIds = root.childIds.filter((childId) => {
          const childNode = config.graph.nodes[childId];
          const childStatus = statusFromVisibilityMode(childNode?.visibilityMode);
          if (!childStatus || !unavailableStatuses.has(childStatus)) {
            return true;
          }
          delete config.graph.nodes[childId];
          prunedCount += 1;
          return false;
        });
        return prunedCount;
      };

      let expectedStatusAuditRowCount = 0;
      let prunedUnavailableStatusNodeCount = 0;

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
        const availableStatuses = new Set<CardTextStatus>(
          (Object.entries(dayStatusSources) as Array<[CardTextStatus, FigmaNode | undefined]>)
            .filter((entry): entry is [CardTextStatus, FigmaNode] => Boolean(entry[1]))
            .map(([status]) => status)
        );
        const unavailableStatuses = new Set<CardTextStatus>(
          statusPlans
            .map((plan) => plan.status)
            .filter((status) => !availableStatuses.has(status))
        );
        prunedUnavailableStatusNodeCount += pruneUnavailableStatusNodes({
          root: componentRootNode,
          unavailableStatuses,
        });

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
        const activeStatusPlans = statusPlans.filter((plan) =>
          availableStatuses.has(plan.status)
        );
        expectedStatusAuditRowCount += activeStatusPlans.length;

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

        activeStatusPlans.forEach((plan) => {
          const sourceCandidate = sourceByStatus[plan.status];
          if (!sourceCandidate) return;
          const visibilityMode = visibilityModeByStatus({
            status: plan.status,
            hasMulti: hasMultiStatus,
            hasOfflineMemo: hasOfflineMemoStatus,
          });
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
            const updatedBackgroundNode = {
              ...targetBackgroundNode,
              visibilityMode,
              meta: {
                ...(targetBackgroundNode.meta ?? {}),
                importOmitted: false,
              },
            };
            if (backgroundNode) {
              const backgroundAssetRef = getCardBackgroundAssetRef({
                componentId,
                status: plan.status,
                forceScoped: hasExplicitCardComponentGroups,
              });
              appendFigmaNodeTag({
                node: backgroundNode,
                key: "asset",
                value: backgroundAssetRef.key,
              });
              updatedBackgroundNode.meta.assetRef = backgroundAssetRef;
              updatedBackgroundNode.meta.assetRefByDayKey = undefined;
              if (backgroundAssetRef.source === "extra") {
                const scopedAssetKey = backgroundAssetRef.key;
                if (!config.extraAssets[scopedAssetKey]) {
                  config.extraAssets[scopedAssetKey] = {};
                }
                if (!config.extraAssetDimensions[scopedAssetKey]) {
                  config.extraAssetDimensions[scopedAssetKey] = {};
                }
              }
              summary.applied.push(
                `graph.card.${componentId}.${plan.status}.backgroundAssetRef=${backgroundAssetRef.key}`
              );
            }
            config.graph.nodes[targetBackgroundNode.id] = updatedBackgroundNode;
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
                const wrapperTarget = wrapperStyleKey
                  ? ensureCardStyleRecord(wrapperStyleKey)
                  : undefined;
                applyFlexibleLayoutToTargets({
                  rect,
                  containerTarget,
                  ...(wrapperTarget ? { wrapperTarget } : {}),
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
      if (prunedUnavailableStatusNodeCount > 0) {
        summary.applied.push(
          `graph.card.prunedUnavailableStatusNodes(${prunedUnavailableStatusNodeCount})`
        );
      }
      const expectedRows = expectedStatusAuditRowCount;
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

    applyTimetableCardMappingsFromFigma();
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
  )}&geometry=paths`;
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
    )}&geometry=paths`;
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

const fetchExternalMemoVariantCandidates = async ({
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
  const sceneMemoNode =
    findNodeByCanonicalPath({
      rootNode,
      pathAliases: [["scene/memo", "memo", "scenememo", "weeklymemo"]],
    }) ??
    findNodeByTagOrAlias({
      nodes: flattenNodes(rootNode),
      tagValues: ["memo.background", "memo.object", "scene.memo"],
      aliases: ["scenememo", "weeklymemo", "memo"],
    });

  const memoComponentId = sceneMemoNode?.componentId?.trim();
  if (!memoComponentId) {
    return { candidates: [], warnings };
  }

  const componentMap =
    componentMapById ??
    (await fetchFigmaFileComponentMap({
      fileKey,
      figmaToken,
    }));

  const componentSetId = componentMap.get(memoComponentId)?.componentSetId?.trim();
  if (!componentSetId) {
    warnings.push("Scene/Memo componentSetId not found; memo component-set fallback skipped.");
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
    warnings.push("No memo variant components found in matched component set.");
    return { candidates: [], warnings };
  }

  const variantNodesById = await fetchFigmaNodesByIds({
    fileKey,
    nodeIds: variantComponentIds,
    figmaToken,
  });

  const candidates = Object.values(variantNodesById).filter((node) => {
    if (!getBounds(node)) return false;
    return Boolean(parseMemoVariantStateFromNode(node));
  });

  if (candidates.length === 0) {
    warnings.push("Memo component-set fallback resolved no on/off variants.");
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

const buildDetectedFeatures = ({
  summary,
  externalArtistVariantCandidates,
  externalMemoVariantCandidates,
}: {
  summary: MappingSummary;
  externalArtistVariantCandidates: FigmaNode[];
  externalMemoVariantCandidates: FigmaNode[];
}): ImportV2DetectedFeatures => {
  const artistStates = new Set(
    externalArtistVariantCandidates
      .map((candidate) => parseArtistVariantStateFromNode(candidate))
      .filter((state): state is ArtistVariantState => Boolean(state))
  );
  const memoStates = new Set(
    externalMemoVariantCandidates
      .map((candidate) => parseMemoVariantStateFromNode(candidate))
      .filter((state): state is MemoVariantState => Boolean(state))
  );
  const artistObject = summary.presence.artistObject;
  const artistOn = summary.presence.artistText || artistObject || artistStates.has("on");
  const memoOn =
    summary.presence.memoObject || summary.presence.memoText || memoStates.has("on");

  return {
    artist: {
      enabled: artistOn,
      on: artistOn,
      off: artistStates.has("off"),
      object: artistObject,
      text: summary.presence.artistText,
      profile: false,
    },
    memo: {
      enabled: memoOn,
      on: memoOn,
      off: memoStates.has("off"),
      object: summary.presence.memoObject,
      text: summary.presence.memoText,
    },
  };
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
    "frame",
    "scene.frame",
    "board",
    "scene.board",
    "artist",
  ]);

  for (const record of records) {
    const nodeId = record.node.id;
    const nodeName = record.node.name ?? "";
    if (!nodeId || !nodeName.trim()) continue;
    if (record.node.visible === false) continue;
    if (record.node.type === "TEXT") continue;
    if (record.node === rootNode) continue;

    const bounds = getBounds(record.node);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) continue;

    const explicitAssetTag = getTagValueFromRecord(record, "asset")?.trim();

    const ruleTarget = resolveAssetTargetFromRecord({
      record,
      builtinAssetKeys,
      builtinAssetKeySet,
      builtinAssetKeyLookup,
    });

    const directSlot = normalizeAssetSlot(getNodeTagValue(record.node, "slot"));
    const isRenderableAssetNode = isPotentialAssetNode(record.node);
    const isExplicitAssetContainer =
      Boolean(explicitAssetTag) ||
      Boolean(
        directSlot &&
          (ASSET_SLOT_TO_BUILTIN_KEY[directSlot] ||
            directSlot === "card.background" ||
            directSlot === "card.bg")
      ) ||
      isNamedAssetContainerCandidate(nodeName);
    if (
      !isRenderableAssetNode &&
      !(ruleTarget && isExplicitAssetContainer && isExportableAssetContainerNode(record.node))
    ) {
      continue;
    }

    summary.discovered += 1;

    if (!ruleTarget) {
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
  supabase: SupabaseAdminClient;
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
  supabase: SupabaseAdminClient;
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
    uploadAssetsWithoutWrite: rawOptions.uploadAssetsWithoutWrite === true,
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
    explicitExternalCardComponentGroups: Array.isArray(
      rawOptions.explicitExternalCardComponentGroups
    )
      ? rawOptions.explicitExternalCardComponentGroups
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

  const explicitCardComponentGroups = (
    Array.isArray(options.explicitExternalCardComponentGroups)
      ? options.explicitExternalCardComponentGroups
      : []
  )
    .map((group, index): ImportV2CardComponentGroup | null => {
      const candidates = Array.isArray(group.candidates)
        ? group.candidates.filter((candidate): candidate is FigmaNode =>
            Boolean(candidate?.id)
          )
        : [];
      if (candidates.length === 0) return null;
      const id =
        typeof group.id === "string" && group.id.trim().length > 0
          ? group.id.trim()
          : `figma-card-component-${index + 1}`;
      return {
        id,
        label:
          typeof group.label === "string" && group.label.trim().length > 0
            ? group.label.trim()
            : `Card ${index + 1}`,
        candidates,
      };
    })
    .filter((group): group is ImportV2CardComponentGroup => Boolean(group));

  let externalCardCandidates: FigmaNode[] = Array.isArray(
    options.explicitExternalCardCandidates
  )
    ? [...options.explicitExternalCardCandidates]
    : [];
  if (explicitCardComponentGroups.length > 0) {
    externalCardCandidates = [
      ...externalCardCandidates,
      ...explicitCardComponentGroups.flatMap((group) => group.candidates),
    ];
  }
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
  let externalMemoVariantCandidates: FigmaNode[] = [];
  let externalMemoWarnings: string[] = [];

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

  try {
    const externalMemoSummary = await fetchExternalMemoVariantCandidates({
      rootNode,
      fileKey,
      figmaToken,
      componentMapById,
    });
    externalMemoVariantCandidates = externalMemoSummary.candidates;
    externalMemoWarnings = externalMemoSummary.warnings;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown memo component-set fallback error";
    externalMemoWarnings = [
      ...externalMemoWarnings,
      `Memo component-set fallback failed: ${message}`,
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
    externalCardComponentGroups: explicitCardComponentGroups,
    externalArtistVariantCandidates,
    externalWarnings: [
      ...componentMapWarnings,
      ...externalCardWarnings,
      ...externalArtistWarnings,
      ...externalMemoWarnings,
    ],
    componentMapById,
  });
  applyNotApplicablePruning({
    config: baseConfig,
    summary: mappingSummary,
  });
  const detectedFeatures = buildDetectedFeatures({
    summary: mappingSummary,
    externalArtistVariantCandidates,
    externalMemoVariantCandidates,
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

  let supabase: SupabaseAdminClient | null = null;
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

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    supabase = supabaseClient;
    hasSupabaseConnection = true;

    if (typeof options.createdBy === "number" && Number.isFinite(options.createdBy)) {
      await assertCreatedByUserExists({
        supabase: supabaseClient,
        userId: options.createdBy,
      });
    }

    ensuredTemplate = await ensureTemplate({
      supabase: supabaseClient,
      options,
      resolvedTemplateName,
      resolvedTemplateDescription,
    });
  } catch (error) {
    if (options.write || options.uploadAssetsWithoutWrite) {
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
      write: options.write || (options.uploadAssetsWithoutWrite === true),
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
    supabase &&
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
      assetImportSummary,
      detectedFeatures,
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
    assetImportSummary,
    detectedFeatures,
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
