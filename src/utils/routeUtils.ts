/**
 * 경로에서 템플릿 ID를 추출하는 유틸리티 함수
 */
export function extractTemplateIdFromPath(pathname: string): string | null {
  // /time-table/[template-id] 패턴에서 template-id 추출
  const match = pathname.match(/\/time-table\/([^\/]+)/);
  
  if (!match || !match[1]) {
    return null;
  }
  
  const templateId = match[1];
  
  // _template은 기본 템플릿이므로 실제 템플릿 ID가 아님
  if (templateId === '_template') {
    return null;
  }
  
  // UUID 형식 검증 (선택적)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(templateId)) {
    return null;
  }
  
  return templateId;
}

/**
 * 현재 경로가 템플릿 접근 검증이 필요한지 확인
 */
export function shouldValidateTemplateAccess(pathname: string): boolean {
  const templateId = extractTemplateIdFromPath(pathname);
  return templateId !== null;
}