import fs from "node:fs";
import path from "node:path";

type CleanupTarget = "preview" | "assets" | "all";

type CliOptions = {
  apply: boolean;
  target: CleanupTarget;
  prefixes: string[];
  previewPrefix?: string;
  assetPrefix?: string;
  runId?: string;
  templateId?: string;
  olderThanHours: number;
  maxDelete: number;
  allowNonTestPrefix: boolean;
};

type TargetPrefix = {
  label: string;
  prefix: string;
};

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_PREVIEW_PREFIX = "uploads/dev/template-studio-preview";
const DEFAULT_ASSET_PREFIX = "template-studio/dev";
const SAFE_PREFIXES = [
  DEFAULT_PREVIEW_PREFIX,
  DEFAULT_ASSET_PREFIX,
  "uploads/test/template-studio-preview",
  "template-studio/test",
];

const printHelp = () => {
  console.log(
    [
      "Usage: npm run cleanup:template-studio:r2-assets -- [options]",
      "",
      "Default mode is dry-run. Add --apply to delete R2 objects.",
      "This script does not read or modify Supabase metadata.",
      "",
      "Options:",
      "  --apply                         Actually delete matching R2 objects",
      "  --target <preview|assets|all>    Cleanup target (default: all)",
      "  --run-id <id>                    Limit preview cleanup to one preview run folder",
      "  --template-id <id>               Limit canonical asset cleanup to one template folder",
      "  --prefix <path>                  Cleanup a custom prefix; can be repeated",
      "  --preview-prefix <path>          Preview base prefix override",
      "  --asset-prefix <path>            Canonical asset base prefix override",
      "  --older-than-hours <n>           Only include objects older than n hours (default: 0)",
      "  --max-delete <n>                 Maximum objects to delete per run (default: 1000)",
      "  --allow-non-test-prefix          Allow prefixes outside known test/dev folders",
      "  --allow-prod-prefix              Alias for --allow-non-test-prefix",
      "  --help                           Show help",
      "",
      "Default prefixes:",
      `  preview: ${DEFAULT_PREVIEW_PREFIX}`,
      `  assets:  ${DEFAULT_ASSET_PREFIX}`,
      "",
      "Examples:",
      "  npm run cleanup:template-studio:r2-assets",
      "  npm run cleanup:template-studio:r2-assets -- --apply --target preview",
      "  npm run cleanup:template-studio:r2-assets -- --apply --template-id <local-template-id>",
      "  npm run cleanup:template-studio:r2-assets -- --prefix template-studio/dev/<id>/assets --apply",
    ].join("\n"),
  );
};

const parseCliOptions = (): CliOptions => {
  const argv = process.argv.slice(2);
  const prefixes: string[] = [];
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

    if (key === "prefix") {
      prefixes.push(next);
    } else {
      argMap.set(key, next);
    }
    index += 1;
  }

  if (argMap.has("help") || argMap.has("h")) {
    printHelp();
    process.exit(0);
  }

  const targetRaw = argMap.get("target");
  const target =
    targetRaw === "preview" || targetRaw === "assets" || targetRaw === "all"
      ? targetRaw
      : "all";

  const olderThanHoursRaw = argMap.get("older-than-hours");
  const olderThanHours =
    typeof olderThanHoursRaw === "string" ? Number(olderThanHoursRaw) : 0;
  if (!Number.isFinite(olderThanHours) || olderThanHours < 0) {
    throw new Error("--older-than-hours must be a non-negative number.");
  }

  const maxDeleteRaw = argMap.get("max-delete");
  const maxDelete =
    typeof maxDeleteRaw === "string" ? Number(maxDeleteRaw) : 1000;
  if (!Number.isFinite(maxDelete) || maxDelete <= 0) {
    throw new Error("--max-delete must be a positive number.");
  }

  return {
    apply: argMap.has("apply"),
    target,
    prefixes,
    previewPrefix:
      typeof argMap.get("preview-prefix") === "string"
        ? String(argMap.get("preview-prefix"))
        : undefined,
    assetPrefix:
      typeof argMap.get("asset-prefix") === "string"
        ? String(argMap.get("asset-prefix"))
        : undefined,
    runId:
      typeof argMap.get("run-id") === "string"
        ? String(argMap.get("run-id"))
        : undefined,
    templateId:
      typeof argMap.get("template-id") === "string"
        ? String(argMap.get("template-id"))
        : undefined,
    olderThanHours,
    maxDelete: Math.trunc(maxDelete),
    allowNonTestPrefix:
      argMap.has("allow-non-test-prefix") || argMap.has("allow-prod-prefix"),
  };
};

const parseEnvFile = (content: string): Record<string, string> => {
  const parsed: Record<string, string> = {};

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex < 1) return;

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

    if (key) parsed[key] = value;
  });

  return parsed;
};

const loadEnvFiles = (): Record<string, string> => {
  const merged: Record<string, string> = {};
  [".env", ".env.local", ".envrc"].forEach((file) => {
    const envPath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(envPath)) return;
    Object.assign(merged, parseEnvFile(fs.readFileSync(envPath, "utf8")));
  });

  Object.entries(merged).forEach(([key, value]) => {
    if (!process.env[key]) process.env[key] = value;
  });

  return merged;
};

const trimSlashes = (value: string): string =>
  value.trim().replace(/^\/+|\/+$/g, "");

