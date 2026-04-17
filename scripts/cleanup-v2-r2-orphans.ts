import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveV2AssetUploadBasePrefix } from "../src/utils/v2/r2-upload-prefix";

type CliOptions = {
  apply: boolean;
  prefix?: string;
  templateId?: string;
  olderThanHours: number;
  maxDelete: number;
  allowProdPrefix: boolean;
  withoutDrafts: boolean;
  withoutRevisions: boolean;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
};

type R2Object = {
  key: string;
  lastModified?: Date;
  size: number;
};

const ROOT_DIR = path.resolve(__dirname, "..");

const printHelp = () => {
  console.log(
    [
      "Usage: npm run cleanup:v2:r2-orphans -- [options]",
      "",
      "Default mode is dry-run (no deletion).",
      "",
      "Options:",
      "  --apply                           Actually delete orphan files",
      "  --prefix <path>                   Target prefix (default: env-aware v2 prefix)",
      "  --template-id <uuid>              Limit cleanup to one template subfolder",
      "  --older-than-hours <n>            Delete only files older than n hours (default: 24)",
      "  --max-delete <n>                  Maximum files to delete per run (default: 500)",
      "  --allow-prod-prefix               Allow deletion on non-dev prefix",
      "  --without-drafts                  Exclude v2 draft configs from reference scan",
      "  --without-revisions               Exclude v2 revision configs from reference scan",
      "  --supabase-url <url>              Supabase URL override",
      "  --supabase-service-role-key <key> Supabase service role key override",
      "  --help                            Show help",
      "",
      "Environment fallback:",
      "  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL",
      "  SUPABASE_SERVICE_ROLE_KEY",
      "  CLOUDFLARE_R2_ENDPOINT",
      "  CLOUDFLARE_R2_ACCESS_KEY_ID",
      "  CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      "  CLOUDFLARE_R2_BUCKET_NAME",
      "  V2_R2_UPLOAD_BASE_PREFIX",
      "",
      "Examples:",
      "  npm run cleanup:v2:r2-orphans -- --dry-run",
      "  npm run cleanup:v2:r2-orphans -- --template-id 57c08176-7bbe-4006-a112-03529e3a83d9",
      "  npm run cleanup:v2:r2-orphans -- --apply --older-than-hours 12 --max-delete 200",
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

  const olderThanHoursRaw = argMap.get("older-than-hours");
  const olderThanHours =
    typeof olderThanHoursRaw === "string" ? Number(olderThanHoursRaw) : 24;
  if (!Number.isFinite(olderThanHours) || olderThanHours < 0) {
    throw new Error("--older-than-hours must be a non-negative number.");
  }

  const maxDeleteRaw = argMap.get("max-delete");
  const maxDelete = typeof maxDeleteRaw === "string" ? Number(maxDeleteRaw) : 500;
  if (!Number.isFinite(maxDelete) || maxDelete <= 0) {
    throw new Error("--max-delete must be a positive number.");
  }

  return {
    apply: argMap.has("apply"),
    prefix: typeof argMap.get("prefix") === "string" ? String(argMap.get("prefix")).trim() : undefined,
    templateId:
      typeof argMap.get("template-id") === "string"
        ? String(argMap.get("template-id")).trim()
        : undefined,
    olderThanHours,
    maxDelete: Math.trunc(maxDelete),
    allowProdPrefix: argMap.has("allow-prod-prefix"),
    withoutDrafts: argMap.has("without-drafts"),
    withoutRevisions: argMap.has("without-revisions"),
    supabaseUrl:
      typeof argMap.get("supabase-url") === "string"
        ? String(argMap.get("supabase-url")).trim()
        : undefined,
    supabaseServiceRoleKey:
      typeof argMap.get("supabase-service-role-key") === "string"
        ? String(argMap.get("supabase-service-role-key")).trim()
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
    path.join(ROOT_DIR, file)
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
    const raw = execSync(`supabase status -o env --workdir "${ROOT_DIR}"`, {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return parseSimpleEnvOutput(raw);
  } catch {
    return {};
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

  const processPairCandidates: Array<{ url?: string; key?: string }> = [
    {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      url: mergedEnv.SUPABASE_URL,
      key: mergedEnv.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      url: mergedEnv.NEXT_PUBLIC_SUPABASE_URL,
      key: mergedEnv.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      url: statusEnv.API_URL,
      key: statusEnv.SERVICE_ROLE_KEY,
    },
  ];

  const resolvedPair = processPairCandidates.find(
    (candidate) => candidate.url && candidate.key
  );
  if (!resolvedPair?.url || !resolvedPair.key) {
    throw new Error(
      "Unable to resolve Supabase URL/service role key. Set env vars or pass explicit options."
    );
  }

  return {
    supabaseUrl: resolvedPair.url,
    supabaseServiceRoleKey: resolvedPair.key,
  };
};

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");

const sanitizePathSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const collectThemeMapUrls = (candidate: unknown, collector: Set<string>) => {
  if (!isRecord(candidate)) return;
  Object.values(candidate).forEach((value) => {
    if (typeof value === "string" && value.trim().length > 0) {
      collector.add(value.trim());
    }
  });
};

const collectUrlsFromRenderConfig = (renderConfig: unknown): Set<string> => {
  const urls = new Set<string>();
  if (!isRecord(renderConfig)) return urls;

  if (isRecord(renderConfig.assets)) {
    Object.values(renderConfig.assets).forEach((themeMapCandidate) => {
      collectThemeMapUrls(themeMapCandidate, urls);
    });
  }

  if (isRecord(renderConfig.extraAssets)) {
    Object.values(renderConfig.extraAssets).forEach((themeMapCandidate) => {
      collectThemeMapUrls(themeMapCandidate, urls);
    });
  }

  return urls;
};

const extractFileKeyFromRef = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;

  const normalizePath = (input: string): string | null => {
    const noQuery = input.split("?")[0]?.split("#")[0] ?? input;
    const decoded = decodeURIComponent(noQuery).replace(/^\/+/, "");
    const uploadIndex = decoded.indexOf("uploads/");
    if (uploadIndex >= 0) {
      return decoded.slice(uploadIndex);
    }
    return decoded.length > 0 ? decoded : null;
  };

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      return normalizePath(parsed.pathname);
    } catch {
      return null;
    }
  }

  return normalizePath(trimmed);
};

const listR2Objects = async ({
  client,
  bucket,
  prefix,
}: {
  client: S3Client;
  bucket: string;
  prefix: string;
}): Promise<R2Object[]> => {
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;

  while (true) {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const contents = response.Contents ?? [];
    for (const item of contents) {
      if (!item.Key) continue;
      objects.push({
        key: item.Key,
        lastModified: item.LastModified,
        size: Number(item.Size ?? 0),
      });
    }

    if (!response.IsTruncated || !response.NextContinuationToken) break;
    continuationToken = response.NextContinuationToken;
  }

  return objects;
};

const deleteR2Keys = async ({
  client,
  bucket,
  keys,
}: {
  client: S3Client;
  bucket: string;
  keys: string[];
}): Promise<{ deleted: number; errors: number }> => {
  if (keys.length === 0) return { deleted: 0, errors: 0 };

  let deletedCount = 0;
  let errorCount = 0;

  const chunkSize = 1000;
  for (let index = 0; index < keys.length; index += chunkSize) {
    const chunk = keys.slice(index, index + chunkSize);
    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
          Quiet: true,
        },
      })
    );

    deletedCount += response.Deleted?.length ?? 0;
    errorCount += response.Errors?.length ?? 0;
  }

  return { deleted: deletedCount, errors: errorCount };
};

