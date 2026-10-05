import type { StaticImageData } from "next/image";
import type {
  LegacyAssetOwner,
  LegacyAssetRuntime,
  ProjectAssetManifest,
} from "@/types/legacy-template-assets";
import owners from "./r2-only-owners.json";
import covers from "./public-project-covers.json";

const r2OnlyOwners = new Set(
  owners.map((owner) => `${owner.ownerKind}:${owner.templateId}`),
);
const slotPrefix = "r2-slot:";
const r2OnlyCovers = new Set(
  covers.map((cover) => `${cover.ownerKind}:${cover.templateId}`),
);
const r2OnlyCoverUrls = new Set(covers.map((cover) => cover.localUrl));

export function requiresCatalogCoverR2(
  src: string | null | undefined,
): boolean {
  return !!src && r2OnlyCoverUrls.has(src);
}

export function resolveCatalogCoverUrl(
  src: string | null | undefined,
  manifest: ProjectAssetManifest | undefined,
): string | null | undefined {
  if (!requiresCatalogCoverR2(src)) return src;
  if (!manifest) return null;
  const image = manifest.covers[src!];
  if (
    !image ||
    !/^https:\/\//.test(image.src) ||
    !Number.isFinite(image.width) ||
    image.width <= 0 ||
    !Number.isFinite(image.height) ||
    image.height <= 0
  )
    throw new Error(
      "등록된 R2 대표 이미지를 불러오지 못했습니다. R2 적용 상태를 확인해 주세요.",
    );
  return image.src;
}

export function requiresLegacyAssetR2(owner: LegacyAssetOwner): boolean {
  if (owner.purpose === "cover")
    return r2OnlyCovers.has(`${owner.ownerKind}:${owner.templateId}`);
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
