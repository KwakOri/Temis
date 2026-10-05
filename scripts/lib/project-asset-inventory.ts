import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type {
  InventoryTemplate,
  LegacyAssetInventory,
} from "./legacy-template-asset-inventory";
import type { LegacyAssetOwner } from "../../src/types/legacy-template-assets";
import publicCovers from "../../src/utils/legacy-template-assets/public-project-covers.json";
import { requiresLegacyAssetR2 } from "../../src/utils/legacy-template-assets/source-policy";

export type ManagedInventoryTemplate = Omit<InventoryTemplate, "ownerKind"> &
  LegacyAssetOwner;
export function createProjectAssetTemplates(
  root: string,
  inventory: LegacyAssetInventory,
): ManagedInventoryTemplate[] {
  const report = JSON.parse(
    readFileSync(
      path.join(root, "docs/legacy-template-project-assets-audit.json"),
      "utf8",
    ),
  ) as {
    assets: Array<{
      file: string;
      classification: string;
      ownerKind: LegacyAssetOwner["ownerKind"];
      templateId: string;
      contentHash: string;
    }>;
  };
  const files = new Map(
    inventory.projectAssets.map((asset) => [asset.file, asset]),
  );
  const archivePath = path.join(
    root,
    "scripts/data/legacy-cover-removed-sources.json",
  );
  const removed: ManagedInventoryTemplate[] = existsSync(archivePath)
    ? JSON.parse(readFileSync(archivePath, "utf8"))
    : [];
  const covers = report.assets.filter(
    (asset) => asset.classification === "template-cover",
  );
  if (
    covers.length !== 97 ||
    new Set(covers.map((asset) => asset.file)).size !== 97
  )
    throw new Error("대표 썸네일 조사 목록과 일치하지 않습니다.");
  const templates: ManagedInventoryTemplate[] = covers.map((cover) => {
    if (
      !publicCovers.some(
        (entry) =>
          entry.ownerKind === cover.ownerKind &&
          entry.templateId === cover.templateId &&
          entry.localUrl === cover.file.replace(/^public/, ""),
      )
    )
      throw new Error("검토된 공개 썸네일 목록과 일치하지 않습니다.");
    let asset = files.get(cover.file);
    const saved = removed
      .find(
        (entry) =>
          entry.ownerKind === cover.ownerKind &&
          entry.templateId === cover.templateId &&
          entry.purpose === "cover",
      )
      ?.assets.find((entry) => entry.file === cover.file);
    if (
      !existsSync(path.join(root, cover.file)) &&
      saved &&
      requiresLegacyAssetR2({ ...cover, purpose: "cover" })
    )
      asset = {
        ...saved,
        exists: false,
        sourceRemoved: true,
        category: "public",
      };
    if (
      !asset ||
      (!asset.exists && !asset.sourceRemoved) ||
      asset.readError ||
      asset.contentHash !== cover.contentHash
    )
      throw new Error("조사 이후 대표 이미지가 변경되었거나 누락되었습니다.");
    return {
      ownerKind: cover.ownerKind,
      templateId: cover.templateId,
      purpose: "cover",
      manifestFile: cover.file,
      bindings: { first: { cover: asset.assetId } },
      assets: [asset],
      issues: [],
      dynamicReferences: [],
      parentStatus: "not_checked",
      status: "ready",
    };
  });
  return templates;
}
