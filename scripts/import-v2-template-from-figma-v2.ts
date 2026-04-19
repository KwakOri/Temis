import fs from "node:fs";
import path from "node:path";
import {
  runImportV2TemplateFromFigma,
  type FigmaNode,
} from "./import-v2-template-from-figma";

type ImportAiMode = "review" | "off" | "autofix-lite";
type CardStatus = "online" | "multi" | "offline" | "offlineMemo";
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type CliOptions = {
  rootFigmaUrl: string;
  cardComponentSetUrl: string;
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
};

type FigmaNodesResponse = {
  name?: string;
  nodes?: Record<string, { document?: FigmaNode }>;
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

type MatrixValidationResult = {
  entries: VariantEntry[];
  unresolved: VariantEntry[];
  duplicatePairs: Array<{ day: DayKey; status: CardStatus; count: number; nodeIds: string[] }>;
  statusCounts: Record<CardStatus, number>;
  statusDays: Record<CardStatus, DayKey[]>;
  critical: string[];
  warnings: string[];
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
      "Usage: npm run import:v2:figma:v2 -- --root-figma-url <URL> --card-component-set-url <URL> [options]",
      "",
      "Required:",
      "  --root-figma-url <url>           Root scene frame URL (layout source)",
      "  --card-component-set-url <url>   Card component set URL (card source of truth)",
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
      "  npm run import:v2:figma:v2 -- --root-figma-url '<root>' --card-component-set-url '<cardset>'",
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
  if (typeof cardComponentSetUrl !== "string" || cardComponentSetUrl.trim().length === 0) {
    throw new Error("--card-component-set-url is required.");
  }

  const aiModeRaw = argMap.get("ai-mode");
  const aiMode =
    typeof aiModeRaw === "string" && ["review", "off", "autofix-lite"].includes(aiModeRaw)
      ? (aiModeRaw as ImportAiMode)
      : "review";

  return {
    rootFigmaUrl: rootFigmaUrl.trim(),
    cardComponentSetUrl: cardComponentSetUrl.trim(),
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

const validateMatrix = (entries: VariantEntry[]): MatrixValidationResult => {
  const unresolved = entries.filter((entry) => !entry.day || !entry.status);
  const resolved = entries.filter((entry): entry is VariantEntry & { day: DayKey; status: CardStatus } =>
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
    entries,
    unresolved,
    duplicatePairs,
    statusCounts,
    statusDays,
    critical,
    warnings,
  };
};

const printValidationSummary = ({
  rootInfo,
  cardSetInfo,
  result,
  aiMode,
}: {
  rootInfo: FigmaParseResult;
  cardSetInfo: FigmaParseResult;
  result: MatrixValidationResult;
  aiMode: ImportAiMode;
}) => {
  console.log(`[import:v2:figma:v2] root=${rootInfo.fileKey}:${rootInfo.nodeId}`);
  console.log(`[import:v2:figma:v2] cardSet=${cardSetInfo.fileKey}:${cardSetInfo.nodeId}`);
  console.log(`[import:v2:figma:v2] ai-mode=${aiMode}`);
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

  if (result.unresolved.length > 0) {
    console.log("[import:v2:figma:v2] unresolved variants (day/status parse failed):");
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

const run = async () => {
  const options = parseCliOptions();
  const loadedEnv = loadEnvFiles();
  hydrateProcessEnvFromLoaded(loadedEnv, [
    "FIGMA_ACCESS_TOKEN",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  const rootInfo = parseFigmaUrl(options.rootFigmaUrl);
  const cardSetInfo = parseFigmaUrl(options.cardComponentSetUrl);

  if (rootInfo.fileKey !== cardSetInfo.fileKey) {
    throw new Error(
      `root/card component set fileKey mismatch: root=${rootInfo.fileKey}, cardSet=${cardSetInfo.fileKey}`
    );
  }

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

  const validation = validateMatrix(entries);
  printValidationSummary({
    rootInfo,
    cardSetInfo,
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
    return;
  }

  const explicitExternalCardCandidates = validation.entries
    .filter(
      (
        entry
      ): entry is VariantEntry & {
        day: DayKey;
        status: CardStatus;
      } => Boolean(entry.day && entry.status)
    )
    .map((entry) => childNodesById[entry.nodeId])
    .filter((node): node is FigmaNode => Boolean(node));

  console.log(
    `[import:v2:figma:v2] executing core importer with validated component-set candidates (${explicitExternalCardCandidates.length}) ...`
  );

  await runImportV2TemplateFromFigma({
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
  });
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[import:v2:figma:v2] failed: ${message}`);
  process.exit(1);
});
