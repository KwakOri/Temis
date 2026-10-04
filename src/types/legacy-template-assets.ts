export const LEGACY_ASSET_OWNER_KINDS = [
  "timetable",
  "team_timetable",
  "thumbnail",
  "site",
] as const;
export type LegacyAssetOwnerKind = (typeof LEGACY_ASSET_OWNER_KINDS)[number];
export type LegacyAssetBindings = Record<string, Record<string, string>>;
export interface LegacyAssetOwner {
  ownerKind: LegacyAssetOwnerKind;
  templateId: string;
  purpose?: "runtime" | "cover" | "site";
}
export interface LegacyAssetVersion {
  public_url?: string;
  id: string;
  asset_set_id: string;
  asset_id: string;
  content_hash: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  width: number;
  height: number;
  original_filename: string;
  created_at: string;
}
export interface LegacyAssetRevision {
  id: string;
  asset_set_id: string;
  revision_no: number;
  bindings: LegacyAssetBindings;
  note: string;
  created_at: string;
  created_by: number | null;
}
export interface LegacyAssetSet extends LegacyAssetOwner {
  id: string;
  name: string;
  mode: "local" | "r2";
  expected_slots: Record<string, string[]>;
  active_revision_id: string | null;
  updated_at: string;
}
export interface LegacyAssetDetail {
  set: LegacyAssetSet;
  versions: LegacyAssetVersion[];
  revisions: LegacyAssetRevision[];
}
export interface LegacyAssetChange {
  theme: string;
  key: string;
  versionId: string;
}
export interface LegacyAssetUpload {
  assetId: string;
  contentHash: string;
  mimeType: string;
  byteSize: number;
  originalFilename: string;
}
export interface LegacyAssetRuntime {
  mode: "local" | "r2";
  revisionId: string | null;
  images: Record<
    string,
    Record<string, { src: string; width: number; height: number }>
  >;
}
export interface ProjectAssetManifest {
  covers: Record<string, { src: string; width: number; height: number }>;
  homepage: LegacyAssetRuntime;
}
