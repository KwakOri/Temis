const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");

/**
 * Base R2 prefix for canonical (published) Template Studio assets. Shared by
 * the asset sync route (which writes under it) and template deletion (which
 * needs to delete everything under it for a given template).
 */
export const resolveTemplateStudioAssetBasePrefix = (): string => {
  const explicitPrefix = process.env.TEMPLATE_STUDIO_ASSET_R2_BASE_PREFIX;
  if (explicitPrefix && explicitPrefix.trim().length > 0) {
    return trimSlashes(explicitPrefix);
  }

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.APP_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  return isProduction ? "template-studio" : "template-studio/dev";
};

export const sanitizeTemplateStudioPathSegment = (
  value: string,
  fallback: string
): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : fallback;
};

/**
 * R2 prefix holding every asset ever synced for a template
 * (`{base}/{templateId}/assets/...`). Used to bulk-delete a template's R2
 * objects when the template itself is deleted.
 */
export const buildTemplateStudioAssetTemplatePrefix = (
  templateId: string
): string =>
  `${resolveTemplateStudioAssetBasePrefix()}/${sanitizeTemplateStudioPathSegment(
    templateId,
    "template"
  )}`;
