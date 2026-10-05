import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import {
  createLegacyAssetInventory,
  OWNER_KINDS,
  type OwnerKind,
  type CatalogEntry,
  type InventoryAsset,
} from "./lib/legacy-template-asset-inventory";
import {
  legacyAssetStoragePath,
  parseLegacyAssetUpload,
} from "../src/utils/legacy-template-assets/contracts";
import { downloadFileFromR2, uploadFileToR2Key } from "../src/lib/r2";
import {
  createProjectAssetTemplates,
  type ManagedInventoryTemplate,
} from "./lib/project-asset-inventory";
import { TRUSTED_CALENDAR_SVG_HASH } from "../src/utils/legacy-template-assets/project-assets";

const args = process.argv.slice(2);
const value = (flag: string) => args[args.indexOf(flag) + 1];
const known = new Set([
  "--owner-kind",
  "--template-id",
  "--apply",
  "--all",
  "--reviewed",
  "--activate",
  "--env-dir",
  "--catalog",
  "--skip-blocked",
  "--concurrency",
  "--selection",
  "--project-assets",
]);
for (let i = 0; i < args.length; i++) {
  if (!known.has(args[i])) throw new Error("알 수 없는 인수입니다.");
  if (
    [
      "--owner-kind",
      "--template-id",
      "--env-dir",
      "--catalog",
      "--concurrency",
      "--selection",
    ].includes(args[i])
  ) {
    if (!args[i + 1] || args[i + 1].startsWith("--"))
      throw new Error("인수 값이 필요합니다.");
    i++;
  }
}
const kind = args.includes("--owner-kind")
  ? (value("--owner-kind") as OwnerKind)
  : undefined;
const templateId = args.includes("--template-id")
  ? value("--template-id")
  : undefined;
if (kind && !OWNER_KINDS.includes(kind))
  throw new Error("유효한 owner-kind가 필요합니다.");
if (
  args.includes("--apply") &&
  !(kind && templateId) &&
  !args.includes("--all")
)
  throw new Error("실제 이관은 종류와 ID 또는 --all을 명시해야 합니다.");
const root = path.resolve(__dirname, "..");
const concurrency = args.includes("--concurrency")
  ? Number(value("--concurrency"))
  : 1;
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
  throw new Error("concurrency는 1~4여야 합니다.");
const catalog: CatalogEntry[] | undefined = args.includes("--catalog")
  ? JSON.parse(readFileSync(value("--catalog"), "utf8"))
  : undefined;
if (
  args.includes("--catalog") &&
  (!Array.isArray(catalog) ||
    !catalog.every(
      (row) =>
        OWNER_KINDS.includes(row.ownerKind) &&
        typeof row.templateId === "string",
    ))
)
  throw new Error("유효한 catalog가 필요합니다.");
const inventory = createLegacyAssetInventory(root, {
  ownerKind: kind,
  templateId,
  catalog,
});
const selection: CatalogEntry[] | undefined = args.includes("--selection")
  ? JSON.parse(readFileSync(value("--selection"), "utf8"))
  : undefined;
if (
  args.includes("--selection") &&
  (!Array.isArray(selection) ||
    !selection.length ||
    !selection.every((row) =>
      inventory.templates.some(
        (t) => t.ownerKind === row.ownerKind && t.templateId === row.templateId,
      ),
    ))
)
  throw new Error("selection에는 조사된 템플릿 ID만 지정해야 합니다.");
if (
  args.includes("--project-assets") &&
  (!args.includes("--all") ||
    kind ||
    templateId ||
    selection ||
    args.includes("--activate"))
)
  throw new Error(
    "공통/대표 이미지 이관은 단독 --project-assets --all로 실행하며 활성화하지 않습니다.",
  );
const templates: ManagedInventoryTemplate[] = args.includes("--project-assets")
  ? createProjectAssetTemplates(root, inventory)
  : selection
    ? inventory.templates.filter((t) =>
        selection.some(
          (row) =>
            row.ownerKind === t.ownerKind && row.templateId === t.templateId,
        ),
      )
    : inventory.templates;
if ((kind || templateId) && !inventory.templates.length)
  throw new Error("일치하는 템플릿이 없습니다.");
