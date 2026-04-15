import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { v2_createDefaultTemplateRenderConfig, v2_createEmptyTemplateRenderConfig, v2_normalizeTemplateRenderConfig } from "../src/utils/v2/template-render-config";
import { v2_graphRemoveNodeSubtree } from "../src/utils/v2/template-graph-editor";

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
};

type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
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
      "",
      "Environment fallback:",
      "  FIGMA_ACCESS_TOKEN",
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

const canonicalName = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

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
}: {
  rootNode: FigmaNode;
  config: ReturnType<typeof v2_createDefaultTemplateRenderConfig>;
}): MappingSummary => {
  const summary: MappingSummary = {
    applied: [],
    warnings: [],
    notApplicable: [],
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
    cardOfflineBackground: [
      "offlinebackground",
      "imageofflinebackground",
      "cardofflinebackground",
      "offline",
    ],
    cardSharedBackground: [
      "cardbackground",
      "componentinstancecardbackground",
      "imagecardbackground",
      "background",
    ],
  } as const;

  const scoreCardContainerCandidate = (candidate: FigmaNode): number => {
    const nodes = flattenNodes(candidate);
    let score = 0;
    if (findFirstByNames(nodes, alias.mainTitleContainer)) score += 4;
    if (findFirstByNames(nodes, alias.subTitleContainer)) score += 4;
    if (findFirstByNames(nodes, alias.streamingTime)) score += 3;
    if (findFirstByNames(nodes, alias.streamingDate)) score += 2;
    if (findFirstByNames(nodes, alias.streamingDay)) score += 2;
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

  const gridNode = findFirstByNames(allNodes, alias.grid);
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

  const weekFlagNode = findFirstByNames(allNodes, alias.weekFlag);
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

  const topObjectNode = findFirstByNames(allNodes, alias.topObject);
  summary.presence.topObject = Boolean(topObjectNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: topObjectNode }),
    target: config.layout.topObjectContainer as unknown as Record<string, unknown>,
  });
  if (topObjectNode) {
    summary.applied.push("layout.topObjectContainer");
  }

  const memoContainerNode = findFirstByNames(allNodes, alias.memoContainer);
  summary.presence.memoObject = Boolean(memoContainerNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: memoContainerNode }),
    target: config.layout.scene.memoContainer as unknown as Record<string, unknown>,
  });
  if (memoContainerNode) {
    summary.applied.push("layout.scene.memoContainer");
  }

  const memoContentNode = findFirstByNames(allNodes, alias.memoContentContainer);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: memoContentNode }),
    target: config.layout.scene.memoContentContainer as unknown as Record<string, unknown>,
  });
  if (memoContentNode) {
    summary.applied.push("layout.scene.memoContentContainer");
  }

  const memoTextContainerNode = findFirstByNames(allNodes, alias.memoTextContainer);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: memoTextContainerNode }),
    target: config.layout.scene.memoTextContainer as unknown as Record<string, unknown>,
  });
  if (memoTextContainerNode) {
    summary.applied.push("layout.scene.memoTextContainer");
  }

  const memoTextNode = findFirstByNames(allNodes, alias.memoText);
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

  const profileImageNode = findFirstByNames(allNodes, alias.profileImage);
  summary.presence.profileImage = Boolean(profileImageNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: profileImageNode }),
    target: config.layout.profileImage as unknown as Record<string, unknown>,
  });
  if (profileImageNode) {
    summary.applied.push("layout.profileImage");
  }

  const profileFrameNode = findFirstByNames(allNodes, alias.profileFrame);
  summary.presence.profileFrame = Boolean(profileFrameNode);
  applyRectToLayoutObject({
    rect: toRelativeRect({ rootNode, targetNode: profileFrameNode }),
    target: config.layout.profileFrame as unknown as Record<string, unknown>,
  });
  if (profileFrameNode) {
    summary.applied.push("layout.profileFrame");
  }

  const artistObjectNode = findFirstByNames(allNodes, alias.artistObject);
  summary.presence.artistObject = Boolean(artistObjectNode);

  const profileTextNode = findFirstByNames(allNodes, alias.profileText);
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
  if (gridNode) {
    const gridDescendants = flattenNodes(gridNode);
    const cardMatchesInGrid = findMatchesByNames(gridDescendants, alias.cardContainer);
    cardContainerNode = selectBestCardContainerCandidate({
      candidates: cardMatchesInGrid,
      source: "grid descendants",
    });
  }
  if (!cardContainerNode) {
    const cardMatchesGlobal = findMatchesByNames(allNodes, alias.cardContainer);
    cardContainerNode = selectBestCardContainerCandidate({
      candidates: cardMatchesGlobal,
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
    // Card container is rendered inside each grid slot.
    // Store it in local card coordinates (0,0 + own size), not scene-root coordinates.
    applyRectToLayoutObject({
      rect: toRelativeRect({ rootNode: cardContainerNode, targetNode: cardContainerNode }),
      target: config.layout.card.container as unknown as Record<string, unknown>,
    });
    summary.applied.push("layout.card.container");

    const cardNodes = flattenNodes(cardContainerNode);
    const onlineBackgroundNode =
      findFirstByNames(cardNodes, alias.cardOnlineBackground) ??
      findFirstByNames(cardNodes, alias.cardSharedBackground);
    const offlineBackgroundNode =
      findFirstByNames(cardNodes, alias.cardOfflineBackground) ??
      findFirstByNames(cardNodes, alias.cardSharedBackground);

    applyRectToLayoutObject({
      rect: toRelativeRect({ rootNode: cardContainerNode, targetNode: onlineBackgroundNode }),
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
      rect: toRelativeRect({ rootNode: cardContainerNode, targetNode: offlineBackgroundNode }),
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

    const mainTitleContainerNode = findFirstByNames(cardNodes, alias.mainTitleContainer);
    const subTitleContainerNode = findFirstByNames(cardNodes, alias.subTitleContainer);
    const streamingTimeNode = findFirstByNames(cardNodes, alias.streamingTime);
    const streamingDateNode = findFirstByNames(cardNodes, alias.streamingDate);
    const streamingDayNode = findFirstByNames(cardNodes, alias.streamingDay);
    summary.presence.cardMainTitle = Boolean(mainTitleContainerNode);
    summary.presence.cardSubTitle = Boolean(subTitleContainerNode);
    summary.presence.cardStreamingTime = Boolean(streamingTimeNode);
    summary.presence.cardStreamingDate = Boolean(streamingDateNode);
    summary.presence.cardStreamingDay = Boolean(streamingDayNode);

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

  const baseConfig =
    options.configPreset === "empty"
      ? v2_createEmptyTemplateRenderConfig()
      : v2_createDefaultTemplateRenderConfig();

  const mappingSummary = applyLayoutMappingsFromFigma({
    rootNode,
    config: baseConfig,
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

  const normalizedConfig = v2_normalizeTemplateRenderConfig(baseConfig);
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
  ];
  summaryLines.forEach((line) => console.log(line));

  if (mappingSummary.applied.length > 0) {
    console.log(`[import:v2:figma] mapping keys: ${mappingSummary.applied.join(", ")}`);
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
