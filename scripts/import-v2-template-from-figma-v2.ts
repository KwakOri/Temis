import fs from "node:fs";
import path from "node:path";
import {
  collectCardComponentIdsFromTemplateRoot,
  runImportV2TemplateFromFigma,
  type FigmaNode,
} from "./import-v2-template-from-figma";
import type {
  V2TemplateRenderConfig,
  V2TemplateSharedStyleGroup,
} from "../src/types/time-table/template-render-config";

type ImportAiMode = "review" | "off" | "autofix-lite";
type CardStatus = "online" | "multi" | "offline" | "offlineMemo";
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type ValidationMode = "matrix" | "shared-status";

type CliOptions = {
  rootFigmaUrl: string;
  cardComponentSetUrl?: string;
  write: boolean;
  validateOnly: boolean;
  templateName?: string;
  templateDescription?: string;
  templateId?: string;
  public: boolean;
  configPreset?: "default" | "empty";
  source?: "publish" | "backfill" | "system";
  createdBy?: number;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  figmaToken?: string;
  withAssets: boolean;
  assetTheme?: string;
  assetFormat?: "png" | "jpg" | "svg" | "pdf";
  aiMode: ImportAiMode;
  postProcessNormalizedConfig?: (
    config: V2TemplateRenderConfig
  ) => V2TemplateRenderConfig;
};

type FigmaNodesResponse = {
  name?: string;
  nodes?: Record<string, { document?: FigmaNode }>;
};

type FigmaFileResponse = {
  components?: Record<
    string,
    {
      name?: string;
      componentSetId?: string;
    }
  >;
};

type FigmaParseResult = {
  fileKey: string;
  nodeId: string;
};

type VariantEntry = {
  nodeId: string;
  nodeName: string;
  day?: DayKey;
  status?: CardStatus;
  structureIssues: string[];
};

type ValidationResult = {
  mode: ValidationMode;
  entries: VariantEntry[];
  unresolved: VariantEntry[];
  resolvedEntries: Array<VariantEntry & { status: CardStatus; day?: DayKey }>;
  duplicatePairs: Array<{ day: DayKey; status: CardStatus; count: number; nodeIds: string[] }>;
  duplicateStatuses: Array<{ status: CardStatus; count: number; nodeIds: string[] }>;
  statusCounts: Record<CardStatus, number>;
  statusDays: Record<CardStatus, DayKey[]>;
  critical: string[];
  warnings: string[];
};

export type ImportV2FigmaAnalyzeResult = {
  rootInfo: FigmaParseResult;
  cardSetInfo: FigmaParseResult;
  cardComponentSetSource: "input" | "auto-detected";
  resolvedCardComponentSetUrl: string;
  validation: ValidationResult;
  explicitExternalCardCandidates: FigmaNode[];
};

const ROOT_DIR = path.resolve(__dirname, "..");
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const STATUS_KEYS: CardStatus[] = ["online", "multi", "offline", "offlineMemo"];

const DAY_ALIASES: Record<string, DayKey> = {
  mon: "mon",
  monday: "mon",
  월: "mon",
  월요일: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  화: "tue",
  화요일: "tue",
  wed: "wed",
  wednesday: "wed",
  수: "wed",
  수요일: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  목: "thu",
  목요일: "thu",
  fri: "fri",
  friday: "fri",
  금: "fri",
  금요일: "fri",
  sat: "sat",
  saturday: "sat",
  토: "sat",
  토요일: "sat",
  sun: "sun",
  sunday: "sun",
  일: "sun",
  일요일: "sun",
};

const STATUS_ALIASES: Record<string, CardStatus> = {
  online: "online",
  on: "online",
  live: "online",
  single: "online",
  multi: "multi",
  multiple: "multi",
  onlinemulti: "multi",
  online_multi: "multi",
  online_multiple: "multi",
  off: "offline",
  offline: "offline",
  rest: "offline",
  offlinememo: "offlineMemo",
  offline_memo: "offlineMemo",
  "offline-memo": "offlineMemo",
  memooffline: "offlineMemo",
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
    path.join(ROOT_DIR, file)
  );
  const merged: Record<string, string> = {};
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    Object.assign(merged, parseEnvFile(fs.readFileSync(envPath, "utf8")));
  }
  return merged;
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