const columns = {
  timetable: "template_id",
  team_timetable: "team_template_id",
  thumbnail: "thumbnail_id",
  site: "site_key",
};
const parents = {
  timetable: "templates",
  team_timetable: "team_templates",
  thumbnail: "thumbnails",
};
async function main() {
  if (!args.includes("--apply")) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          summary: inventory.summary,
          selectedTemplates: templates.length,
          selectedAssets: templates.reduce(
            (total, item) => total + item.assets.length,
            0,
          ),
          templates: templates.map((item) => ({
            ownerKind: item.ownerKind,
            templateId: item.templateId,
            purpose: item.purpose ?? "runtime",
            issues: item.issues,
            slots: Object.values(item.bindings).reduce(
              (sum, slots) => sum + Object.keys(slots).length,
              0,
            ),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (
    templates.some((template) =>
      template.assets.some((asset) => asset.sourceRemoved),
    )
  ) {
    throw new Error(
      "로컬 원본이 제거된 템플릿은 재이관할 수 없습니다. 원본을 복구하거나 관리자 이미지 교체를 사용해 주세요.",
    );
  }
  if (args.includes("--env-dir"))
    loadEnvConfig(path.resolve(value("--env-dir")), true, {
      info: () => {},
      error: () => {},
    });
  const environment = process.env.LEGACY_TEMPLATE_ASSET_ENV;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!environment || !url || !key?.startsWith("sb_secret_"))
    throw new Error("DB와 에셋 환경 설정이 필요합니다.");
  const host = new URL(url).hostname;
  if (
    !["localhost", "127.0.0.1", "ajlgjdwkjyayrnocdfpj.supabase.co"].includes(
      host,
    )
  )
    throw new Error("Temis 또는 로컬 DB에서만 이관할 수 있습니다.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let failures = 0;
  let completed = 0;
  let skipped = 0;
  for (const template of templates) {
    if (
      args.includes("--skip-blocked") &&
      template.issues.some((issue) => issue.code !== "UNBOUND_IMAGE")
    ) {
      skipped++;
      console.log(
        `${template.ownerKind}/${template.templateId}: 조사 경고로 보류`,
      );
      continue;
    }
    try {
      const referenced = new Set(
        Object.values(template.bindings).flatMap((slots) =>
          Object.values(slots),
        ),
      );
      if (
        template.issues.some((issue) => issue.code !== "UNBOUND_IMAGE") &&
        !args.includes("--reviewed")
      )
        throw new Error(
          "에셋 조사 경고를 검토한 뒤 --reviewed로 다시 실행해 주세요.",
        );
      const assets = template.assets.filter(
        (asset) => asset.exists && !asset.readError,
      );
      if (
        [...referenced].some(
          (id) => !assets.some((asset) => asset.assetId === id),
        )
      )
        throw new Error("슬롯에서 사용하는 파일이 누락되었습니다.");
      if (template.ownerKind !== "site") {
        let parentQuery = client
          .from(parents[template.ownerKind])
          .select("id")
          .eq("id", template.templateId);
        if (template.ownerKind === "timetable")
          parentQuery = parentQuery.eq("template_engine", "legacy");
        const parent = await parentQuery.maybeSingle();
        if (parent.error || !parent.data)
          throw new Error("연결할 부모 템플릿이 없습니다.");
      }
      const expected = Object.fromEntries(
        Object.entries(template.bindings).map(([theme, slots]) => [
          theme,
          Object.keys(slots),
        ]),
      );
      const column = columns[template.ownerKind];
      let set = await client
        .from("legacy_template_asset_sets")
        .select("*")
        .eq(column, template.templateId)
        .eq("purpose", template.purpose ?? "runtime")
        .maybeSingle();
      if (set.error) throw new Error("에셋 스키마를 조회하지 못했습니다.");
      if (set.data?.active_revision_id) {
        skipped++;
        console.log(
          `${template.ownerKind}/${template.templateId}: 기존 이력 유지 (건너뜀)`,
        );
        continue;
      }
      if (!set.data) {
        const created = await client
          .from("legacy_template_asset_sets")
          .insert({
            [column]: template.templateId,
            purpose: template.purpose ?? "runtime",
            expected_slots: expected,
          })
          .select("*")
          .single();
        if (created.error?.code === "23505")
          set = await client
            .from("legacy_template_asset_sets")
            .select("*")
            .eq(column, template.templateId)
            .eq("purpose", template.purpose ?? "runtime")
            .maybeSingle();
        else set = created;
      }
      if (set.error || !set.data)
        throw new Error("에셋 세트를 생성하지 못했습니다.");
      if (set.data.active_revision_id) {
        skipped++;
        continue;
      }
      if (
        JSON.stringify(set.data.expected_slots) !== JSON.stringify(expected)
      ) {
        const sorted = (object: Record<string, string[]>) =>
          JSON.stringify(
            Object.entries(object)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([theme, keys]) => [theme, [...keys].sort()]),
          );
        if (sorted(set.data.expected_slots) !== sorted(expected))
          throw new Error("기존 슬롯 계약과 현재 코드가 다릅니다.");
      }
      const versionIds = new Map<string, string>();
      const processAsset = async (asset: InventoryAsset) => {
        const trustedSvg =
          template.ownerKind === "site" &&
          asset.file === "public/images/calendar.svg" &&
          asset.contentHash === TRUSTED_CALENDAR_SVG_HASH;
        const upload = parseLegacyAssetUpload({
          assetId: asset.assetId,
          contentHash: asset.contentHash,
          mimeType: trustedSvg ? "image/png" : asset.mimeType,
          byteSize: asset.byteSize,
          originalFilename: asset.originalFilename,
        });
        const canonicalPath = legacyAssetStoragePath(
          template,
          environment,
          upload,
        );
        const storagePath = trustedSvg
          ? canonicalPath.replace(/\.png$/, ".svg")
          : canonicalPath;
        const bytes = readFileSync(path.join(root, asset.file));
        if (
          !asset.width ||
          !asset.height ||
          asset.width * asset.height > 80_000_000 ||
          createHash("sha256").update(bytes).digest("hex") !== asset.contentHash
        )
          throw new Error(
            "조사 이후 이미지가 변경되었거나 해상도가 유효하지 않습니다.",
          );
        let version = await client
          .from("legacy_template_asset_versions")
          .select("id")
          .eq("asset_set_id", set.data.id)
          .eq("asset_id", asset.assetId)
          .eq("content_hash", asset.contentHash)
          .maybeSingle();
        if (version.error) throw new Error("버전을 조회하지 못했습니다.");
        if (!version.data) {
          await uploadFileToR2Key(bytes, storagePath, asset.mimeType);
          const downloaded = await downloadFileFromR2(
            storagePath,
            32 * 1024 * 1024,
          );
          if (
            downloaded.buffer.length !== bytes.length ||
            createHash("sha256").update(downloaded.buffer).digest("hex") !==
              asset.contentHash
          )
            throw new Error("R2 바이트 검증에 실패했습니다.");
          version = await client
            .from("legacy_template_asset_versions")
            .insert({
              asset_set_id: set.data.id,
              asset_id: asset.assetId,
              content_hash: asset.contentHash,
              storage_path: storagePath,
              mime_type: asset.mimeType,
              byte_size: bytes.length,
              width: asset.width,
              height: asset.height,
              original_filename: asset.originalFilename,
            })
            .select("id")
            .single();
          if (version.error?.code === "23505")
            version = await client
              .from("legacy_template_asset_versions")
              .select("id")
              .eq("asset_set_id", set.data.id)
              .eq("asset_id", asset.assetId)
              .eq("content_hash", asset.contentHash)
              .maybeSingle();
        }
        if (version.error || !version.data)
          throw new Error("버전을 저장하지 못했습니다.");
        versionIds.set(asset.assetId, version.data.id);
      };
      let nextAsset = 0;
      let assetFailed = false;
      const worker = async () => {
        while (!assetFailed && nextAsset < assets.length) {
          const asset = assets[nextAsset++];
          try {
            await processAsset(asset);
          } catch (error) {
            assetFailed = true;
            throw error;
          }
        }
      };
      const workers = await Promise.allSettled(
        Array.from({ length: Math.min(concurrency, assets.length) }, worker),
      );
      const rejected = workers.find((result) => result.status === "rejected");
      if (rejected?.status === "rejected") throw rejected.reason;
      const bindings = Object.fromEntries(
        Object.entries(template.bindings).map(([theme, slots]) => [
          theme,
          Object.fromEntries(
            Object.entries(slots).map(([slot, assetId]) => [
              slot,
              versionIds.get(assetId),
            ]),
          ),
        ]),
      );
      const applied = await client.rpc("apply_legacy_template_asset_revision", {
        p_set_id: set.data.id,
        p_expected_revision_id: null,
        p_bindings: bindings,
        p_actor_id: null,
        p_note: "초기 에셋 이관",
        p_mode: args.includes("--activate") ? "r2" : "local",
      });
      if (applied.error)
        throw new Error(
          applied.error.code === "40001"
            ? "동시 이관이 완료되어 기존 이력을 유지합니다."
            : "초기 이력을 저장하지 못했습니다.",
        );
      console.log(
        `${template.ownerKind}/${template.templateId}: ${assets.length}개 이관 완료`,
      );
      completed++;
    } catch (error) {
      failures++;
      console.error(
        `${template.ownerKind}/${template.templateId}: ${error instanceof Error ? error.message : "실패"}`,
      );
    }
  }
  console.log(
    JSON.stringify({
      completed,
      skipped,
      failures,
      environment,
      activated: args.includes("--activate"),
    }),
  );
  if (failures) process.exitCode = 1;
}
main().catch(() => {
  console.error("에셋 이관을 완료하지 못했습니다.");
  process.exitCode = 1;
});
