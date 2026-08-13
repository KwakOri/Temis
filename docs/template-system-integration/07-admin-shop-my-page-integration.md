# 07. 관리자·상점·마이페이지 통합

상태: 완료 (2026-07-15)

## 목적

공통 `templates` 루트 위에서 legacy와 Studio 템플릿을 동일한 상품·권한 UX에
노출하되, 편집 및 실행 route만 engine에 따라 분기한다.

## 관리자

- 목록에 Legacy/Studio engine badge와 draft/published/archived 상태를 표시한다.
- Studio 행은 Studio editor, legacy 행은 기존 관리 화면으로 연다.
- 일반 상품(`is_public = true`)만 상점 상품 등록 대상으로 유지한다.
- draft/archived 템플릿은 판매 시작과 사용자 실행을 막는다.

## 상점

- 목록 노출은 `shop_templates.is_shop_visible`로만 판단한다.
- `is_public`은 일반 판매 상품 검증에 사용하지만 이용 권한을 부여하지 않는다.
- 구매 완료 후 access가 생성돼야 실행 링크가 활성화된다.

## 마이페이지

- 사용자 템플릿 API가 `template_engine`, `status`, `use_href`를 반환한다.
- legacy 실행: `/time-table/{templateId}`
- Studio 실행: 신규 사용자용 Studio route
- 현재의 `일반`/`개인` 표시는 `is_public` 상품 분류를 그대로 사용한다.
- draft/archived는 일반 사용자 목록에서 제외한다.

## 완료 조건

- 한 사용자의 legacy/Studio 구매 항목이 한 목록에서 보인다.
- engine별 실행 링크가 정확하다.
- 상점 노출, 상품 분류, 이용 권한이 서로 혼동되지 않는다.

## 실제 변경 사항

조사 결과 사용자용 Studio 실행 페이지 자체가 존재하지 않아(레거시 `/v2-template`는
완전히 다른 스키마·무인증 경로) 8단계와 함께 진행했다. 8단계에서 만든
`/template-studio/{id}` 런타임 페이지를 그대로 재사용해 "Studio 실행" 링크를
완성했다.

- **관리자** (`src/components/admin/TemplateManagement.tsx`)
  - 템플릿 행(데스크톱 테이블 + 모바일 카드)에 Legacy/Studio engine badge와
    draft/published/archived 상태 badge를 추가했다(`renderEngineStatusBadges`).
  - `handleGoToTemplate`이 engine으로 분기한다: Studio 행은
    `/admin/template-studio/{id}/edit`(에디터)로, legacy 행은 기존
    `/time-table/{id}`로 새 탭에서 연다.
  - `toggleShopVisibility`가 `hasLinkedArtist` 검사에 더해
    `isPublishedTemplate`(=`status==='published'`) 검사를 추가해 draft/archived
    템플릿의 판매 시작을 막는다. 버튼 라벨도 "판매 불가(게시 필요)"/"판매
    불가(작가 필요)"로 원인을 구분해 표시한다.
  - 상점 상품 등록 API(`/api/admin/shop-templates` POST)는 조사 결과 이미
    `is_public` 검증이 있어 변경하지 않았다.
- **상점** (`src/services/shopService.ts`, `src/services/templateDetailService.ts`)
  - `shop_templates` 조회에 `.eq("templates.status", "published")`를 추가했다
    (`templates!inner` 조인이라 임베디드 리소스 필터가 적용된다). draft/archived
    템플릿은 `is_shop_visible=true`여도 더 이상 상점에 노출되지 않는다.
  - 로컬에서 `is_shop_visible=true`인 실제 행 하나를 임시로 `status='draft'`로
    바꿔 `ShopService.getPublicTemplates()` 결과에서 빠지는지 확인 후 원복했다.
- **마이페이지** (`src/app/api/user/templates/route.ts`, `src/services/userService.ts`,
  `src/app/(root)/my-page/page.tsx`)
  - `template_access`/`template_artists` 조인 select에 `template_engine`,
    `status`를 추가하고, `status !== 'published'`인 행을 응답에서 제외한다.
  - 각 템플릿에 `use_href`를 계산해 붙인다(`src/utils/template-links.ts`의
    `getTemplateUseHref`: studio → `/template-studio/{id}`, legacy →
    `/time-table/{id}`).
  - `handleTemplateClick`이 하드코딩된 `/time-table/{id}` 대신
    `template.use_href`를 사용하도록 변경했다(값이 없을 때만 legacy 경로로
    fallback).
  - `일반`/`개인` 표시는 기존과 동일하게 `is_public`을 그대로 사용하며 변경하지
    않았다.

## 로컬 검증

- `tsc --noEmit`, 변경 파일 ESLint 통과.
- `npm run check:template-entitlement`, `npm run check:template-studio:persistence`,
  `npm run check:template-studio:runtime` 재실행으로 회귀가 없음을 확인했다.
- 임시 스크립트로 `ShopService.getPublicTemplates()`가 draft 템플릿을 제외하고
  정상 응답함을 직접 확인했다(스크립트는 검증 후 삭제).
- 관리자 목록 UI(badge/버튼 분기)는 컴포넌트 단위로 코드 확인했으며, 실제
  브라우저 조작 테스트는 수행하지 않았다.
- 원격 DB는 변경하지 않았다.

