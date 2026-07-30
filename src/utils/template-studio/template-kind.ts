import type {
  StudioTemplateDocument,
  StudioTemplateKind,
} from "@/types/template-studio";

export const STUDIO_TEMPLATE_KINDS: StudioTemplateKind[] = [
  "timetable",
  "thumbnail",
];

export const isStudioTemplateKind = (
  value: unknown,
): value is StudioTemplateKind =>
  value === "timetable" || value === "thumbnail";

export interface StudioTemplateKindContext {
  /** API 요청이나 DB row가 알려준 종류 */
  requestedKind?: unknown;
}

/**
 * 문서의 종류를 판정한다.
 *
 * v6 이하 문서에는 `metadata.kind`가 없으므로 로드와 migration 경계에서
 * 종류가 없는 문서를 받을 수 있다. 이 resolver는 그 경계만 흡수한다.
 * canonical 문서(migration 결과와 신규 factory 산출물)는 항상 kind를 갖는다.
 *
 * 판정 순서:
 * 1. 유효한 `metadata.kind`
 * 2. `domains.timetable`이 있으면 `timetable`
 * 3. 호출자가 전달한 명시적 kind
 * 4. 판정 불가면 `null`
 */
export const getStudioTemplateKind = (
  document: unknown,
  context: StudioTemplateKindContext = {},
): StudioTemplateKind | null => {
  const candidate = document as Partial<StudioTemplateDocument> | null;

  const metadataKind = candidate?.metadata?.kind;
  if (isStudioTemplateKind(metadataKind)) return metadataKind;

  if (candidate?.domains?.timetable) return "timetable";

  if (isStudioTemplateKind(context.requestedKind)) return context.requestedKind;

  return null;
};

/**
 * 문서와 요청받은 종류가 일치하는지 확인한다.
 *
 * 저장과 발행은 이 결과가 어긋나면 거부한다.
 */
export const isStudioTemplateKindMatch = (
  document: unknown,
  requestedKind: unknown,
): boolean => {
  if (!isStudioTemplateKind(requestedKind)) return false;
  const resolved = getStudioTemplateKind(document);
  return resolved === null || resolved === requestedKind;
};