const fetchRenderConfigs = async ({
  supabase,
  tableName,
  templateId,
}: {
  supabase: any;
  tableName:
    | "v2_template_render_configs"
    | "v2_template_render_config_drafts"
    | "v2_template_render_config_revisions";
  templateId?: string;
}): Promise<unknown[]> => {
  const renderConfigs: unknown[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from(tableName)
      .select("render_config")
      .range(from, from + pageSize - 1);

    if (templateId) {
      query = query.eq("template_id", templateId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }

    data.forEach((row: { render_config: unknown }) => {
      renderConfigs.push(row.render_config);
    });

    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return renderConfigs;
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

  const { supabaseUrl, supabaseServiceRoleKey } = resolveSupabaseConnection({
    options,
    mergedEnv,
  });

  const r2Endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT || mergedEnv.CLOUDFLARE_R2_ENDPOINT;
  const r2AccessKeyId =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || mergedEnv.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    mergedEnv.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const r2BucketName =
    process.env.CLOUDFLARE_R2_BUCKET_NAME || mergedEnv.CLOUDFLARE_R2_BUCKET_NAME;

  if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
    throw new Error(
      "R2 env vars are required: CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME."
    );
  }

  const defaultBasePrefix = resolveV2AssetUploadBasePrefix({
    explicitPrefix: mergedEnv.V2_R2_UPLOAD_BASE_PREFIX,
    nodeEnv: process.env.NODE_ENV ?? mergedEnv.NODE_ENV,
    appEnv: process.env.APP_ENV ?? mergedEnv.APP_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? mergedEnv.VERCEL_ENV,
  });

  const selectedPrefixBase = trimSlashes(options.prefix ?? defaultBasePrefix);
  const selectedPrefix = options.templateId
    ? `${selectedPrefixBase}/${sanitizePathSegment(options.templateId)}`
    : selectedPrefixBase;

  const isDevPrefix = selectedPrefix.includes("/dev/") || selectedPrefix.startsWith("uploads/dev/");
  if (options.apply && !isDevPrefix && !options.allowProdPrefix) {
    throw new Error(
      `Refusing to delete on non-dev prefix "${selectedPrefix}". Add --allow-prod-prefix if intentional.`
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const activeConfigs = await fetchRenderConfigs({
    supabase,
    tableName: "v2_template_render_configs",
    templateId: options.templateId,
  });
  const draftConfigs = options.withoutDrafts
    ? []
    : await fetchRenderConfigs({
        supabase,
        tableName: "v2_template_render_config_drafts",
        templateId: options.templateId,
      });
  const revisionConfigs = options.withoutRevisions
    ? []
    : await fetchRenderConfigs({
        supabase,
        tableName: "v2_template_render_config_revisions",
        templateId: options.templateId,
      });

  const referencedFileKeys = new Set<string>();
  [...activeConfigs, ...draftConfigs, ...revisionConfigs].forEach((renderConfig) => {
    collectUrlsFromRenderConfig(renderConfig).forEach((ref) => {
      const fileKey = extractFileKeyFromRef(ref);
      if (!fileKey) return;
      if (!fileKey.startsWith("uploads/")) return;
      referencedFileKeys.add(fileKey);
    });
  });

  const r2Client = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  const allObjects = await listR2Objects({
    client: r2Client,
    bucket: r2BucketName,
    prefix: selectedPrefix,
  });

  const cutoffMs =
    options.olderThanHours > 0
      ? Date.now() - options.olderThanHours * 60 * 60 * 1000
      : 0;

  const orphanCandidates = allObjects.filter((object) => {
    if (referencedFileKeys.has(object.key)) return false;
    if (cutoffMs > 0 && object.lastModified) {
      return object.lastModified.getTime() <= cutoffMs;
    }
    return cutoffMs === 0;
  });

  const toDelete = orphanCandidates.slice(0, options.maxDelete);
  const skippedByLimit = Math.max(0, orphanCandidates.length - toDelete.length);

  console.log(
    [
      `[cleanup:v2:r2] mode=${options.apply ? "apply" : "dry-run"}`,
      `[cleanup:v2:r2] prefix=${selectedPrefix}`,
      `[cleanup:v2:r2] db refs=${referencedFileKeys.size}`,
      `[cleanup:v2:r2] r2 objects=${allObjects.length}`,
      `[cleanup:v2:r2] orphan candidates=${orphanCandidates.length}`,
      `[cleanup:v2:r2] delete target=${toDelete.length}${skippedByLimit > 0 ? ` (limited, ${skippedByLimit} skipped)` : ""}`,
    ].join("\n")
  );

  if (toDelete.length > 0) {
    const preview = toDelete.slice(0, 20).map((item) => item.key);
    console.log("[cleanup:v2:r2] preview:");
    preview.forEach((key) => console.log(`  - ${key}`));
    if (toDelete.length > preview.length) {
      console.log(`  ... and ${toDelete.length - preview.length} more`);
    }
  }

  if (!options.apply) {
    console.log("[cleanup:v2:r2] dry-run complete. Add --apply to delete.");
    return;
  }

  const deletion = await deleteR2Keys({
    client: r2Client,
    bucket: r2BucketName,
    keys: toDelete.map((item) => item.key),
  });

  console.log(
    `[cleanup:v2:r2] delete complete: deleted=${deletion.deleted}, errors=${deletion.errors}`
  );
};

run().catch((error) => {
  console.error("[cleanup:v2:r2] failed:", error);
  process.exit(1);
});
