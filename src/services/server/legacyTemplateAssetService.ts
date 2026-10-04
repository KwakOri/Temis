import { supabaseAdminServer } from "@/lib/supabase-admin-server";
import { getFileUrl } from "@/lib/r2";
import type { TemplateStudioPersistenceClient } from "./templateStudioPersistenceService";
import type {
  LegacyAssetBindings,
  LegacyAssetDetail,
  LegacyAssetOwner,
  LegacyAssetRevision,
  LegacyAssetRuntime,
  LegacyAssetSet,
  LegacyAssetVersion,
} from "@/types/legacy-template-assets";
import {
  LegacyAssetError,
  mergeLegacyAssetChanges,
  validateLegacyAssetBindings,
} from "@/utils/legacy-template-assets/contracts";

// The checked-in generated DB types predate this migration, as with Studio persistence.
export const legacyAssetDb =
  supabaseAdminServer as unknown as TemplateStudioPersistenceClient;
export const legacyAssetParentColumns = {
  timetable: "template_id",
  team_timetable: "team_template_id",
  thumbnail: "thumbnail_id",
  site: "site_key",
} as const;
export const legacyAssetParentTables = {
  timetable: "templates",
  team_timetable: "team_templates",
  thumbnail: "thumbnails",
} as const;
type SetRow = Omit<LegacyAssetSet, "ownerKind" | "templateId" | "name"> & {
  template_id: string | null;
  team_template_id: string | null;
  thumbnail_id: string | null;
  site_key: string | null;
  purpose: NonNullable<LegacyAssetOwner["purpose"]>;
};
async function readLegacyHistory<T>(
  query: ReturnType<typeof legacyAssetDb.from<T[]>>,
): Promise<T[]> {
  const rows: T[] = [];
  const paged = query as typeof query & {
    range(from: number, to: number): typeof query;
  };
  for (let offset = 0; ; offset += 500) {
    const result = await paged.range(offset, offset + 499);
    checkDbError(result.error);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
function checkDbError(error: { code?: string } | null): void {
  if (!error) return;
  if (error.code === "40001")
    throw new LegacyAssetError(
      "다른 변경이 적용되었습니다. 새로고침 후 다시 시도해 주세요.",
      409,
    );
  if (error.code === "22023")
    throw new LegacyAssetError("이미지 구성이 템플릿과 일치하지 않습니다.");
  if (error.code === "P0002")
    throw new LegacyAssetError("등록된 에셋이 없습니다.", 404);
  throw new LegacyAssetError(
    "에셋 데이터를 처리하지 못했습니다. DB 마이그레이션과 연결 상태를 확인해 주세요.",
    503,
  );
}
function mapSet(row: SetRow, name: string): LegacyAssetSet {
  const ownerKind = row.template_id
    ? "timetable"
    : row.team_template_id
      ? "team_timetable"
      : row.thumbnail_id
        ? "thumbnail"
        : "site";
  return {
    id: row.id,
    ownerKind,
    templateId: (row.template_id ??
      row.team_template_id ??
      row.thumbnail_id ??
      row.site_key)!,
    purpose: row.purpose ?? "runtime",
    name,
    mode: row.mode,
    expected_slots: row.expected_slots,
    active_revision_id: row.active_revision_id,
    updated_at: row.updated_at,
  };
}
export async function listLegacyAssetSets(): Promise<LegacyAssetSet[]> {
  const sets = await legacyAssetDb
    .from<SetRow[]>("legacy_template_asset_sets")
    .select("*")
    .order("updated_at", { ascending: false });
  checkDbError(sets.error);
  const results: LegacyAssetSet[] = [];
  for (const kind of Object.keys(
    legacyAssetParentTables,
  ) as (keyof typeof legacyAssetParentTables)[]) {
    const parents = await legacyAssetDb
      .from<Array<{ id: string; name: string }>>(legacyAssetParentTables[kind])
      .select("id,name");
    checkDbError(parents.error);
    const names = new Map(
      (parents.data ?? []).map((parent) => [parent.id, parent.name]),
    );
    for (const row of sets.data ?? []) {
      const id = row[legacyAssetParentColumns[kind]];
      if (id) results.push(mapSet(row, names.get(id) ?? id));
    }
  }
  for (const row of sets.data ?? []) {
    if (row.site_key) results.push(mapSet(row, "홈페이지"));
  }
  return results;
}
export async function getLegacyAssetDetail(
  owner: LegacyAssetOwner,
): Promise<LegacyAssetDetail | null> {
  const result = await legacyAssetDb
    .from<SetRow>("legacy_template_asset_sets")
    .select("*")
    .eq(legacyAssetParentColumns[owner.ownerKind], owner.templateId)
    .eq("purpose", owner.purpose ?? "runtime")
    .maybeSingle();
  checkDbError(result.error);
  if (!result.data) return null;
  const row = result.data;
  const parent =
    owner.ownerKind === "site"
      ? { data: { name: "홈페이지" }, error: null }
      : await legacyAssetDb
          .from<{ name: string }>(legacyAssetParentTables[owner.ownerKind])
          .select("name")
          .eq("id", owner.templateId)
          .single();
  checkDbError(parent.error);
  const versions = await readLegacyHistory(
    legacyAssetDb
      .from<LegacyAssetVersion[]>("legacy_template_asset_versions")
      .select("*")
      .eq("asset_set_id", row.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  );
  const revisions = await readLegacyHistory(
    legacyAssetDb
      .from<LegacyAssetRevision[]>("legacy_template_asset_revisions")
      .select("*")
      .eq("asset_set_id", row.id)
      .order("revision_no", { ascending: false }),
  );
  return {
    set: mapSet(row, parent.data?.name ?? owner.templateId),
    versions: versions.map((version) => ({
      ...version,
      public_url: getFileUrl(version.storage_path),
    })),
    revisions,
  };
}
export async function requireLegacyAssetDetail(
  owner: LegacyAssetOwner,
): Promise<LegacyAssetDetail> {
  const detail = await getLegacyAssetDetail(owner);
  if (!detail)
    throw new LegacyAssetError("아직 에셋이 이관되지 않은 템플릿입니다.", 404);
  return detail;
}
export function buildLegacyAssetRuntime(
  detail: LegacyAssetDetail,
  bindings?: LegacyAssetBindings,
): LegacyAssetRuntime {
  const revision = detail.revisions.find(
    (item) => item.id === detail.set.active_revision_id,
  );
  if (!bindings && detail.set.mode === "local")
    return {
      mode: "local",
      revisionId: detail.set.active_revision_id,
      images: {},
    };
  const selected = bindings ?? revision?.bindings;
  if (!selected)
    throw new LegacyAssetError("적용된 이미지 버전이 없습니다.", 503);
  const versions = new Map(detail.versions.map((v) => [v.id, v]));
  validateLegacyAssetBindings(
    selected,
    detail.set.expected_slots,
    new Set(versions.keys()),
  );
  return {
    mode: "r2",
    revisionId: detail.set.active_revision_id,
    images: Object.fromEntries(
      Object.entries(selected).map(([theme, slots]) => [
        theme,
        Object.fromEntries(
          Object.entries(slots).map(([key, id]) => {
            const v = versions.get(id)!;
            return [
              key,
              {
                src: getFileUrl(v.storage_path),
                width: v.width,
                height: v.height,
              },
            ];
          }),
        ),
      ]),
    ),
  };
}
export function previewLegacyAssetChanges(
  detail: LegacyAssetDetail,
  changes: unknown,
): LegacyAssetBindings {
  const revision = detail.revisions.find(
    (item) => item.id === detail.set.active_revision_id,
  );
  if (!revision)
    throw new LegacyAssetError("먼저 초기 에셋 이관을 완료해 주세요.", 409);
  return mergeLegacyAssetChanges(
    revision.bindings,
    detail.set.expected_slots,
    changes,
    new Set(detail.versions.map((v) => v.id)),
  );
}
export async function applyLegacyAssetRevision(
  detail: LegacyAssetDetail,
  expectedRevisionId: unknown,
  bindings: LegacyAssetBindings,
  actorId: number,
  note: string,
  mode: "local" | "r2" = "r2",
): Promise<string> {
  if (expectedRevisionId !== detail.set.active_revision_id)
    throw new LegacyAssetError(
      "다른 변경이 적용되었습니다. 새로고침해 주세요.",
      409,
    );
  validateLegacyAssetBindings(
    bindings,
    detail.set.expected_slots,
    new Set(detail.versions.map((v) => v.id)),
  );
  const result = await legacyAssetDb.rpc<string>(
    "apply_legacy_template_asset_revision",
    {
      p_set_id: detail.set.id,
      p_expected_revision_id: expectedRevisionId,
      p_bindings: bindings,
      p_actor_id: actorId,
      p_note: note,
      p_mode: mode,
    },
  );
  checkDbError(result.error);
  if (!result.data)
    throw new LegacyAssetError("변경 이력을 저장하지 못했습니다.", 503);
  return result.data;
}
export async function registerLegacyAssetVersion(
  version: Omit<LegacyAssetVersion, "id" | "created_at">,
  actorId: number,
): Promise<LegacyAssetVersion> {
  const result = await legacyAssetDb
    .from<LegacyAssetVersion>("legacy_template_asset_versions")
    .insert({ ...version, created_by: actorId })
    .select("*")
    .single();
  if (result.error?.code === "23505") {
    const existing = await legacyAssetDb
      .from<LegacyAssetVersion>("legacy_template_asset_versions")
      .select("*")
      .eq("asset_set_id", version.asset_set_id)
      .eq("asset_id", version.asset_id)
      .eq("content_hash", version.content_hash)
      .single();
    checkDbError(existing.error);
    if (
      existing.data &&
      existing.data.storage_path === version.storage_path &&
      existing.data.byte_size === version.byte_size
    )
      return existing.data;
  }
  checkDbError(result.error);
  if (!result.data)
    throw new LegacyAssetError("이미지 버전을 저장하지 못했습니다.", 503);
  return result.data;
}