const printHelp = () => {
  console.log(
    [
      "Usage: npm run import:v2:figma:v2 -- --root-figma-url <URL> [--card-component-set-url <URL>] [options]",
      "",
      "Required:",
      "  --root-figma-url <url>           Root scene frame URL (layout source)",
      "  --card-component-set-url <url>   Optional card component set URL override",
      "",
      "Recommended defaults:",
      "  - dry-run first (without --write)",
      "  - ai mode = review (default)",
      "",
      "Optional passthrough:",
      "  --write",
      "  --validate-only",
      "  --template-name <name>",
      "  --template-description <text>",
      "  --template-id <uuid>",
      "  --public",
      "  --config-preset <default|empty>",
      "  --source <publish|backfill|system>",
      "  --created-by <userId>",
      "  --supabase-url <url>",
      "  --supabase-service-role-key <key>",
      "  --figma-token <token>",
      "  --without-assets",
      "  --asset-theme <theme>",
      "  --asset-format <png|jpg|svg|pdf>",
      "  --ai-mode <review|off|autofix-lite>",
      "",
      "Environment fallback:",
      "  FIGMA_ACCESS_TOKEN",
      "  (.env, .env.local, .envrc are loaded automatically)",
      "",
      "Examples:",
      "  npm run import:v2:figma:v2 -- --root-figma-url '<root>'",
      "  npm run import:v2:figma:v2 -- --root-figma-url '<root>' --card-component-set-url '<cardset>' --write --template-name 'My V2'",
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

  const rootFigmaUrl = argMap.get("root-figma-url");
  const cardComponentSetUrl = argMap.get("card-component-set-url");

  if (typeof rootFigmaUrl !== "string" || rootFigmaUrl.trim().length === 0) {
    throw new Error("--root-figma-url is required.");
  }
  const aiModeRaw = argMap.get("ai-mode");
  const aiMode =
    typeof aiModeRaw === "string" && ["review", "off", "autofix-lite"].includes(aiModeRaw)
      ? (aiModeRaw as ImportAiMode)
      : "review";

  return {
    rootFigmaUrl: rootFigmaUrl.trim(),
    cardComponentSetUrl:
      typeof cardComponentSetUrl === "string" && cardComponentSetUrl.trim().length > 0
        ? cardComponentSetUrl.trim()
        : undefined,
    write: Boolean(argMap.get("write")),
    validateOnly: Boolean(argMap.get("validate-only")),
    templateName: typeof argMap.get("template-name") === "string" ? String(argMap.get("template-name")) : undefined,
    templateDescription:
      typeof argMap.get("template-description") === "string"
        ? String(argMap.get("template-description"))
        : undefined,
    templateId: typeof argMap.get("template-id") === "string" ? String(argMap.get("template-id")) : undefined,
    public: Boolean(argMap.get("public")),
    configPreset:
      argMap.get("config-preset") === "empty"
        ? "empty"
        : argMap.get("config-preset") === "default"
          ? "default"
          : undefined,
    source:
      argMap.get("source") === "publish" ||
      argMap.get("source") === "backfill" ||
      argMap.get("source") === "system"
        ? (argMap.get("source") as "publish" | "backfill" | "system")
        : undefined,
    createdBy:
      typeof argMap.get("created-by") === "string" && Number.isFinite(Number(argMap.get("created-by")))
        ? Number(argMap.get("created-by"))
        : undefined,
    supabaseUrl: typeof argMap.get("supabase-url") === "string" ? String(argMap.get("supabase-url")) : undefined,
    supabaseServiceRoleKey:
      typeof argMap.get("supabase-service-role-key") === "string"
        ? String(argMap.get("supabase-service-role-key"))
        : undefined,
    figmaToken: typeof argMap.get("figma-token") === "string" ? String(argMap.get("figma-token")) : undefined,
    withAssets: !Boolean(argMap.get("without-assets")),
    assetTheme: typeof argMap.get("asset-theme") === "string" ? String(argMap.get("asset-theme")) : undefined,
    assetFormat:
      argMap.get("asset-format") === "jpg" ||
      argMap.get("asset-format") === "svg" ||
      argMap.get("asset-format") === "pdf" ||
      argMap.get("asset-format") === "png"
        ? (argMap.get("asset-format") as "png" | "jpg" | "svg" | "pdf")
        : undefined,
    aiMode,
  };
};

const parseFigmaUrl = (url: string): FigmaParseResult => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid Figma URL: ${url}`);
  }

  const match = parsed.pathname.match(/\/design\/([^/]+)/i);
  if (!match?.[1]) {
    throw new Error(`Failed to parse fileKey from URL: ${url}`);
  }
  const fileKey = match[1];

  const nodeParam = parsed.searchParams.get("node-id");
  if (!nodeParam) {
    throw new Error(`Failed to parse node-id from URL: ${url}`);
  }

  return {
    fileKey,
    nodeId: nodeParam.replace(/-/g, ":"),
  };
};

const buildFigmaNodeUrl = ({
  fileKey,
  nodeId,
  sampleUrl,
}: {
  fileKey: string;
  nodeId: string;
  sampleUrl: string;
}): string => {
  const parsed = new URL(sampleUrl);
  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  const fileNameSegment = pathSegments[2] ?? "figma";
  const nextUrl = new URL(`/design/${fileKey}/${fileNameSegment}`, parsed.origin);
  nextUrl.searchParams.set("node-id", nodeId.replace(/:/g, "-"));
  return nextUrl.toString();
};

const normalizeToken = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9가-힣_-]+/g, "");

const parseNodeNameTags = (value: string): Record<string, string> => {
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
  return tags;
};

const getNodeTagValue = (node: FigmaNode | undefined, key: string): string | undefined => {
  if (!node?.name) return undefined;
  const normalizedKey = key.trim().toLowerCase();
  if (!normalizedKey) return undefined;
  return parseNodeNameTags(node.name)[normalizedKey];
};

const hasNodeTagValue = ({
  node,
  key,
  values,
}: {
  node: FigmaNode | undefined;
  key: string;
  values: readonly string[];
}): boolean => {
  const rawValue = getNodeTagValue(node, key);
  if (!rawValue) return false;
  const normalizedValue = normalizeToken(rawValue);
  return values.some((value) => normalizedValue === normalizeToken(value));
};

const subtreeHasTagValue = ({
  rootNode,
  key,
  values,
}: {
  rootNode: FigmaNode | undefined;
  key: string;
  values: readonly string[];
}): boolean => {
  if (!rootNode) return false;
  if (hasNodeTagValue({ node: rootNode, key, values })) return true;
  const children = Array.isArray(rootNode.children) ? rootNode.children : [];
  return children.some((child) =>
    subtreeHasTagValue({
      rootNode: child,
      key,
      values,
    })
  );
};

const collectOfflineMemoStructureIssues = (variantNode: FigmaNode): string[] => {
  const rootChildren = Array.isArray(variantNode.children) ? variantNode.children : [];
  const hasRootLevelOfflineMemo = rootChildren.some((child) => {
    if (hasNodeTagValue({ node: child, key: "slot", values: ["card.entry"] })) {
      return false;
    }
    return (
      subtreeHasTagValue({
        rootNode: child,
        key: "bind",
        values: ["card.offlineMemo"],
      }) ||
      subtreeHasTagValue({
        rootNode: child,
        key: "key",
        values: ["card.offlineMemo"],
      }) ||
      subtreeHasTagValue({
        rootNode: child,
        key: "slot",
        values: ["card.offlineMemo", "card.offline_memo"],
      })
    );
  });

  const hasLegacyEntryScopedOfflineMemo =
    subtreeHasTagValue({
      rootNode: variantNode,
      key: "bind",
      values: ["entry.offlineMemo"],
    }) ||
    subtreeHasTagValue({
      rootNode: variantNode,
      key: "key",
      values: ["entry.offlineMemo"],
    });

  const issues: string[] = [];
  if (!hasRootLevelOfflineMemo) {
    issues.push("offlineMemo node must be a direct child of the status root with bind=card.offlineMemo");
  }
  if (hasLegacyEntryScopedOfflineMemo) {
    issues.push("legacy entry.offlineMemo binding is not supported");
  }
  return issues;
};

const parseDay = (value: string | undefined): DayKey | undefined => {
  if (!value) return undefined;
  const normalized = normalizeToken(value);
  if (DAY_ALIASES[normalized]) return DAY_ALIASES[normalized];
  const byName = value.match(/day\s*=\s*([a-zA-Z가-힣]+)/i)?.[1];
  if (!byName) return undefined;
  const normalizedByName = normalizeToken(byName);
  return DAY_ALIASES[normalizedByName];
};

const parseStatus = (value: string | undefined): CardStatus | undefined => {
  if (!value) return undefined;
  const normalized = normalizeToken(value);
  if (STATUS_ALIASES[normalized]) return STATUS_ALIASES[normalized];
  const byName =
    value.match(/status\s*=\s*([a-zA-Z_-]+)/i)?.[1] ??
    value.match(/state\s*=\s*([a-zA-Z_-]+)/i)?.[1] ??
    value.match(/mode\s*=\s*([a-zA-Z_-]+)/i)?.[1];
  if (!byName) return undefined;
  const normalizedByName = normalizeToken(byName);
  return STATUS_ALIASES[normalizedByName];
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
  const requestUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeIds.join(","))}`;
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
  const result: Record<string, FigmaNode> = {};
  Object.entries(payload.nodes ?? {}).forEach(([nodeId, entry]) => {
    if (!nodeId || !entry?.document) return;
    result[nodeId] = entry.document;
  });
  return result;
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
  const componentMap = new Map<string, { name: string; componentSetId?: string }>();
  Object.entries(payload.components ?? {}).forEach(([componentId, component]) => {
    if (!componentId) return;
    componentMap.set(componentId, {
      name: component.name ?? "",
      ...(typeof component.componentSetId === "string" && component.componentSetId.trim().length > 0
        ? { componentSetId: component.componentSetId.trim() }
        : {}),
    });
  });
  return componentMap;
};

const flattenFigmaNodes = (rootNode: FigmaNode): FigmaNode[] => {
  const queue = [rootNode];
  const nodes: FigmaNode[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    nodes.push(current);
    if (Array.isArray(current.children) && current.children.length > 0) {
      queue.push(...current.children);
    }
  }
  return nodes;
};

const normalizeNodeName = (value: string | undefined): string => {
  return (value ?? "").trim().toLowerCase();
};

const collectGridInstanceComponentIds = (rootNode: FigmaNode): string[] => {
  const gridNode = flattenFigmaNodes(rootNode).find((node) => {
    const normalizedName = normalizeNodeName(node.name);
    return normalizedName === "scene/grid" || normalizedName === "grid";
  });
  if (!gridNode) return [];

  return flattenFigmaNodes(gridNode)
    .filter((node) => node.type === "INSTANCE")
    .map((node) => node.componentId?.trim() ?? "")
    .filter((componentId) => componentId.length > 0);
};

const resolveCardSetInfo = async ({
  rootInfo,
  rootFigmaUrl,
  rootNode,
  figmaToken,
  providedCardComponentSetUrl,
}: {
  rootInfo: FigmaParseResult;
  rootFigmaUrl: string;
  rootNode: FigmaNode;
  figmaToken: string;
  providedCardComponentSetUrl?: string;
}): Promise<{
  cardSetInfo: FigmaParseResult;
  cardComponentSetSource: "input" | "auto-detected";
  resolvedCardComponentSetUrl: string;
  warnings: string[];
}> => {
  if (
    typeof providedCardComponentSetUrl === "string" &&
    providedCardComponentSetUrl.trim().length > 0
  ) {
    const cardSetInfo = parseFigmaUrl(providedCardComponentSetUrl);
    if (rootInfo.fileKey !== cardSetInfo.fileKey) {
      throw new Error(
        `root/card component set fileKey mismatch: root=${rootInfo.fileKey}, cardSet=${cardSetInfo.fileKey}`
      );
    }
    return {
      cardSetInfo,
      cardComponentSetSource: "input",
      resolvedCardComponentSetUrl: providedCardComponentSetUrl.trim(),
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const prioritizedComponentIds = collectGridInstanceComponentIds(rootNode);
  const fallbackComponentIds = collectCardComponentIdsFromTemplateRoot(rootNode);
  const cardComponentIds =
    prioritizedComponentIds.length > 0 ? prioritizedComponentIds : fallbackComponentIds;

  if (prioritizedComponentIds.length === 0 && fallbackComponentIds.length > 0) {
    warnings.push(
      "Scene/Grid card instances were not found by name, so card component-set detection used a broader root scan."
    );
  }

  if (cardComponentIds.length === 0) {
    throw new Error(
      "카드 컴포넌트셋을 자동 검출하지 못했습니다. root에 Scene/Grid 카드 인스턴스를 배치하거나 카드 컴포넌트셋 링크를 직접 입력해주세요."
    );
  }

  const componentMap = await fetchFigmaFileComponentMap({
    fileKey: rootInfo.fileKey,
    figmaToken,
  });

  const countsByComponentSetId = new Map<
    string,
    { count: number; componentIds: Set<string> }
  >();
  cardComponentIds.forEach((componentId) => {
    const componentSetId = componentMap.get(componentId)?.componentSetId?.trim();
    if (!componentSetId) return;
    const current = countsByComponentSetId.get(componentSetId) ?? {
      count: 0,
      componentIds: new Set<string>(),
    };
    current.count += 1;
    current.componentIds.add(componentId);
    countsByComponentSetId.set(componentSetId, current);
  });

  const rankedCandidates = Array.from(countsByComponentSetId.entries()).sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return a[0].localeCompare(b[0]);
  });

  if (rankedCandidates.length === 0) {
    throw new Error(
      "카드 인스턴스에서 componentSetId를 찾지 못했습니다. 카드 컴포넌트셋 링크를 직접 입력해주세요."
    );
  }

  if (
    rankedCandidates.length > 1 &&
    rankedCandidates[0]?.[1].count === rankedCandidates[1]?.[1].count
  ) {
    const candidateIds = rankedCandidates.map(([componentSetId]) => componentSetId).join(", ");
    throw new Error(
      `카드 컴포넌트셋 후보가 여러 개라 자동 선택할 수 없습니다: ${candidateIds}. 카드 컴포넌트셋 링크를 직접 입력해주세요.`
    );
  }

  const [componentSetId, match] = rankedCandidates[0];
  const resolvedCardComponentSetUrl = buildFigmaNodeUrl({
    fileKey: rootInfo.fileKey,
    nodeId: componentSetId,
    sampleUrl: rootFigmaUrl,
  });

  warnings.push(
    `카드 컴포넌트셋을 root 인스턴스에서 자동 검출했습니다 (componentSetId=${componentSetId}, instances=${match.count}).`
  );

  return {
    cardSetInfo: {
      fileKey: rootInfo.fileKey,
      nodeId: componentSetId,
    },
    cardComponentSetSource: "auto-detected",
    resolvedCardComponentSetUrl,
    warnings,
  };
};

const collectVariantEntries = ({
  componentSetNode,
  fetchedNodesById,
}: {
  componentSetNode: FigmaNode;
  fetchedNodesById: Record<string, FigmaNode>;
}): VariantEntry[] => {
  const children = Array.isArray(componentSetNode.children) ? componentSetNode.children : [];

  const entries: VariantEntry[] = children
    .map((child): VariantEntry | null => {
      const nodeId = child.id?.trim();
      if (!nodeId) return null;
      const fullNode = fetchedNodesById[nodeId] ?? child;
      const props = fullNode.variantProperties ?? {};
      const day =
        parseDay(props.day) ??
        parseDay(props.Day) ??
        parseDay(fullNode.name);
      const status =
        parseStatus(props.status) ??
        parseStatus(props.Status) ??
        parseStatus(props.state) ??
        parseStatus(props.mode) ??
        parseStatus(fullNode.name);

      return {
        nodeId,
        nodeName: fullNode.name ?? child.name ?? "(unnamed)",
        day,
        status,
        structureIssues:
          status === "offlineMemo" ? collectOfflineMemoStructureIssues(fullNode) : [],
      };
    })
    .filter((entry): entry is VariantEntry => Boolean(entry));

  return entries;
};

const validateMatrix = (entries: VariantEntry[]): ValidationResult => {
  const unresolved = entries.filter((entry) => !entry.day || !entry.status);
  const resolved = entries.filter(
    (entry): entry is VariantEntry & { day: DayKey; status: CardStatus } =>
      Boolean(entry.day && entry.status)
  );

  const pairMap = new Map<string, { day: DayKey; status: CardStatus; nodeIds: string[] }>();
  for (const entry of resolved) {
    const key = `${entry.day}::${entry.status}`;
    const prev = pairMap.get(key);
    if (!prev) {
      pairMap.set(key, { day: entry.day, status: entry.status, nodeIds: [entry.nodeId] });
    } else {
      prev.nodeIds.push(entry.nodeId);
      pairMap.set(key, prev);
    }
  }

  const duplicatePairs = Array.from(pairMap.values())
    .filter((row) => row.nodeIds.length > 1)
    .map((row) => ({ ...row, count: row.nodeIds.length }));

  const statusToDaySet: Record<CardStatus, Set<DayKey>> = {
    online: new Set<DayKey>(),
    multi: new Set<DayKey>(),
    offline: new Set<DayKey>(),
    offlineMemo: new Set<DayKey>(),
  };
  for (const entry of resolved) {
    statusToDaySet[entry.status].add(entry.day);
  }

  const statusCounts: Record<CardStatus, number> = {
    online: statusToDaySet.online.size,
    multi: statusToDaySet.multi.size,
    offline: statusToDaySet.offline.size,
    offlineMemo: statusToDaySet.offlineMemo.size,
  };

  const statusDays: Record<CardStatus, DayKey[]> = {
    online: Array.from(statusToDaySet.online.values()).sort(),
    multi: Array.from(statusToDaySet.multi.values()).sort(),
    offline: Array.from(statusToDaySet.offline.values()).sort(),
    offlineMemo: Array.from(statusToDaySet.offlineMemo.values()).sort(),
  };

  const critical: string[] = [];
  const warnings: string[] = [];

  if (unresolved.length > 0) {
    warnings.push(`Unresolved variants found: ${unresolved.length}`);
  }
  if (duplicatePairs.length > 0) {
    critical.push(`Duplicate day/status variants found: ${duplicatePairs.length}`);
  }

  if (statusCounts.online !== 7) {
    critical.push(`online must be exactly 7 variants (actual=${statusCounts.online})`);
  }
  if (statusCounts.offline !== 7) {
    critical.push(`offline must be exactly 7 variants (actual=${statusCounts.offline})`);
  }
  if (statusCounts.multi !== 0 && statusCounts.multi !== 7) {
    critical.push(`multi must be 0 or 7 variants (actual=${statusCounts.multi})`);
  }
  if (statusCounts.offlineMemo !== 0 && statusCounts.offlineMemo !== 7) {
    critical.push(`offlineMemo must be 0 or 7 variants (actual=${statusCounts.offlineMemo})`);
  }
  entries.forEach((entry) => {
    entry.structureIssues.forEach((issue) => {
      critical.push(`${entry.nodeId}: ${issue}`);
    });
  });

  return {
    mode: "matrix",
    entries,
    unresolved,
    resolvedEntries: resolved,
    duplicatePairs,
    duplicateStatuses: [],
    statusCounts,
    statusDays,
    critical,
    warnings,
  };
};

const validateSharedStatus = (entries: VariantEntry[]): ValidationResult => {
  const unresolved = entries.filter((entry) => !entry.status);
  const resolved = entries.filter(
    (entry): entry is VariantEntry & { status: CardStatus; day?: DayKey } =>
      Boolean(entry.status)
  );

  const statusMap = new Map<CardStatus, { status: CardStatus; nodeIds: string[] }>();
  resolved.forEach((entry) => {
    const current = statusMap.get(entry.status) ?? {
      status: entry.status,
      nodeIds: [],
    };
    current.nodeIds.push(entry.nodeId);
    statusMap.set(entry.status, current);
  });

  const duplicateStatuses = Array.from(statusMap.values())
    .filter((row) => row.nodeIds.length > 1)
    .map((row) => ({ ...row, count: row.nodeIds.length }));

  const statusDays: Record<CardStatus, DayKey[]> = {
    online: Array.from(
      new Set(
        resolved
          .filter((entry) => entry.status === "online" && entry.day)
          .map((entry) => entry.day as DayKey)
      )
    ).sort(),
    multi: Array.from(
      new Set(
        resolved
          .filter((entry) => entry.status === "multi" && entry.day)
          .map((entry) => entry.day as DayKey)
      )
    ).sort(),
    offline: Array.from(
      new Set(
        resolved
          .filter((entry) => entry.status === "offline" && entry.day)
          .map((entry) => entry.day as DayKey)
      )
    ).sort(),
    offlineMemo: Array.from(
      new Set(
        resolved
          .filter((entry) => entry.status === "offlineMemo" && entry.day)
          .map((entry) => entry.day as DayKey)
      )
    ).sort(),
  };

  const statusCounts: Record<CardStatus, number> = {
    online: resolved.filter((entry) => entry.status === "online").length,
    multi: resolved.filter((entry) => entry.status === "multi").length,
    offline: resolved.filter((entry) => entry.status === "offline").length,
    offlineMemo: resolved.filter((entry) => entry.status === "offlineMemo").length,
  };

  const critical: string[] = [];
  const warnings: string[] = [];
  if (unresolved.length > 0) {
    warnings.push(`Unresolved variants found: ${unresolved.length}`);
  }
  if (duplicateStatuses.length > 0) {
    critical.push(`Duplicate status variants found: ${duplicateStatuses.length}`);
  }
  if (statusCounts.online !== 1) {
    critical.push(`online must be exactly 1 shared variant (actual=${statusCounts.online})`);
  }
  if (statusCounts.offline !== 1) {
    critical.push(`offline must be exactly 1 shared variant (actual=${statusCounts.offline})`);
  }
  if (statusCounts.multi !== 0 && statusCounts.multi !== 1) {
    critical.push(`multi must be 0 or 1 shared variants (actual=${statusCounts.multi})`);
  }
  if (statusCounts.offlineMemo !== 0 && statusCounts.offlineMemo !== 1) {
    critical.push(
      `offlineMemo must be 0 or 1 shared variants (actual=${statusCounts.offlineMemo})`
    );
  }
  entries.forEach((entry) => {
    entry.structureIssues.forEach((issue) => {
      critical.push(`${entry.nodeId}: ${issue}`);
    });
  });

  return {
    mode: "shared-status",
    entries,
    unresolved,
    resolvedEntries: resolved,
    duplicatePairs: [],
    duplicateStatuses,
    statusCounts,
    statusDays,
    critical,
    warnings,
  };
};

const validateCardComponentSet = (entries: VariantEntry[]): ValidationResult => {
  const matrixResult = validateMatrix(entries);
  if (matrixResult.critical.length === 0) {
    return matrixResult;
  }

  const sharedStatusResult = validateSharedStatus(entries);
  if (sharedStatusResult.critical.length === 0) {
    return sharedStatusResult;
  }

  return {
    ...matrixResult,
    critical: [
      ...new Set([
        "card component set does not match matrix mode or shared-status mode",
        ...matrixResult.critical,
        ...sharedStatusResult.critical,
      ]),
    ],
    warnings: [...new Set([...matrixResult.warnings, ...sharedStatusResult.warnings])],
  };
};

const printValidationSummary = ({
  rootInfo,
  cardSetInfo,
  cardComponentSetSource,
  result,
  aiMode,
}: {
  rootInfo: FigmaParseResult;
  cardSetInfo: FigmaParseResult;
  cardComponentSetSource: "input" | "auto-detected";
  result: ValidationResult;
  aiMode: ImportAiMode;
}) => {
  console.log(`[import:v2:figma:v2] root=${rootInfo.fileKey}:${rootInfo.nodeId}`);
  console.log(
    `[import:v2:figma:v2] cardSet=${cardSetInfo.fileKey}:${cardSetInfo.nodeId} source=${cardComponentSetSource}`
  );
  console.log(`[import:v2:figma:v2] ai-mode=${aiMode}`);
  console.log(`[import:v2:figma:v2] mode=${result.mode}`);
  console.log("[import:v2:figma:v2] status counts:");
  STATUS_KEYS.forEach((status) => {
    console.log(
      `  - ${status}: ${result.statusCounts[status]} [${result.statusDays[status].join(",") || "(none)"}]`
    );
  });

  if (result.duplicatePairs.length > 0) {
    console.log("[import:v2:figma:v2] duplicate day/status:");
    result.duplicatePairs.forEach((row) => {
      console.log(`  - ${row.day}/${row.status}: count=${row.count}, nodes=${row.nodeIds.join(",")}`);
    });
  }
  if (result.duplicateStatuses.length > 0) {
    console.log("[import:v2:figma:v2] duplicate statuses:");
    result.duplicateStatuses.forEach((row) => {
      console.log(`  - ${row.status}: count=${row.count}, nodes=${row.nodeIds.join(",")}`);
    });
  }

  if (result.unresolved.length > 0) {
    console.log("[import:v2:figma:v2] unresolved variants:");
    result.unresolved.forEach((entry) => {
      console.log(
        `  - ${entry.nodeId}: ${entry.nodeName} (day=${entry.day ?? "?"}, status=${entry.status ?? "?"})`
      );
    });
  }

  result.warnings.forEach((warning) => {
    console.log(`[import:v2:figma:v2] warning: ${warning}`);
  });
  result.critical.forEach((critical) => {
    console.log(`[import:v2:figma:v2] critical: ${critical}`);
  });
};

const cloneFigmaNode = (node: FigmaNode): FigmaNode =>
  JSON.parse(JSON.stringify(node)) as FigmaNode;

const buildSyntheticSharedStatusCandidates = ({
  validation,
  nodesById,
}: {
  validation: ValidationResult;
  nodesById: Record<string, FigmaNode>;
}): FigmaNode[] => {
  if (validation.mode !== "shared-status") {
    return validation.resolvedEntries
      .filter((entry): entry is VariantEntry & { day: DayKey; status: CardStatus } =>
        Boolean(entry.day && entry.status)
      )
      .map((entry) => nodesById[entry.nodeId])
      .filter((node): node is FigmaNode => Boolean(node));
  }

  const syntheticCandidates: FigmaNode[] = [];
  validation.resolvedEntries.forEach((entry) => {
    const sourceNode = nodesById[entry.nodeId];
    if (!sourceNode || !entry.status) return;
    DAY_KEYS.forEach((dayKey) => {
      const clonedNode = cloneFigmaNode(sourceNode);
      const baseName = sourceNode.name?.trim() || entry.nodeName;
      clonedNode.id = `${entry.nodeId}::shared-status::${entry.status}::${dayKey}`;
      clonedNode.name = `${baseName} [day=${dayKey}] [status=${entry.status}]`;
      clonedNode.variantProperties = {
        ...(sourceNode.variantProperties ?? {}),
        day: dayKey,
        Day: dayKey,
        status: entry.status,
        Status: entry.status,
      };
      syntheticCandidates.push(clonedNode);
    });
  });
  return syntheticCandidates;
};

const SHARED_STATUS_SECTION_DAY_REPLACE_REGEX =
  /(^|[_-])(mon|tue|wed|thu|fri|sat|sun)(?=([_-]|$))/gi;
const SHARED_STATUS_SECTION_DAY_TEST_REGEX =
  /(^|[_-])(mon|tue|wed|thu|fri|sat|sun)(?=([_-]|$))/i;
const SHARED_STATUS_TOKEN_REGEX =
  /(^|[_-])(online|multi|offlinememo|offline)(?=([_-]|$))/i;

const normalizeSharedStatusSectionKey = (sectionKey: string): string =>
  sectionKey.replace(
    SHARED_STATUS_SECTION_DAY_REPLACE_REGEX,
    (_match, prefix: string, _day: string) => `${prefix}DAY`
  );

const buildSharedStyleGroups = (
  config: V2TemplateRenderConfig
): Record<string, V2TemplateSharedStyleGroup> => {
  const groupsById = new Map<string, Set<string>>();
  Object.values(config.graph.nodes ?? {}).forEach((node) => {
    const styleRefs = node.styles;
    if (!styleRefs) return;
    [
      styleRefs.containerStyleKey,
      styleRefs.textStyleKey,
      styleRefs.wrapperStyleKey,
      styleRefs.optionsKey,
    ].forEach((sectionKey) => {
      if (typeof sectionKey !== "string" || sectionKey.trim().length === 0) return;
      if (!SHARED_STATUS_SECTION_DAY_TEST_REGEX.test(sectionKey)) return;
      const statusMatch = sectionKey.match(SHARED_STATUS_TOKEN_REGEX);
      if (!statusMatch?.[2]) return;
      const normalizedKey = normalizeSharedStatusSectionKey(sectionKey);
      if (normalizedKey === sectionKey) return;
      const groupId = `shared-status:${statusMatch[2].toLowerCase()}:${normalizedKey}`;
      const members = groupsById.get(groupId) ?? new Set<string>();
      members.add(sectionKey);
      groupsById.set(groupId, members);
    });
  });

  const entries = Array.from(groupsById.entries()).reduce<
    Array<[string, V2TemplateSharedStyleGroup]>
  >((accumulator, [groupId, members]) => {
    const group: V2TemplateSharedStyleGroup = {
      memberSectionKeys: Array.from(members).sort(),
      mode: "sync-all",
    };
    if (group.memberSectionKeys.length > 1) {
      accumulator.push([groupId, group]);
    }
    return accumulator;
  }, []);

  return Object.fromEntries(entries);
};

export const analyzeImportV2TemplateFromFigmaV2 = async (
  options: Pick<CliOptions, "rootFigmaUrl" | "cardComponentSetUrl" | "figmaToken">
): Promise<ImportV2FigmaAnalyzeResult> => {
  const loadedEnv = loadEnvFiles();
  hydrateProcessEnvFromLoaded(loadedEnv, [
    "FIGMA_ACCESS_TOKEN",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  const rootInfo = parseFigmaUrl(options.rootFigmaUrl);

  const figmaToken = options.figmaToken || process.env.FIGMA_ACCESS_TOKEN;
  if (!figmaToken) {
    throw new Error("FIGMA_ACCESS_TOKEN is required (or pass --figma-token).");
  }

  const fetchedRoot = await fetchFigmaNodesByIds({
    fileKey: rootInfo.fileKey,
    nodeIds: [rootInfo.nodeId],
    figmaToken,
  });
  if (!fetchedRoot[rootInfo.nodeId]) {
    throw new Error(`Root frame not found: ${rootInfo.nodeId}`);
  }
  const rootNode = fetchedRoot[rootInfo.nodeId];

  const cardSetResolution = await resolveCardSetInfo({
    rootInfo,
    rootFigmaUrl: options.rootFigmaUrl,
    rootNode,
    figmaToken,
    providedCardComponentSetUrl: options.cardComponentSetUrl,
  });
  const {
    cardSetInfo,
    cardComponentSetSource,
    resolvedCardComponentSetUrl,
    warnings: cardSetWarnings,
  } = cardSetResolution;

  const fetchedSet = await fetchFigmaNodesByIds({
    fileKey: cardSetInfo.fileKey,
    nodeIds: [cardSetInfo.nodeId],
    figmaToken,
  });

  const componentSetNode = fetchedSet[cardSetInfo.nodeId];
  if (!componentSetNode) {
    throw new Error(`Card component set node not found: ${cardSetInfo.nodeId}`);
  }

  if ((componentSetNode.type ?? "").toUpperCase() !== "COMPONENT_SET") {
    throw new Error(
      `card-component-set-url must target COMPONENT_SET (actual=${componentSetNode.type ?? "unknown"})`
    );
  }

  const childIds = (componentSetNode.children ?? [])
    .map((child) => child.id?.trim())
    .filter((id): id is string => Boolean(id));

  const childNodesById = childIds.length
    ? await fetchFigmaNodesByIds({
        fileKey: cardSetInfo.fileKey,
        nodeIds: childIds,
        figmaToken,
      })
    : {};

  const entries = collectVariantEntries({
    componentSetNode,
    fetchedNodesById: childNodesById,
  });

  const validation = validateCardComponentSet(entries);
  const mergedValidation: ValidationResult = {
    ...validation,
    warnings: [...new Set([...cardSetWarnings, ...validation.warnings])],
  };
  const explicitExternalCardCandidates = buildSyntheticSharedStatusCandidates({
    validation: mergedValidation,
    nodesById: childNodesById,
  });

  return {
    rootInfo,
    cardSetInfo,
    cardComponentSetSource,
    resolvedCardComponentSetUrl,
    validation: mergedValidation,
    explicitExternalCardCandidates,
  };
};

export const runImportV2TemplateFromFigmaV2 = async (
  options: CliOptions
) => {
  const analysis = await analyzeImportV2TemplateFromFigmaV2({
    rootFigmaUrl: options.rootFigmaUrl,
    cardComponentSetUrl: options.cardComponentSetUrl,
    figmaToken: options.figmaToken,
  });
  const { rootInfo, cardSetInfo, validation, explicitExternalCardCandidates } =
    analysis;

  printValidationSummary({
    rootInfo,
    cardSetInfo,
    cardComponentSetSource: analysis.cardComponentSetSource,
    result: validation,
    aiMode: options.aiMode,
  });

  if (options.aiMode === "autofix-lite") {
    console.log(
      "[import:v2:figma:v2] note: autofix-lite is reserved for low-risk normalization only. Structural auto-fix is disabled in this phase."
    );
  }

  if (validation.critical.length > 0) {
    throw new Error(
      `[import:v2:figma:v2] validation failed with ${validation.critical.length} critical issue(s). write/import aborted.`
    );
  }

  if (options.validateOnly) {
    console.log("[import:v2:figma:v2] validate-only complete. Skipping legacy importer execution.");
    return {
      ...analysis,
      importResult: null,
    };
  }

  console.log(
    `[import:v2:figma:v2] executing core importer with validated component-set candidates (${explicitExternalCardCandidates.length}) ...`
  );

  const importResult = await runImportV2TemplateFromFigma({
    figmaUrl: options.rootFigmaUrl,
    templateName: options.templateName,
    templateDescription: options.templateDescription,
    templateId: options.templateId,
    write: options.write,
    public: options.public,
    configPreset: options.configPreset ?? "default",
    source: options.source ?? "system",
    createdBy: options.createdBy,
    supabaseUrl: options.supabaseUrl,
    supabaseServiceRoleKey: options.supabaseServiceRoleKey,
    figmaToken: options.figmaToken,
    withAssets: options.withAssets,
    assetTheme: options.assetTheme ?? "first",
    assetFormat: options.assetFormat ?? "png",
    noAiAssetMatch: options.aiMode === "off",
    explicitExternalCardCandidates,
    skipExternalCardVariantAutodiscovery: true,
    postProcessNormalizedConfig: (config) => {
      const withSharedGroups =
        validation.mode === "shared-status"
          ? {
              ...config,
              sharedStyleGroups: buildSharedStyleGroups(config),
            }
          : config;
      return typeof options.postProcessNormalizedConfig === "function"
        ? options.postProcessNormalizedConfig(withSharedGroups)
        : withSharedGroups;
    },
  });

  return {
    ...analysis,
    importResult,
  };
};

const run = async () => {
  const options = parseCliOptions();
  await runImportV2TemplateFromFigmaV2(options);
};

if (require.main === module) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[import:v2:figma:v2] failed: ${message}`);
    process.exit(1);
  });
}
