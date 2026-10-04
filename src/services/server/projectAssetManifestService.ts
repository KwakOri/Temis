import publicCoverOwners from "@/utils/legacy-template-assets/public-project-covers.json";
import { getFileUrl } from "@/lib/r2";
import { legacyAssetDb } from "./legacyTemplateAssetService";
import {
  LegacyAssetError,
  validateLegacyAssetBindings,
} from "@/utils/legacy-template-assets/contracts";
import { HOMEPAGE_IMAGE_FILES } from "@/utils/legacy-template-assets/project-assets";
import type {
  LegacyAssetBindings,
  LegacyAssetRevision,
  LegacyAssetVersion,
  ProjectAssetManifest,
} from "@/types/legacy-template-assets";

type ManifestSet = {
  id: string;
  template_id: string | null;
  team_template_id: string | null;
  thumbnail_id: string | null;
  site_key: string | null;
  purpose: string;
  mode: string;
  active_revision_id: string | null;
  expected_slots: Record<string, string[]>;
};
// Publication is restricted to the already-public audited files, not every asset set.
const publicCovers = new Map(
  publicCoverOwners.map((cover) => [
    `${cover.ownerKind}:${cover.templateId}`,
    cover.localUrl,
  ]),
);
function inValues<T>(
  query: ReturnType<typeof legacyAssetDb.from<T>>,
  column: string,
  values: string[],
) {
  return (
    query as typeof query & {
      in(column: string, values: string[]): typeof query;
    }
  ).in(column, values);
}
function coverPath(set: ManifestSet): string | undefined {
  const kind = set.template_id
    ? "timetable"
    : set.team_template_id
      ? "team_timetable"
      : "thumbnail";
  return publicCovers.get(
    `${kind}:${set.template_id ?? set.team_template_id ?? set.thumbnail_id}`,
  );
}
export function buildProjectAssetManifest(
  sets: ManifestSet[],
  revisions: LegacyAssetRevision[],
  versions: LegacyAssetVersion[],
): ProjectAssetManifest {
  const manifest: ProjectAssetManifest = {
    covers: {},
    homepage: { mode: "local", revisionId: null, images: {} },
  };
  const versionMap = new Map(versions.map((version) => [version.id, version]));
  for (const set of sets) {
    if (set.mode !== "r2") continue;
    const path = set.purpose === "cover" ? coverPath(set) : undefined;
    const site = set.purpose === "site" && set.site_key === "homepage";
    if (!path && !site) continue;
    const revision = revisions.find(
      (item) =>
        item.id === set.active_revision_id && item.asset_set_id === set.id,
    );
    if (!revision)
      throw new LegacyAssetError("공개 이미지의 적용 이력이 없습니다.", 503);
    const allowedVersions = new Set(
      versions
        .filter((version) => version.asset_set_id === set.id)
        .map((version) => version.id),
    );
    validateLegacyAssetBindings(
      revision.bindings,
      set.expected_slots,
      allowedVersions,
    );
    const image = (id: string) => {
      const version = versionMap.get(id)!;
      return {
        src: getFileUrl(version.storage_path),
        width: version.width,
        height: version.height,
      };
    };
    if (path) {
      const id = revision.bindings.first?.cover;
      if (!id) throw new LegacyAssetError("대표 이미지 슬롯이 없습니다.", 503);
      manifest.covers[path] = image(id);
    } else {
      const images: ProjectAssetManifest["homepage"]["images"] = {};
      for (const [theme, slots] of Object.entries(HOMEPAGE_IMAGE_FILES)) {
        images[theme] = {};
        for (const key of Object.keys(slots)) {
          const id = (revision.bindings as LegacyAssetBindings)[theme]?.[key];
          if (!id)
            throw new LegacyAssetError("홈 이미지 슬롯이 없습니다.", 503);
          images[theme][key] = image(id);
        }
      }
      manifest.homepage = { mode: "r2", revisionId: revision.id, images };
    }
  }
  return manifest;
}
export async function getProjectAssetManifest(): Promise<ProjectAssetManifest> {
  const sets = await inValues(
    legacyAssetDb
      .from<ManifestSet[]>("legacy_template_asset_sets")
      .select(
        "id,template_id,team_template_id,thumbnail_id,site_key,purpose,mode,active_revision_id,expected_slots",
      )
      .eq("mode", "r2"),
    "purpose",
    ["cover", "site"],
  );
  if (sets.error)
    throw new LegacyAssetError("공개 이미지를 조회하지 못했습니다.", 503);
  const selected = (sets.data ?? []).filter((set) =>
    set.purpose === "cover" ? !!coverPath(set) : set.site_key === "homepage",
  );
  if (!selected.length) return buildProjectAssetManifest([], [], []);
  const revisions = await inValues(
    legacyAssetDb
      .from<LegacyAssetRevision[]>("legacy_template_asset_revisions")
      .select("id,asset_set_id,bindings"),
    "id",
    selected.map((set) => set.active_revision_id!),
  );
  if (revisions.error)
    throw new LegacyAssetError("공개 이미지 이력을 조회하지 못했습니다.", 503);
  const ids = [
    ...new Set(
      (revisions.data ?? []).flatMap((revision) =>
        Object.values(revision.bindings).flatMap((slots) =>
          Object.values(slots),
        ),
      ),
    ),
  ];
  if (!ids.length)
    throw new LegacyAssetError("공개 이미지 버전이 없습니다.", 503);
  const versions = await inValues(
    legacyAssetDb
      .from<LegacyAssetVersion[]>("legacy_template_asset_versions")
      .select("id,asset_set_id,storage_path,width,height"),
    "id",
    ids,
  );
  if (versions.error)
    throw new LegacyAssetError("공개 이미지 버전을 조회하지 못했습니다.", 503);
  return buildProjectAssetManifest(
    selected,
    revisions.data ?? [],
    versions.data ?? [],
  );
}
