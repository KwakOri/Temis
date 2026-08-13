# 04. Studio Persistence 서비스 전환

상태: 완료 (2026-07-15)

## 목적

3단계에서 공통 `templates`로 최소 전환한 Studio persistence를 전체 API 계약과
운영 시나리오 기준으로 정리한다. API와 UI의 기존 응답 계약은 가능한 한 유지한다.

## 변경 범위

- create/get/list/delete의 3단계 전환 결과를 전체 API smoke check로 고정한다.
- 모든 Studio 루트 및 연관 조회에 `template_engine = 'studio'` 필터가 있는지
  점검한다.
- 생성 기본값:
  - `template_engine = 'studio'`
  - `status = 'draft'`
  - `is_public = false`
  - 상점 미노출
  - `created_by = 현재 관리자 id`
- 목록·상세 응답 mapper가 공통 루트 컬럼을 기존 Studio 타입으로 변환한다.
- legacy 템플릿 id를 Studio API에 전달하면 명확한 not-found/domain 오류를 반환한다.
- 공통 Template 타입과 Studio 전용 응답 타입 사이의 중복 필드를 정리한다.

## 완료 조건

- Template Studio 목록, 생성, 편집, draft 저장, publish, 삭제가 동작한다.
- 기존 관리자 UI의 API 응답 타입을 불필요하게 넓히지 않는다.
- legacy 데이터가 Studio 목록에 섞이지 않는다.
- publish 후 `templates.status = 'published'`가 된다.

## 실제 변경 사항

- `create/get/list`는 3단계에서 이미 `templates` 루트와 `template_engine = 'studio'`
  필터로 전환되어 있었다. 그러나 `templates/[id]` 라우트에 DELETE가 없어
  `deleteTemplateStudioTemplate` 서비스 함수가 어디에서도 호출되지 않는 상태였다.
- `DELETE /api/admin/template-studio/templates/{id}`를 추가했다. 다른 Studio 라우트와
  동일하게 `getTemplateStudioTemplate`로 먼저 `template_engine = 'studio'`인지 확인한
  뒤 삭제하므로 legacy id는 `404`로 거부된다.
- `TemplateStudioService.deleteTemplate`, `useDeleteTemplateStudioTemplate` 훅, 관리자
  목록 화면의 삭제 버튼(확인 다이얼로그 포함)을 추가해 삭제를 실제로 사용할 수 있게 했다.
- 나머지 하위 리소스 라우트(GET 상세, draft GET/PUT, publish)는 이미 모두
  `getTemplateStudioTemplate`로 먼저 엔진을 검증한 뒤에만 하위 테이블에 접근하고
  있음을 코드 확인으로 재검증했다.

## 로컬 검증

- `npm run check:template-studio:api`에 다음 시나리오를 추가하고 통과를 확인했다.
  - 정상 Studio 템플릿에 대한 DELETE 성공과, 삭제 후 GET이 `404`가 되는지 확인
  - 임시로 삽입한 `template_engine = 'legacy'` 템플릿 id에 대해 상세 GET, draft GET,
    publish POST, DELETE가 모두 `404`로 거부되는지 확인
- `npm run check:template-studio:persistence` 재실행 통과.
- `tsc --noEmit` 및 변경 파일 ESLint 통과.
- 원격 DB 변경은 수행하지 않았다.
