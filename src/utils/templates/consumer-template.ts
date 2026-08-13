import { isLegacyTemplateRouteId } from "@/utils/templates/legacy-template-routes";

export type ConsumerTemplateKind = "timetable" | "thumbnail";
export type ConsumerTemplateEngine = "legacy" | "studio";
export type ConsumerTemplateSalesType = "general" | "custom";
export type ConsumerTemplatePlan = "lite" | "pro";
export type ConsumerTemplateAccessSource = "purchase" | "artist";

export interface ConsumerTemplateSummary {
  /** The canonical templates.id, never the access or artist-link row id. */
  id: string;
  name: string;
  description: string;
  engine: ConsumerTemplateEngine;
  kind: ConsumerTemplateKind;
  salesType: ConsumerTemplateSalesType;
  accessSource: ConsumerTemplateAccessSource | null;
  plan: ConsumerTemplatePlan | null;
  thumbnailUrl: string | null;
  coverUrl: string | null;
  useHref: string;
}

export interface ConsumerTemplateCoverInput {
  id: string;
  engine: ConsumerTemplateEngine;
  kind: ConsumerTemplateKind;
  thumbnailUrl: string | null;
}

/**
 * 공개 소비자 화면에서 템플릿 종류를 해석한다.
 * Legacy 템플릿은 역사적으로 kind가 null이므로 시간표로만 허용한다.
 */
export const resolveConsumerTemplateKind = (
  templateEngine: unknown,
  templateKind: unknown,
): ConsumerTemplateKind | null => {
  if (
    templateEngine === "legacy" &&
    (templateKind === null || templateKind === undefined)
  ) {
    return "timetable";
  }

  if (
    templateEngine === "studio" &&
    (templateKind === "timetable" || templateKind === "thumbnail")
  ) {
    return templateKind;
  }

  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const nonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOptionalUrl = (value: unknown): string | null => {
  const normalized = nonEmptyString(value);
  if (!normalized || normalized.startsWith("//")) return null;

  if (normalized.startsWith("/")) return normalized;

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:"
      ? normalized
      : null;
  } catch {
    return null;
  }
};

const normalizeInternalHref = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value !== value.trim() || value.startsWith("//")) return null;
  return value.startsWith("/") ? value : null;
};

const normalizeAccessSource = (
  value: unknown,
): ConsumerTemplateAccessSource | null => {
  if (value === "purchase" || value === "artist") return value;
  return null;
};

const normalizePlan = (value: unknown): ConsumerTemplatePlan | null => {
  if (value === "lite" || value === "pro") return value;
  return null;
};

/**
 * Resolves a final display source. Consumers never infer this URL from the id.
 */
export const resolveConsumerTemplateCover = ({
  id,
  engine,
  kind,
  thumbnailUrl,
}: ConsumerTemplateCoverInput): string | null => {
  if (thumbnailUrl) return thumbnailUrl;
  if (engine === "legacy" && kind === "timetable") {
    return `/thumbnail/${id}.png`;
  }
  return null;
};

/**
 * Converts the API's raw snake_case row into the consumer-facing contract.
 * Invalid identity, classification, sales, or navigation values are rejected
 * instead of silently falling back to a Legacy route.
 */
export const normalizeConsumerTemplate = (
  input: unknown,
): ConsumerTemplateSummary | null => {
  const row = asRecord(input);
  const template = asRecord(row?.templates);
  if (!row || !template) return null;

  const id = nonEmptyString(template.id);
  const name = nonEmptyString(template.name);
  if (!id || !name) return null;

  const engineValue = template.template_engine;
  const kindValue = template.template_kind;
  const kind = resolveConsumerTemplateKind(engineValue, kindValue);
  let engine: ConsumerTemplateEngine;

  if (
    engineValue === "legacy" &&
    kind === "timetable" &&
    isLegacyTemplateRouteId(id)
  ) {
    engine = "legacy";
  } else if (engineValue === "studio" && kind) {
    engine = "studio";
  } else {
    return null;
  }

  if (typeof template.is_public !== "boolean") return null;

  const useHref = normalizeInternalHref(template.use_href);
  if (!useHref) return null;

  const description =
    template.description === null || template.description === undefined
      ? ""
      : typeof template.description === "string"
        ? template.description
        : null;
  if (description === null) return null;

  const thumbnailUrl = normalizeOptionalUrl(template.thumbnail_url);
  const templatePlan = asRecord(row.template_plan);

  return {
    id,
    name,
    description,
    engine,
    kind,
    salesType: template.is_public ? "general" : "custom",
    accessSource: normalizeAccessSource(row.access_source),
    plan: normalizePlan(templatePlan?.plan),
    thumbnailUrl,
    coverUrl: resolveConsumerTemplateCover({
      id,
      engine,
      kind,
      thumbnailUrl,
    }),
    useHref,
  };
};

export const normalizeConsumerTemplates = (
  inputs: readonly unknown[],
): ConsumerTemplateSummary[] =>
  inputs.flatMap((input) => {
    const normalized = normalizeConsumerTemplate(input);
    return normalized ? [normalized] : [];
  });
