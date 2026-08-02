import { isStudioTemplateKind } from "@/utils/template-studio/template-kind";

/**
 * Resolves the user-facing run/execution URL for a template based on its engine.
 * Legacy templates run under /time-table. Studio template domains use their
 * canonical runtime route.
 */
export const getTemplateUseHref = (
  templateId: string,
  templateEngine: string | null | undefined,
  templateKind?: string | null,
): string =>
  templateEngine === "studio"
    ? isStudioTemplateKind(templateKind) && templateKind === "thumbnail"
      ? `/thumbnail/${templateId}`
      : `/template-studio/${templateId}`
    : `/time-table/${templateId}`;
