const trimSlashes = (value: string): string =>
  value.replace(/^\/+|\/+$/g, "");

export const resolveV2AssetUploadBasePrefix = ({
  explicitPrefix,
  nodeEnv,
  appEnv,
  vercelEnv,
}: {
  explicitPrefix?: string;
  nodeEnv?: string;
  appEnv?: string;
  vercelEnv?: string;
} = {}): string => {
  if (typeof explicitPrefix === "string" && explicitPrefix.trim().length > 0) {
    return trimSlashes(explicitPrefix.trim());
  }

  const effectiveNodeEnv = nodeEnv ?? process.env.NODE_ENV;
  const effectiveAppEnv = appEnv ?? process.env.APP_ENV;
  const effectiveVercelEnv = vercelEnv ?? process.env.VERCEL_ENV;

  const isProduction =
    effectiveNodeEnv === "production" ||
    effectiveAppEnv === "production" ||
    effectiveVercelEnv === "production";

  return isProduction ? "uploads/v2-template" : "uploads/dev/v2-template";
};

export const buildV2AssetUploadFolder = ({
  templateId,
  theme,
  basePrefix,
}: {
  templateId: string;
  theme: string;
  basePrefix?: string;
}): string => {
  const resolvedBasePrefix = trimSlashes(
    basePrefix ?? resolveV2AssetUploadBasePrefix()
  );
  return `${resolvedBasePrefix}/${trimSlashes(templateId)}/assets/${trimSlashes(theme)}`;
};
