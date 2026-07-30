# 04. 화면군별 마이그레이션 계획

## 1. 작업 원칙

- route 이동, message 추출, UI 수정, DB migration을 한 commit에 섞지 않는다.
- 각 화면군은 한국어 회귀 → 영어 → 일본어 → 반응형 순으로 검증한다.
- Page/UI → React Query hook → Service → API 구조를 유지한다.
- locale별 데이터 조회는 hook query key부터 API까지 locale을 명시적으로 전달한다.
- 템플릿 엔진별 변경은 Studio와 Legacy를 분리한다.
- 관리자 경로를 consumer locale provider에 의존시키지 않는다.

## 2. Phase 0 — 기준선과 도구

### 변경

- consumer route/컴포넌트/API의 사용자 노출 문자열 inventory 생성
- 문자열을 플랫폼/enum/format/DB/user/template/log/comment로 분류
- 제품 용어집 작성
  - Temis 표기
  - 템플릿, 시간표, 휴방, 게릴라, 멀티, 작가, 구매 요청
  - 주문 상태와 plan 기능
- 현재 한국어 핵심 흐름의 browser E2E 기준 고정
- message key parity/ICU parse 검사 스크립트 설계

### 완료 조건

- 메인 → 로그인 → 상점 → 상세 → 구매 요청 → 마이페이지 → 템플릿 실행의
  현재 동작이 자동 또는 재현 가능한 수동 절차로 기록된다.
- 발견 문자열에 owner와 target phase가 있다.
- source text를 번역 key로 사용하지 않는 규칙이 합의된다.

## 3. Phase 1 — 전역 locale 기반

### 3.1 route/layout

- consumer route를 `[locale]` 아래로 이동
- admin root와 consumer root 분리
- locale validation/not-found
- unprefixed/`?lang` compatibility redirect
- `/admin`, `/api`, assets matcher 제외
- `<html lang>`을 `ko/en/ja`로 수정

### 3.2 provider/messages

- `next-intl` PoC
- `src/i18n/**` 기반 파일과 ko catalog 생성
- locale-aware navigation wrapper
- 공통 formatter
- 전역 language selector
- 기존 locale cookie 호환

### 3.3 링크/보호 라우트

우선 변경 대상:

- `src/components/BackButton.tsx`
- `src/components/LandingPage/NavBar.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/ProtectedLink.tsx`
- `src/components/auth/TemplateProtectedRoute.tsx`
- `src/components/auth/TeamTemplateProtectedRoute.tsx`
- `src/utils/template-links.ts`
- `src/utils/routeUtils.ts`
- `src/utils/pageAwareLocalStorage.ts`
- `src/components/TimeTable/TimeTableControls.tsx`
- `src/components/TimeTable/MobileHeader.tsx`

### 완료 조건

- `/ko`가 기존 `/`와 기능적으로 같다.
- 기존 bookmark와 returnUrl이 locale-prefixed URL로 안전하게 이동한다.
- admin/API/static asset이 redirect loop에 빠지지 않는다.
- 새로고침 전후 locale과 `<html lang>`이 같다.
- 영어/일본어 route는 feature flag가 꺼진 상태에서 공개되지 않는다.

## 4. Phase 2 — 핵심 일반 사용자 여정

### 4.1 공통/메인

대상:

- `src/app/(root)/page.tsx`
- `src/components/LandingPage/**`
- `src/app/(root)/_constants/index.ts`
- `src/components/MaintenanceMode.tsx`
- `src/components/PWAInstallPrompt.tsx`

작업:

- 내비게이션, CTA, 랜딩 section, empty/loading/error 추출
- key feature data를 locale catalog 또는 locale별 content module로 이동
- 리뷰 원문/번역 정책 적용
- locale별 metadata
- language selector desktop/mobile 통합

### 4.2 인증/보호 UI

대상:

- `src/app/(root)/auth/**`
- `src/components/auth/**`
- `src/contexts/AuthContext.tsx`
- `src/app/(root)/access-denied/page.tsx`
- `src/app/api/auth/**`

작업:

