/**
 * Resolves the user-facing run/execution URL for a template based on its engine.
 * Legacy templates run under /time-table, Studio templates under /template-studio.
 */
export const getTemplateUseHref = (
  templateId: string,
  templateEngine: string | null | undefined,
): string =>
  templateEngine === "studio"
    ? `/template-studio/${templateId}`
    : `/time-table/${templateId}`;
