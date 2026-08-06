import { randomUUID } from "node:crypto";

export const CATALOG_COVER_FOLDER = "uploads/catalog-covers";
export const CATALOG_COVER_TEST_ROOT_PREFIX = `${CATALOG_COVER_FOLDER}/_test`;
export const CATALOG_COVER_MAX_SIZE = 10 * 1000 * 1000;
export const CATALOG_COVER_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

type CatalogCoverMimeType = (typeof CATALOG_COVER_ALLOWED_TYPES)[number];

export interface CatalogCoverUploadMetadata {
  name: string;
  size: number;
  type: string;
}

const extensionByMimeType: Record<CatalogCoverMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const normalizeCatalogCoverPrefix = (value: string): string =>
  value.trim().replace(/^\/+|\/+$/g, "");

/**
 * 테스트 prefix는 반드시 한 번에 삭제할 수 있는 단일 run 폴더여야 한다.
 * production prefix 자체나 그 하위의 임의 경로는 테스트 prefix로 허용하지 않는다.
 */
export const isCatalogCoverTestPrefix = (value: string): boolean => {
  const prefix = normalizeCatalogCoverPrefix(value);
  const rootWithSlash = `${CATALOG_COVER_TEST_ROOT_PREFIX}/`;
  const runId = prefix.startsWith(rootWithSlash)
    ? prefix.slice(rootWithSlash.length)
    : "";

  return (
    runId.length > 0 &&
    !runId.includes("/") &&
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)
  );
};

/**
 * 기본은 production prefix를 사용한다.
 * CATALOG_COVER_R2_PREFIX를 지정할 때는 안전한 test run prefix만 허용해
 * 테스트 API가 production catalog cover를 덮어쓰거나 삭제하지 않도록 한다.
 */
export const getCatalogCoverR2Prefix = (): string => {
  const configuredPrefix = process.env.CATALOG_COVER_R2_PREFIX?.trim();
  if (!configuredPrefix) return CATALOG_COVER_FOLDER;

  const normalizedPrefix = normalizeCatalogCoverPrefix(configuredPrefix);
  if (!isCatalogCoverTestPrefix(normalizedPrefix)) {
    throw new Error(
      `CATALOG_COVER_R2_PREFIX must be a single test run prefix below ${CATALOG_COVER_TEST_ROOT_PREFIX}/.`,
    );
  }

  return normalizedPrefix;
};

const getConfiguredPublicUrl = () =>
  (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");

export const validateCatalogCoverUpload = (
  file: CatalogCoverUploadMetadata,
): { isValid: boolean; error?: string } => {
  if (!file.name || file.size <= 0 || !file.type) {
    return {
      isValid: false,
      error: "업로드할 대표 이미지 정보가 올바르지 않습니다.",
    };
  }

  if (file.size > CATALOG_COVER_MAX_SIZE) {
    return {
      isValid: false,
      error: "대표 이미지는 10MB 이하만 업로드할 수 있습니다.",
    };
  }

  if (
    !CATALOG_COVER_ALLOWED_TYPES.includes(file.type as CatalogCoverMimeType)
  ) {
    return {
      isValid: false,
      error: "대표 이미지는 PNG, JPEG, WebP 형식만 업로드할 수 있습니다.",
    };
  }

  return { isValid: true };
};

export const createCatalogCoverKey = (
  templateId: string,
  mimeType: CatalogCoverMimeType,
): string =>
  `${getCatalogCoverR2Prefix()}/${templateId}/${randomUUID()}.${extensionByMimeType[mimeType]}`;

/**
 * 관리 대상 catalog cover URL에서만 R2 key를 추출한다.
 * 외부 URL이나 Legacy 정적 URL은 삭제 대상으로 취급하지 않는다.
 * 현재 실행 환경의 prefix 밖에 있는 객체도 삭제 대상으로 취급하지 않는다.
 */
export const getManagedCatalogCoverKey = (
  fileUrl: string | null | undefined,
  publicUrl = getConfiguredPublicUrl(),
): string | null => {
  const managedPrefix = `${getCatalogCoverR2Prefix()}/`;
  if (!fileUrl || !publicUrl) return null;

  try {
    const publicUrlObject = new URL(publicUrl);
    const fileUrlObject = new URL(fileUrl);
    const basePath = publicUrlObject.pathname.replace(/\/+$/, "");

    if (
      fileUrlObject.origin !== publicUrlObject.origin ||
      fileUrlObject.search ||
      fileUrlObject.hash
    ) {
      return null;
    }

    const prefix = basePath ? `${basePath}/` : "/";
    if (!fileUrlObject.pathname.startsWith(prefix)) return null;

    const key = decodeURIComponent(fileUrlObject.pathname.slice(prefix.length));
    if (!key.startsWith(managedPrefix) || key.includes("..")) return null;

    const relativeKey = key.slice(managedPrefix.length);
    const relativeSegments = relativeKey.split("/");
    if (
      relativeSegments.length !== 2 ||
      relativeSegments.some((segment) => segment.length === 0)
    ) {
      return null;
    }

    return key;
  } catch {
    return null;
  }
};