- 폼 label/placeholder/validation/error code화
- email verification/reset 흐름의 locale 보존
- 로그인·로그아웃 후 localized returnUrl
- `EMAIL_NOT_VERIFIED` 같은 기존 code를 공통 오류 namespace로 통합
- logout overlay 번역

### 4.3 상점

대상:

- `src/app/(root)/shop/page.tsx`
- `src/app/(root)/shop/[id]/page.tsx`
- `src/components/shop/TemplateDetailContent.tsx`
- `src/hooks/query/useShop.ts`
- `src/services/shopService.ts`
- `src/app/api/shop/templates/**`

작업:

- sort/filter/loading/error/empty/purchase 카피 추출
- `usePublicTemplates(locale, sortOrder)`로 전환
- query key에 locale 포함
- KRW formatter 적용
- enum/plan 기능을 message key로 표시
- locale content API와 fallback 표시
- 구매 mutation 후 locale별 list/detail cache invalidate

### 4.4 마이페이지

대상:

- `src/app/(root)/my-page/page.tsx`
- `src/components/my-page/**`
- `src/components/shop/PurchaseHistory.tsx`
- `src/components/shop/CustomOrderHistory.tsx`
- `src/components/shop/OrderDetailsModal.tsx`
- `src/app/api/user/templates/route.ts`
- 구매/주문 history API

작업:

- 탭, 템플릿 구분, 주문 상태, empty/error/modal 번역
- user template list의 locale content 조회
- `use_href`는 locale-neutral로 받고 UI에서 localize
- 날짜/가격 formatter 통합
- Twitter 연결 오류 code화

### 완료 조건

- ko/en/ja에서 회원가입·로그인·로그아웃이 된다.
- 상점 list/detail의 message와 DB 콘텐츠 언어가 일치한다.
- 가격의 숫자 형식은 locale별이지만 금액/통화는 KRW로 동일하다.
- 구매 요청 후 마이페이지에 같은 템플릿이 표시된다.
- 다른 locale의 React Query cache가 순간적으로 노출되지 않는다.

## 5. Phase 3 — 템플릿 실행 화면

### 5.1 Studio

대상:

- `src/utils/template-studio/runtime-i18n.ts`
- `src/app/(root)/template-studio/_components/runtime/**`
- `src/app/(root)/template-studio/_components/template-studio-run-client.tsx`
- `src/hooks/query/useTemplateStudio.ts`
- `src/services/templateStudioRuntimeService.ts`

작업:

- shell의 독립 locale state/persistence 제거
- 전역 `studio-runtime` catalog 연결
- run-client loading/error/retry 추출
- 관리자 Preview의 locale prop fallback 추가
- 기존 `?lang`, storage, cookie 호환 test
- Studio document localization v7 adapter/validator

회귀:

- runtime values 저장/재조회
- week 이동과 UTC date parts
- crop/IndexedDB 이미지
- PNG 저장
- 접근 권한

### 5.2 Legacy 공통 UI

대상:

- `src/components/TimeTable/**`
- `src/components/ImageCropModal.tsx`
- `src/contexts/TimeTableContext*`
- 공통 field renderer와 save/team/twitter modal

작업:

- 공통 플랫폼 message 추출
- formatter 연결
- locale-aware link
- 템플릿 input config와 플랫폼 UI의 경계 분리
- `TLanOpt` adapter test

### 5.3 Legacy 파일럿

파일럿 구성:

1. 기본 single 일정 템플릿
2. multi/offline memo/addon 템플릿
3. team 템플릿
4. 필요 시 thumbnail 템플릿

각 파일럿에서:

- 기존 localStorage key와 저장값 유지
- input label/placeholder locale resolver
- 캔버스 `weekdayOption/monthOption` 불변
- ko/en/ja 조작 UI screenshot
- 결과 PNG pixel/size 회귀 확인

### 완료 조건

