# 04. Studio Persistence 서비스 전환

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
