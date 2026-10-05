import type { StaticImageData } from "next/image";
import type {
  LegacyAssetOwner,
  LegacyAssetRuntime,
} from "@/types/legacy-template-assets";
import owners from "./r2-only-owners.json";

const r2OnlyOwners = new Set(
  owners.map((owner) => `${owner.ownerKind}:${owner.templateId}`),
);
const slotPrefix = "r2-slot:";

export function requiresLegacyAssetR2(owner: LegacyAssetOwner): boolean {
  return (
    (owner.purpose ?? "runtime") === "runtime" &&
    r2OnlyOwners.has(`${owner.ownerKind}:${owner.templateId}`)
  );
}

// Metadata only. The provider replaces this marker with the active registered URL.
export function legacyR2ImageSlot(
  assetId: string,
  width: number,
  height: number,
): StaticImageData {
  return { src: `${slotPrefix}${assetId}`, width, height };
}

export function resolveLegacyTemplateImages<T>(
  localImages: T,
  runtime: LegacyAssetRuntime | null,
): T {
  const themes = localImages as Record<string, Record<string, StaticImageData>>;
  const r2Only = Object.values(themes).some((slots) =>
    Object.values(slots).some((image) => image.src.startsWith(slotPrefix)),
  );
  if (!runtime || runtime.mode === "local") {
    if (r2Only) throw new Error("이 템플릿은 등록된 R2 이미지가 필요합니다.");
    return localImages;
  }
  if (r2Only) {
    for (const [theme, slots] of Object.entries(themes)) {
      for (const key of Object.keys(slots)) {
        if (!runtime.images[theme]?.[key])
          throw new Error(`등록된 이미지가 없습니다: ${theme}/${key}`);
      }
    }
  }
  return Object.fromEntries(
    Object.entries(runtime.images).map(([theme, slots]) => [
      theme,
      Object.fromEntries(
        Object.entries(slots).map(([key, image]) => [
          key,
          { ...themes[theme]?.[key], ...image },
        ]),
      ),
    ]),
  ) as T;
}
