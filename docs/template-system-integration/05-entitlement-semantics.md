# 05. 이용 권한 의미 통합

상태: 완료 (2026-07-15)

## 목적

`is_public`을 상품 분류로만 사용하고, 실제 템플릿 이용 여부는 기존 권한 데이터로
일관되게 판정한다.

## 권한 공식

```text
canUse(template, user) =
  user is admin
  OR template_access(template_id, user_id) exists
  OR template_artists -> artists.user_id matches user
```

추가 공통 조건:

- `templates.status = 'published'`
- 요청한 engine의 실행 route와 템플릿 engine이 일치

## 변경 범위

- `TemplateService.hasAccess()`의 `is_public` 즉시 허용 분기를 제거한다.
- `public.has_template_access()` 함수에서도 같은 분기를 제거한다.
- route guard, API, my-page 목록이 동일한 서버 권한 서비스를 사용하도록 정리한다.
- `templates_select_policy` 같은 과거 RLS 정의는 권한의 근거로 사용하지 않는다.
- 무료 템플릿 요구가 생기면 `is_public`을 재사용하지 않고 별도 access mode를
  설계한다.

## 필수 테스트

- 일반 판매 템플릿 + 미구매 사용자: 거부
- 일반 판매 템플릿 + 승인된 사용자: 허용
- 개인 맞춤 템플릿 + 지정 사용자: 허용
- 개인 맞춤 템플릿 + 타 사용자: 거부
- 연결 작가와 관리자: 허용
- draft/archived 템플릿: 일반 사용자 거부

## 실제 변경 사항

- `route guard, API, my-page`가 이미 하나의 경로로 모여 있음을 코드로 확인했다.
  - `TemplateProtectedRoute` → `useTemplateAccess` 훅 → `GET /api/template-access` →
    `TemplateService.hasAccess()`
  - `/api/user/templates`(마이페이지 목록)는 `is_public`을 전혀 참조하지 않고
    `template_access`/`template_artists` 실제 부여 행만으로 목록을 구성하고
    있어서 별도 수정이 필요 없었다.
  - `is_public`이 등장하는 다른 모든 위치(상점 노출, 관리자 화면, 썸네일 등)는
    상품 분류 용도일 뿐 접근 판정에 쓰이지 않음을 전수 확인했다.
- `src/lib/templates.ts`의 `TemplateService.hasAccess()`에서 `is_public` 즉시
  허용 분기를 제거하고, 대신 `templates.status = 'published'`를 선행 조건으로
  검사하도록 변경했다.
- `public.has_template_access()` SQL 함수도 동일하게 `is_public` 분기를 제거하고
  `status = 'published'` 검사로 대체했다(`20260715040000_remove_is_public_entitlement_bypass.sql`).
  이 함수는 현재 애플리케이션 코드에서 호출되지 않지만 `anon`/`authenticated`에
  grant되어 있어 방어적으로 함께 정리했다. RLS 자체가 여러 테이블에서 비활성화
  되어 있는 문제(9단계 대상)는 이번 범위에서 다루지 않았다.

## 로컬 검증

- 신규 스크립트 `scripts/check-template-entitlement.ts`(`npm run check:template-entitlement`)로
  문서의 6개 시나리오를 실제 `/api/template-access` 라우트 호출로 검증했다.
  draft/archived 시나리오는 `template_access` grant가 있는 사용자로도 거부되는지까지
  확인한다.
- `check:template-studio:api`, `check:template-studio:persistence` 재실행으로
  이번 변경이 Template Studio 쪽에 회귀를 일으키지 않았음을 확인했다.
- `tsc --noEmit`, 변경/신규 파일 ESLint 통과.
- 원격 DB는 변경하지 않았다.