- Studio와 Legacy 플랫폼 UI가 현재 URL locale과 일치한다.
- locale 변경으로 사용자 runtime/form 저장값이 초기화되지 않는다.
- canvas authored text와 legacy output language가 임의로 바뀌지 않는다.
- `/my-page` back link가 현재 locale을 유지한다.
- 관리자 Studio Preview가 consumer provider 없이 계속 동작한다.

## 6. Phase 4 — 데이터와 계정 선호

### migration

- `users.preferred_locale`
- `template_translations`
- `shop_template_translations`
- `portfolio_translations`
- 필요한 index, constraint, updated_at trigger

### API/service

- locale preference endpoint
- locale별 상점/포트폴리오/사용자 템플릿 조회
- stable error code
- Supabase generated type 갱신

### 데이터 backfill

- 기존 base text를 `ko` translation으로 복사
- row count와 null/duplicate 검사
- en/ja는 검수된 데이터만 import
- base column은 rollback 기간 동안 유지

### 완료 조건

- 빈 로컬 DB reset과 원격 복제 데이터 기반 migration이 모두 통과한다.
- ko translation row 수가 공개 base row 수와 일치한다.
- translation이 없어도 기존 한국어 서비스가 동작한다.
- 다른 사용자 locale을 body의 user id로 변경할 수 없다.
- 원격 DB는 사용자 명시 요청 전까지 변경하지 않는다.

## 7. Phase 5 — 보조 소비자 접점

### 화면

- `src/app/(root)/custom-order/**`
- `src/components/shop/CustomOrderForm.tsx`
- `src/app/(root)/portfolio/**`
- `src/app/(root)/work-schedule/page.tsx`
- `src/app/(root)/mobile-install/page.tsx`
- `src/components/mobile/**`

### 지원 기능

- 인증/비밀번호/권한 부여 이메일
- PWA manifest/name/description/install 안내
- maintenance/offline/update prompt
- portfolio category/filter/pagination
- custom order deadline/date/price

### 완료 조건

- 주문 deadline의 날짜가 locale별로 표시되며 원 날짜가 바뀌지 않는다.
- 설치 안내의 OS/browser 고유 메뉴명은 locale별 실제 제품 표기와 일치한다.
- locale별 이메일 링크가 같은 locale의 consumer route로 열린다.
- 포트폴리오 fallback 콘텐츠의 원문 언어가 정책대로 표시된다.

## 8. Phase 6 — 출시

- locale별 feature flag
- 내부 사용자/테스트 계정에서 en 먼저 canary
- ja canary
- locale별 sitemap/hreflang 공개
- 기존 unprefixed URL redirect 활성화
- PWA cache version bump
- error code/translation fallback/404/redirect loop 모니터링
- 안정화 후 Studio localStorage 호환 write 제거
- 두 릴리스 후 `?lang` canonical 사용과 중복 runtime dictionary 제거

## 9. 예상 변경 영역과 소유 단위

| 작업 단위          | 주 변경 위치                     | 독립 검증              |
| ------------------ | -------------------------------- | ---------------------- |
| routing foundation | `src/app`, locale routing 파일   | redirect/matcher/build |
| message foundation | `src/i18n`, provider             | key parity/ICU/type    |
| general UI         | Landing/Auth/common              | interaction/visual     |
| shop/my-page       | hooks/services/API/pages         | query cache/E2E        |
| Studio             | runtime shell/form/i18n          | 기존 studio checks     |
| Legacy             | shared TimeTable + 파일럿 폴더   | 저장/PNG/screenshot    |
| DB content         | migrations/types/server services | reset/backfill/API     |
| email/PWA          | email templates/manifest         | snapshot/install smoke |

## 10. 구현 중 금지할 일

- 관리자까지 locale route 아래로 함께 이동
- 모든 한국어 literal을 정규식으로 일괄 치환
- API가 요청 locale에 따라 서로 다른 번역 문장만 반환
- locale을 React Query key에서 누락
- 템플릿의 `kr/en/jp`를 전역 `ko/en/ja`로 기계 치환
- locale 변경 시 runtime value/localStorage namespace 변경
- 검수되지 않은 machine translation을 공개 상품 설명에 바로 반영
- 원격 Supabase migration 자동 적용