const withTrailingSlash = (value: string): string => {
  const trimmed = trimSlashes(value);
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

const sanitizePathSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const getEnvValue = (
  key: string,
  mergedEnv: Record<string, string>,
): string | undefined => process.env[key] || mergedEnv[key];

const resolvePreviewPrefix = (
  options: CliOptions,
  mergedEnv: Record<string, string>,
): string =>
  trimSlashes(
    options.previewPrefix ||
      getEnvValue("TEMPLATE_STUDIO_PREVIEW_R2_BASE_PREFIX", mergedEnv) ||
      DEFAULT_PREVIEW_PREFIX,
  );

const resolveAssetPrefix = (
  options: CliOptions,
  mergedEnv: Record<string, string>,
): string =>
  trimSlashes(
    options.assetPrefix ||
      getEnvValue("TEMPLATE_STUDIO_ASSET_R2_BASE_PREFIX", mergedEnv) ||
      DEFAULT_ASSET_PREFIX,
  );

const isSafeTestPrefix = (prefix: string): boolean => {
  const normalized = trimSlashes(prefix);
  return SAFE_PREFIXES.some((safePrefix) => {
    const safe = trimSlashes(safePrefix);
    return normalized === safe || normalized.startsWith(`${safe}/`);
  });
};

const assertSafePrefix = (prefix: string, allowNonTestPrefix: boolean) => {
  const normalized = trimSlashes(prefix);
  if (!normalized || normalized === "." || normalized === "/") {
    throw new Error(`Refusing to cleanup unsafe empty/root prefix: ${prefix}`);
  }

  if (normalized.split("/").length < 2) {
    throw new Error(`Refusing to cleanup overly broad prefix: ${normalized}`);
  }

  if (!allowNonTestPrefix && !isSafeTestPrefix(normalized)) {
    throw new Error(
      [
        `Refusing to cleanup non-test prefix: ${normalized}`,
        "Use --allow-non-test-prefix only when the prefix is a known test folder.",
      ].join("\n"),
    );
  }
};

const buildTargetPrefixes = (
  options: CliOptions,
  mergedEnv: Record<string, string>,
): TargetPrefix[] => {
  if (options.prefixes.length > 0) {
    return options.prefixes.map((prefix) => ({
      label: "custom",
      prefix: withTrailingSlash(prefix),
    }));
  }

  const targets: TargetPrefix[] = [];
  if (options.target === "preview" || options.target === "all") {
    const previewBase = resolvePreviewPrefix(options, mergedEnv);
    const previewPrefix = options.runId
      ? `${previewBase}/${sanitizePathSegment(options.runId)}/`
      : `${previewBase}/`;
    targets.push({
      label: "preview",
      prefix: withTrailingSlash(previewPrefix),
    });
  }

  if (options.target === "assets" || options.target === "all") {
    const assetBase = resolveAssetPrefix(options, mergedEnv);
    const assetPrefix = options.templateId
      ? `${assetBase}/${sanitizePathSegment(options.templateId)}/assets/`
      : `${assetBase}/`;
    targets.push({
      label: "assets",
      prefix: withTrailingSlash(assetPrefix),
    });
  }

  return targets;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const main = async () => {
  const options = parseCliOptions();
  const mergedEnv = loadEnvFiles();
  const targets = buildTargetPrefixes(options, mergedEnv);

  if (targets.length === 0) {
    throw new Error("No cleanup targets were resolved.");
  }

  targets.forEach((target) => {
    assertSafePrefix(target.prefix, options.allowNonTestPrefix);
  });

  const { deleteFilesFromR2, listFileObjectsFromR2Prefix } =
    await import("../src/lib/r2");
  const cutoffMs =
    options.olderThanHours > 0
      ? Date.now() - options.olderThanHours * 60 * 60 * 1000
      : null;

  console.log(
    `[template-studio:r2-cleanup] mode=${options.apply ? "apply" : "dry-run"}`,
  );
  console.log(
    `[template-studio:r2-cleanup] db=ignored target=${options.target} maxDelete=${options.maxDelete}`,
  );

  let totalMatched = 0;
  let totalDeleted = 0;
  let totalBytes = 0;

  for (const target of targets) {
    const objects = await listFileObjectsFromR2Prefix(target.prefix);
    const candidates = objects.filter((object) => {
      if (!cutoffMs) return true;
      const lastModifiedMs = object.lastModified?.getTime();
      return typeof lastModifiedMs === "number" && lastModifiedMs <= cutoffMs;
    });
    const limitedCandidates = candidates.slice(0, options.maxDelete);
    const limitedBytes = limitedCandidates.reduce(
      (sum, object) => sum + object.size,
      0,
    );

    totalMatched += candidates.length;
    totalBytes += limitedBytes;

    console.log("");
    console.log(`[${target.label}] prefix=${target.prefix}`);
    console.log(
      `[${target.label}] matched=${candidates.length} selected=${limitedCandidates.length} bytes=${formatBytes(limitedBytes)}`,
    );

    limitedCandidates.slice(0, 10).forEach((object) => {
      const modified = object.lastModified
        ? object.lastModified.toISOString()
        : "unknown";
      console.log(
        `  - ${object.key} (${formatBytes(object.size)}, ${modified})`,
      );
    });

    if (candidates.length > limitedCandidates.length) {
      console.log(
        `  ... ${candidates.length - limitedCandidates.length} more object(s) capped by --max-delete`,
      );
    }

    if (options.apply && limitedCandidates.length > 0) {
      const deleted = await deleteFilesFromR2(
        limitedCandidates.map((object) => object.key),
      );
      totalDeleted += deleted;
      console.log(`[${target.label}] deleted=${deleted}`);
    }
  }

  console.log("");
  console.log(
    `[template-studio:r2-cleanup] matched=${totalMatched} selectedBytes=${formatBytes(totalBytes)} deleted=${totalDeleted}`,
  );

  if (!options.apply) {
    console.log(
      "[template-studio:r2-cleanup] dry-run only. Add --apply to delete.",
    );
  }
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
