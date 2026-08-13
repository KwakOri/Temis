# 04. 화면군별 마이그레이션 계획

## 1. 작업 원칙

- route 이동, middleware 합성, message 추출, UI 수정, 폰트 변경, DB migration을
  한 commit에 섞지 않는다.
- 각 화면군은 한국어 회귀 → 영어 → 일본어 → 반응형 순으로 검증한다.
- Page/UI → React Query hook → Service → API 구조를 유지한다.
- locale별 데이터 조회는 hook query key부터 API까지 locale을 명시적으로 전달한다.
- 템플릿 엔진별 변경은 Studio와 Legacy를 분리한다.
- 관리자 경로를 consumer locale provider에 의존시키지 않는다.
- 번역 착수 전에 한국어 원문을 먼저 정본화한다. 같은 의미의 문구가 화면마다
  다르면 번역 대상이 3배로 늘어난다.
- 렌더링 지점이 확인된 필드만 번역 대상으로 삼는다.

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
- 호환 계층 제거 기준을 정하기 위한 기준선 계측 시작
  - `?lang` query 유입량
  - unprefixed consumer URL 직접 유입량 (외부 링크·북마크·이메일)
  - `temis.platform.locale` localStorage 읽기 발생량
- plan 기능 한국어 원문 통일안 확정
  ([03 §2.2](./03-content-and-template-contracts.md#22-상점-전용-콘텐츠))
- 폰트 전략 선택: CJK 웹폰트 도입 또는 시스템 fallback stack 명시
  ([02 §11](./02-locale-routing-and-messages.md#11-폰트와-typography))

### 완료 조건

- 메인 → 로그인 → 상점 → 상세 → 구매 요청 → 마이페이지 → 템플릿 실행의
  현재 동작이 자동 또는 재현 가능한 수동 절차로 기록된다.
- 발견 문자열에 owner와 target phase가 있다.
- source text를 번역 key로 사용하지 않는 규칙이 합의된다.
- 호환 계층 제거 기준의 기준선 수치가 존재한다. 계측 없이 "충분히 낮아지면
  제거"로 남기지 않는다.
- plan 기능 문구의 정본이 하나로 정해진다. 두 화면의 서로 다른 한국어를 그대로
  두고 번역을 시작하지 않는다.

## 3. Phase 1 — 전역 locale 기반

### 3.1 route/layout

- consumer route를 `[locale]` 아래로 이동
- admin root와 consumer root 분리
- locale validation/not-found
- unprefixed/`?lang` compatibility redirect
- `/admin`, `/api`, assets matcher 제외
- `<html lang>`을 `ko/en/ja`로 수정

### 3.2 middleware 합성

`src/middleware.ts`는 이미 maintenance 모드 redirect를 담당하고 있고 Next.js는
미들웨어 파일을 하나만 허용한다. locale 라우팅을 새 파일로 추가할 수 없으므로
이 파일을 수정하는 것이 Phase 1의 독립 작업 단위다. 설계는
[02 §2.4](./02-locale-routing-and-messages.md#24-기존-middleware와의-합성)를 따른다.

- 제외 경로 판정을 maintenance/locale 판정보다 먼저 수행
- maintenance redirect 목적지를 `/` → `/{resolvedLocale}`로 변경
- maintenance 통과 조건을 "pathname이 `/`"에서 "pathname이 locale 루트"로 변경
- matcher에 `/admin`, `/fonts`, `/icons`, `/landing`, `manifest*`, `robots.txt`,
  `sitemap.xml` 제외 추가
- matcher 정규식만으로 판정하지 않고 함수 안에서 allowlist 재판정
- `next-intl` 미들웨어를 도입하는 경우 단독 export하지 않고 locale 판정
  단계에서 호출하는 형태로 감싸기

이 작업은 route 이동과 같은 commit에 넣지 않는다. maintenance 모드를 켠 상태와
끈 상태를 각각 검증해야 하므로 별도 diff로 유지한다.

### 3.3 provider/messages

- `next-intl` PoC
- `src/i18n/**` 기반 파일과 ko catalog 생성
- locale-aware navigation wrapper
- 공통 formatter
- 전역 language selector
- 기존 locale cookie 호환

### 3.4 링크/보호 라우트

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

### 3.5 폰트와 root layout 정리

[02 §11](./02-locale-routing-and-messages.md#11-폰트와-typography)의 결정을
적용한다. 렌더 결과가 바뀌는 변경이므로 번역 commit과 분리한다.

- Phase 0에서 택한 폰트 전략 적용 (CJK 웹폰트 subset 또는 시스템 fallback stack)
- `font-family` 정의를 한 곳으로 모으기
- `src/app/layout.tsx`의 `$antialiased` 오타 수정
- 위 변경 전후로 PNG 비교
  - Legacy 시간표 저장 (`useTimeTableState.downloadImage()`, `modern-screenshot`)
  - Studio 런타임 저장 (`savePreviewImage()`, `html-to-image`)

`$antialiased`를 고치면 `body`에 Tailwind `antialiased`가 실제로 적용되기 시작해
텍스트 두께가 변한다. 단순 오타 수정으로 다루지 않고 PNG 회귀 확인을 함께
수행한다. 두 저장 경로가 서로 다른 라이브러리를 쓰므로 한쪽만 확인하지 않는다.

PNG 비교용 파일럿을 고를 때 자체 CSS에서 `html`에 폰트 스무딩을 이미 지정한
템플릿(`f156601a-...`, `24a5b103-...`)만 보면 변화가 없어 잘못된 결론이 난다.
지정이 없는 템플릿을 최소 하나 포함한다.

### 완료 조건

- `/ko`가 기존 `/`와 기능적으로 같다.
- 기존 bookmark와 returnUrl이 locale-prefixed URL로 안전하게 이동한다.
- admin/API/static asset이 redirect loop에 빠지지 않는다.
- maintenance 모드 on/off 두 상태에서 locale redirect가 loop 없이 동작하고
  maintenance redirect가 locale을 보존한다.
- 새로고침 전후 locale과 `<html lang>`이 같다.
- 영어/일본어 route는 feature flag가 꺼진 상태에서 공개되지 않는다.
- 폰트 변경 전후 파일럿 템플릿 PNG 차이가 검토·승인된다.

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
- KRW formatter 적용 (`₩` 문자열 결합과 `toLocaleString()` 직접 호출 제거)
- enum/plan 기능을 message key로 표시
  - `template_plans`의 boolean 5개를 `shop.planFeatures.*` key로 이동
  - 상세 화면과 구매 모달이 같은 key를 쓰도록 통합
  - Phase 0에서 확정한 한국어 정본을 ko catalog source로 사용
- locale content API와 content fallback 표시
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
- `getLocalizedStudioAddEntryDisabledReason()`의 영어 원문 분기 제거
  - entry 추가 불가 사유를 `MULTI_REQUIRED` / `MAX_ENTRIES` /
    `DAY_NOT_SELECTED` code로 반환하도록 상위 코드 변경
  - UI가 code로 message key를 조회
  - 원문을 번역 key로 쓰는 마지막 잔존 지점이므로 catalog 이관과 같은 단계에서 처리
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
5. 파일럿 통과 후 해당 locale에 노출할 활성 템플릿 전체 (§11의 Phase 3b)

1~4는 규모가 고정이고 5는 공개 대상 템플릿 수에 비례한다. 5를 착수하기 전에
각 locale에 공개할 활성 템플릿 목록을 확정한다.

각 파일럿과 후속 활성 템플릿에서:

- 기존 localStorage key와 저장값 유지
- input label/placeholder locale resolver
- 캔버스 `weekdayOption/monthOption` 불변
- ko/en/ja 조작 UI screenshot
- 결과 PNG pixel/size 회귀 확인

### 완료 조건

- Studio와 Legacy 플랫폼 UI가 현재 URL locale과 일치한다.
- locale 변경으로 사용자 runtime/form 저장값이 초기화되지 않는다.
- 해당 locale에 공개할 활성 템플릿의 저작 라벨·정적 문구 번역이 완료된다.
- 사용자 입력과 legacy output language는 locale 변경으로 임의로 바뀌지 않는다.
- `/my-page` back link가 현재 locale을 유지한다.
- 관리자 Studio Preview가 consumer provider 없이 계속 동작한다.

## 6. Phase 4 — 데이터와 계정 선호

### 선행 작업: 응답 shape 정리

translation join을 추가하기 **전에** 소비자 공개 API의 응답 shape를 고정한다.
[03 §3.1](./03-content-and-template-contracts.md#31-응답-shape-계약)의 계약을
적용하는 단계다.

- `src/app/api/shop/templates/route.ts` 등 소비자 공개 route의 `select("*")`를
  필요한 컬럼 명시로 전환
- 응답 타입에서 소비자가 쓰지 않는 콘텐츠 컬럼 제거
- 이 변경만으로 기존 한국어 화면이 동일하게 동작하는지 확인

같은 commit에서 translation join까지 추가하면 "번역이 안 붙은 것"과 "필드가
빠진 것"을 구분할 수 없다. 순서를 지킨다.

### migration

- `users.preferred_locale`
- `template_translations` (`name`, `description`)
- `shop_template_translations` (`detailed_description`, `purchase_instructions`)
- `portfolio_translations` (`title`, `description`)
- 필요한 index, constraint, updated_at trigger

translation table 컬럼은 [03 §2.0](./03-content-and-template-contracts.md#20-필드-소유권)의
소유권 표를 따른다. `shop_templates.title`, `features`, `requirements`,
`templates.detailed_description`은 소비자 렌더링 지점이 없어 번역 대상이 아니다.

### API/service

- locale preference endpoint
- locale별 상점/포트폴리오/사용자 템플릿 조회
- 응답에 `content_locale` 포함, base 텍스트 컬럼 동시 반환 금지
- translation `draft/reviewed/published` 공개 조건
- stable error code
- Supabase generated type 갱신

### 데이터 backfill

- 기존 base text를 `ko` translation으로 복사하고 검증 후 `published` 처리
- row count와 null/duplicate 검사
- en/ja는 `draft` import → 검수 → `reviewed` → 승인 후 `published`
- base column은 rollback 기간 동안 유지

### 완료 조건

- 빈 로컬 DB reset과 원격 복제 데이터 기반 migration이 모두 통과한다.
- ko translation row 수가 공개 base row 수와 일치한다.
- translation이 없어도 기존 한국어 서비스가 동작한다.
- 다른 사용자 locale을 body의 user id로 변경할 수 없다.
- 원격 DB는 사용자 명시 요청 전까지 변경하지 않는다.
- `en`/`ja` 공개 응답에 base 한국어 텍스트 컬럼이 포함되지 않는다.

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
- 미번역 포트폴리오는 해당 locale에서 비공개이고 `published` 번역만 표시된다.

## 8. Phase 6 — 출시

- locale별 feature flag
- 내부 사용자/테스트 계정에서 en 먼저 canary
- ja canary
- 번역 미완료 상품·포트폴리오·템플릿의 locale별 비공개 확인
- locale별 sitemap/hreflang 공개
- 기존 unprefixed URL redirect 활성화
- PWA cache version bump
- error code/content fallback/404/redirect loop/redirect chain 길이 모니터링
- 안정화 후 Studio localStorage 호환 write 제거
- 두 릴리스 후 `?lang` canonical 사용과 중복 runtime dictionary 제거

## 9. 예상 변경 영역과 소유 단위

| 작업 단위          | 주 변경 위치                     | 독립 검증              |
| ------------------ | -------------------------------- | ---------------------- |
| routing foundation | `src/app`, locale routing 파일   | redirect/matcher/build |
| middleware 합성    | `src/middleware.ts`              | maintenance on/off × locale redirect |
| message foundation | `src/i18n`, provider             | key parity/ICU/type    |
| 폰트/typography    | `src/app/layout.tsx`, 폰트 정의  | 파일럿 PNG diff        |
| API 응답 shape     | 소비자 공개 API route/타입       | 기존 ko 화면 무변화    |
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
- locale 미들웨어를 별도 파일로 추가해 기존 maintenance 미들웨어를 대체
- 공개 응답에서 base 한국어 컬럼과 translation 컬럼을 함께 반환
- 렌더링 지점이 없는 콘텐츠 컬럼을 번역 대상에 포함
- 폰트·`antialiased` 변경을 번역 commit에 섞기
- 한국어 원문이 화면마다 다른 상태에서 번역 착수

## 11. 규모 기준선

절대 공수 견적이 아니라 phase 간 우선순위를 비교하기 위한 상대 규모다. 수치는
[01 §1](./01-current-state-and-scope.md#1-조사-기준)의 조사 기준선을 사용한다.

| Phase              | 주 변경 대상                     | 상대 규모 | 규모를 결정하는 요인                          |
| ------------------ | -------------------------------- | --------- | --------------------------------------------- |
| 0. 기준선          | 문서·스크립트·계측               | 소        | inventory 분류 판단                           |
| 1. 기반            | route 이동 107 page + middleware | 대        | route 이동의 import/링크 수정 범위            |
| 2. 핵심 일반 UI    | 랜딩·인증·상점·마이페이지        | 대        | 문자열 추출량과 화면당 검증                   |
| 3. 템플릿 UI       | Studio + Legacy 공통 + 파일럿 4개 | 중        | 파일럿까지만. 활성 템플릿 전체는 별도         |
| 3b. 템플릿 확산    | 활성 Legacy/Studio 템플릿        | 가변      | **활성 템플릿 수에 선형 비례**                |
| 4. 운영 콘텐츠     | migration·API·backfill           | 중        | 공개 상품·포트폴리오 row 수                   |
| 5. 보조 접점       | 맞춤 주문·포트폴리오·이메일      | 중        | 이메일 템플릿 수                              |
| 6. 출시            | flag·검증·모니터링               | 소        | locale 수 × E2E matrix                        |

Phase 3b를 별도로 분리한 이유는 이 단계만 템플릿 수에 비례해 늘어나기
때문이다. Legacy 템플릿 디렉터리는 81개이고 각 템플릿이 독립 diff와 PNG 회귀
검증을 갖는다. 나머지 phase는 화면 수가 고정이지만 3b는 "해당 locale에 무엇을
공개할지"에 따라 범위가 결정된다.

따라서 출시 범위를 줄이는 가장 효과적인 방법은 phase를 건너뛰는 것이 아니라,
각 locale에 공개할 활성 템플릿 목록을 먼저 좁히는 것이다. 이 목록은 Phase 0에서
정하고 Phase 3b 착수 전에 확정한다.
