import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

type PreviewAssetSupabaseClient = {
  from(table: string): PreviewAssetQueryBuilder;
};

type PreviewAssetQueryBuilder = PromiseLike<{
  data: unknown[] | null;
  error: Error | null;
}> & {
  delete(): PreviewAssetQueryBuilder;
  eq(column: string, value: unknown): PreviewAssetQueryBuilder;
  insert(value: unknown): PromiseLike<{ error: Error | null }>;
  select(columns?: string): PreviewAssetQueryBuilder;
};

const ONE_BY_ONE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
};

const parseEnvOutput = (value: string): Record<string, string> => {
  const env: Record<string, string> = {};

  value.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    const separatorIndex = trimmed.indexOf("=");
    if (!trimmed || separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key) return;

    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  });

  return env;
};

const applyLocalSupabaseEnv = () => {
  const currentUrl = process.env.SUPABASE_URL ?? "";
  if (
    currentUrl.startsWith("http://127.0.0.1:") ||
    currentUrl.startsWith("http://localhost:")
  ) {
    return;
  }

  const statusOutput = execFileSync(
    "supabase",
    ["status", "-o", "env", "--workdir", process.cwd()],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  const statusEnv = parseEnvOutput(statusOutput);
  const localApiUrl = statusEnv.API_URL ?? statusEnv.KONG_URL;
  const localSecretKey = statusEnv.SECRET_KEY;

  if (localApiUrl) {
    process.env.SUPABASE_URL = localApiUrl;
  }

  if (localSecretKey) {
    process.env.SUPABASE_SECRET_KEY = localSecretKey;
  }
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";

  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error(
      "Refusing to run preview asset check against a non-local Supabase URL.",
    );
  }
};

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");

const getPreviewAssetBasePrefix = (): string =>
  process.env.TEMPLATE_STUDIO_PREVIEW_R2_BASE_PREFIX ||
  "uploads/dev/template-studio-preview";

const main = async () => {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  applyLocalSupabaseEnv();
  assertLocalSupabaseUrl();

  const [
    { uploadFileToR2, listFileKeysFromR2Prefix, deleteFilesFromR2Prefix },
  ] = await Promise.all([import("../src/lib/r2")]);
  const { supabaseAdminServer } =
    await import("../src/lib/supabase-admin-server");
  const supabase = supabaseAdminServer as unknown as PreviewAssetSupabaseClient;

  const runId = `check-${Date.now().toString(36)}`;
  const previewId = "preview";
  const prefix = `${trimSlashes(getPreviewAssetBasePrefix())}/${runId}/`;
  const folder = `${prefix}${previewId}`;
  let uploadedFileKey: string | null = null;

  try {
    const uploaded = await uploadFileToR2(
      ONE_BY_ONE_PNG,
      "preview-check.png",
      "image/png",
      folder,
    );
    uploadedFileKey = uploaded.fileKey;

    const insertResult = await supabase
      .from("template_studio_preview_assets")
      .insert({
        run_id: runId,
        preview_id: previewId,
        file_key: uploaded.fileKey,
        url: uploaded.url,
        source: "script-check",
        mime_type: "image/png",
        byte_size: ONE_BY_ONE_PNG.byteLength,
      });

    if (insertResult.error) {
      throw insertResult.error;
    }

    const keysAfterUpload = await listFileKeysFromR2Prefix(prefix);
    assert(
      keysAfterUpload.includes(uploaded.fileKey),
      "Uploaded R2 object was not found by preview run prefix.",
    );

    const deletedCount = await deleteFilesFromR2Prefix(prefix);
    assert(deletedCount >= 1, "Preview run prefix cleanup deleted no objects.");

    const deleteResult = await supabase
      .from("template_studio_preview_assets")
      .delete()
      .eq("run_id", runId);
    if (deleteResult.error) {
      throw deleteResult.error;
    }

    const keysAfterCleanup = await listFileKeysFromR2Prefix(prefix);
    assert(
      keysAfterCleanup.length === 0,
      "Preview run prefix still has R2 objects after cleanup.",
    );

    const rowsAfterCleanup = await supabase
      .from("template_studio_preview_assets")
      .select("id")
      .eq("run_id", runId);
    if (rowsAfterCleanup.error) {
      throw rowsAfterCleanup.error;
    }
    assert(
      (rowsAfterCleanup.data ?? []).length === 0,
      "Preview asset registry still has rows after cleanup.",
    );

    uploadedFileKey = null;
    console.log(`Template Studio preview asset check passed. runId=${runId}`);
  } finally {
    await deleteFilesFromR2Prefix(prefix).catch(() => null);
    try {
      await supabase
        .from("template_studio_preview_assets")
        .delete()
        .eq("run_id", runId);
    } catch {
      // Best effort cleanup for the verification helper.
    }

    if (uploadedFileKey) {
      console.warn(
        `Preview asset check cleanup attempted for runId=${runId}. fileKey=${uploadedFileKey}`,
      );
    }
  }
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
