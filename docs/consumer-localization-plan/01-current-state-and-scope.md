# 01. 현황, 범위, 기존 결정 통합

## 1. 조사 기준

2026-07-30 저장소 상태를 정적 조사한 결과다. 숫자는 번역 작업량의 절대
견적이 아니라 현재 분산 정도를 보여 주는 기준선이다.

| 항목                                             | 확인 결과 |
| ------------------------------------------------ | --------: |
| 관리자 제외 `page.tsx`                           |     107개 |
| Legacy `/time-table` 실행 페이지                 |      81개 |
| `/team-time-table` 실행 페이지                   |       7개 |
| 관리자 제외 API route                            |      53개 |
| 한국어 문자열이 존재하는 관리자 제외 TS/TSX 파일 |     567개 |
| Studio runtime copy interface key                |      72개 |

주석과 템플릿 저작 텍스트도 포함되므로 567개 파일을 모두 message catalog로
옮겨야 한다는 뜻은 아니다. 먼저 문자열 소유권을 분류해야 한다.

## 2. 현재 구현

### 2.1 전역 서비스

- `src/app/layout.tsx`
  - 정적 한국어 metadata를 사용한다.
  - `<html lang="kr">`로 되어 있는데 웹 표준 locale ID는 `ko`가 맞다.
  - Geist의 `latin` subset만 선언되어 한국어·일본어 glyph와 줄바꿈은 시스템
    fallback에 의존한다.
  - `body` className에 `$antialiased` 오타가 있어 Tailwind `antialiased`가
    적용되지 않는다. 다국어 작업과 무관한 기존 결함이지만 같은 파일을
    Phase 1에서 수정하므로 함께 처리한다.
- `src/middleware.ts`
  - maintenance 모드일 때 `/` 이외 모든 경로를 `/`로 redirect한다.
  - matcher가 `api`, `_next/static`, `_next/image`, `favicon.ico`, 일부 이미지
    확장자만 제외한다. **`/admin`은 제외 대상이 아니다.**
  - Next.js는 프로젝트당 미들웨어 파일 하나만 허용하므로, locale 라우팅
    미들웨어를 새로 추가하는 것이 아니라 이 파일에 합성해야 한다.
- `src/app/(root)/layout.tsx`
  - `ClientProviders` 아래에 `AuthProvider`만 제공한다.
  - 전역 locale provider는 없다.
- `public/manifest.json`
  - 앱 이름·설명과 `lang: "ko-KR"`이 정적이다.
  - `start_url: "/"`이다.
- `next.config.ts`
  - locale routing 설정이 없다.
  - PWA가 모든 HTTP 요청을 하나의 `offlineCache`에 `NetworkFirst`로 저장한다.

### 2.2 일반 소비자 UI

다음 대표 파일은 UI 카피, 상태명, 날짜/가격 포맷을 직접 포함한다.

- 메인: `src/app/(root)/page.tsx`,
  `src/components/LandingPage/**`, `src/app/(root)/_constants/index.ts`
- 공통 내비게이션: `src/components/LandingPage/NavBar.tsx`,
  `src/components/BackButton.tsx`
- 인증: `src/app/(root)/auth/**`, `src/components/auth/**`,
  `src/contexts/AuthContext.tsx`
- 상점: `src/app/(root)/shop/**`, `src/components/shop/**`
- 마이페이지: `src/app/(root)/my-page/page.tsx`,
  `src/components/my-page/**`
- 포트폴리오/주문/보조 화면:
  `src/app/(root)/portfolio/**`, `custom-order/**`, `work-schedule/**`,
  `mobile-install/**`, `access-denied/**`

문자열은 한국어만 있는 경우와 영어 UI 안에 한국어가 섞인 경우가 함께 있다.
예를 들어 `NavBar.tsx`는 `SHOP`, `My Page`, `Log Out`을 사용하지만 접근성
라벨은 한국어다. 화면의 현재 표시 언어만으로 source locale을 추론하면 안 된다.

### 2.3 데이터 흐름

프론트엔드의 서버 상태는 대체로 다음 구조를 따른다.

```text
Page/UI → React Query hook → Service → /api → Supabase
```

예를 들어 상점은 `usePublicTemplates(sortOrder)`가
`ShopService.getPublicTemplates(sortOrder)`를 호출한다. 현재 query key와
API 요청에는 locale이 없으므로 API가 locale별 상품 콘텐츠를 반환하기 시작하면
서로 다른 언어의 cache가 섞일 수 있다.

API route와 service는 한국어 문장을 오류 계약으로 직접 사용한다. 대표 예:

- `src/services/shopService.ts`
- `src/app/api/shop/templates/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/user/templates/route.ts`

서버 문장을 그대로 사용자에게 노출하는 방식은 locale별 UI 번역과 안정적인
클라이언트 분기를 동시에 어렵게 한다.

### 2.4 사용자 선호 locale

`users` 테이블과 `AuthContext.User`에는 locale 필드가 없다. 로그인/토큰 검증
응답도 `id`, `email`, `name`, `role` 중심이다.

전역 선호는 없지만 Studio runtime 전용으로 다음 브라우저 저장이 존재한다.

```text
query: ?lang=ko|en|ja
localStorage: temis.platform.locale
cookie: temis_platform_locale
```

### 2.5 Studio 템플릿

`src/utils/template-studio/runtime-i18n.ts`에 다음 기반이 이미 구현되어 있다.

- `StudioRuntimeLocale = "ko" | "en" | "ja"`
- 지원 locale guard와 browser locale 정규화
- ko/en/ja typed copy
- locale별 날짜와 요일 포맷
- URL query → localStorage → cookie → browser locale → `en` 우선순위

`TemplateStudioRuntimeShell`이 locale state를 소유하고
`TemplateStudioRuntimeForm`에 prop으로 전달한다. 사용자 실행 페이지의
loading/error/retry 카피는 `template-studio-run-client.tsx`에 한국어로 따로
남아 있다.

같은 파일의 `getLocalizedStudioAddEntryDisabledReason()`은 영어 원문 문자열을
분기 조건으로 사용한다.

```ts
if (reason === "Enable Multi Status to add entries") return copy.enableMultiToAdd;
if (reason === "Maximum entries reached") return copy.maximumEntriesReached;
if (reason === "Select a day first") return copy.selectDayFirst;
```

이는 아래 §4에서 유지한다고 정한 "원문을 번역 key로 사용하지 않는다" 규칙의
기존 위반 사례다. 상위 코드가 사유를 문장 대신 안정적인 code로 반환하도록
바꿔야 하며, Phase 3 Studio 작업에 포함한다.

Studio document의 저작 텍스트는 현재 단일 문자열이다.

- `StudioTemplateDocument.metadata.name/description`
- `StudioInputDefinition.label/description/placeholder`
- `StudioSelectOption.label`
- timetable day/status label
- canvas static text

따라서 플랫폼 UI만 세 언어로 바뀌고 템플릿 저작 라벨은 한 언어로 남는 혼합
상태가 정상적으로 발생한다.

### 2.6 Legacy 템플릿

Legacy 렌더에는 이미 `kr | en | jp`가 있다.

```ts
type TLanOpt = "kr" | "en" | "jp";
```

`src/utils/time-table/data.ts`의 `weekdays`와 `months`, 각 템플릿
`_settings/settings.ts`의 `weekdayOption`/`monthOption`이 캔버스 날짜 표기를
결정한다. 이것은 서비스 UI locale이 아니라 템플릿 디자인 설정이다.

공통 편집 UI는 `src/components/TimeTable/**`에 있지만 다음 텍스트가 함께
섞여 있다.

- 공통 플랫폼 버튼/모달/상태
- 템플릿별 placeholder와 input label
- 캔버스에 실제로 출력되는 요일·월·상태 텍스트
- 일부 템플릿에 복제된 전용 컴포넌트의 문장

81개 템플릿을 일괄 치환하면 디자인 출력과 사용자 저장 흐름을 깨뜨릴 위험이
크므로 공통 UI → 파일럿 템플릿 → 예외 템플릿 순서가 필요하다.

PNG 저장 경로는 두 엔진이 서로 다른 라이브러리를 쓴다. 렌더 결과에 영향을 주는
변경을 검증할 때 한쪽 결과로 다른 쪽을 갈음할 수 없다.

| 경로               | 구현 지점                                                   | 라이브러리                     |
| ------------------ | ----------------------------------------------------------- | ------------------------------ |
| Legacy 시간표 저장 | `src/hooks/useTimeTableState.ts`의 `downloadImage()`         | `modern-screenshot` `domToPng` |
| Studio 런타임 저장 | `template-studio-runtime-shell.tsx`의 `savePreviewImage()`   | `html-to-image` `toPng`        |

`src/components/TimeTable/TweetPreviewModal.tsx`도 `html-to-image`를 쓰지만 어느
곳에서도 import되지 않는 미사용 파일이다. 다국어 작업 범위에 포함하지 않고,
정리는 별도 과제로 둔다.

### 2.7 소비자 콘텐츠 컬럼의 실사용 범위

base 스키마에는 상품 콘텐츠 컬럼이 실제 화면보다 많다. 번역 대상을 스키마
기준으로 정하면 화면에 나오지도 않는 컬럼을 번역하게 된다.

실제 렌더링 지점:

| 화면            | 파일                                    | 읽는 콘텐츠 필드                                                                    |
| --------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| 상점 목록 카드  | `src/app/(root)/shop/page.tsx`          | `templates.name`, `templates.description`, `artists.name`, plan `price`              |
| 상점 상세       | `src/components/shop/TemplateDetailContent.tsx` | `templates.name`, `templates.description`, `shop_templates.detailed_description`, `shop_templates.purchase_instructions`, plan 기능, plan `price` |
| 구매 신청 모달  | `src/app/(root)/shop/[id]/page.tsx`     | `templates.name`, `templates.description`, plan 기능, plan `price`                   |
| 포트폴리오      | `src/app/(root)/portfolio/**`           | `portfolios.title`, `portfolios.description`, `portfolios.category`                 |

존재하지만 소비자 화면에서 읽지 않는 콘텐츠 컬럼:

| 컬럼                             | 상태                                                     |
| -------------------------------- | -------------------------------------------------------- |
| `shop_templates.title`           | 소비자 화면이 `templates.name`을 사용한다                |
| `shop_templates.features`        | `text[]`로 존재하지만 렌더링 지점이 없다                 |
| `shop_templates.requirements`    | 렌더링 지점이 없다                                       |
| `templates.detailed_description` | 상세는 `shop_templates.detailed_description`만 사용한다   |
| `template_products.*`            | `shop_templates`와 중복된 레거시 테이블                  |

plan 기능 문구는 DB 텍스트가 아니라 `template_plans`의 `is_artist`,
`is_memo`, `is_multi_schedule`, `is_guerrilla`, `is_offline_memo` boolean에서
파생된다. 그리고 같은 boolean에 대해 두 화면이 서로 다른 한국어를 쓴다.

```text
TemplateDetailContent.getPlanFeatures()  →  "팬아트 아티스트명 작성 기능"
PurchaseModal (shop/[id]/page.tsx)       →  "아티스트 이미지 지원"
```

따라서 plan 기능은 translation table이 아니라 message catalog 대상이다. 정본은
**상세 화면 문구로 확정**되었고 구매 모달을 그에 맞춰 재작성한다. 전체 대응표는
[06 §9.1](./06-general-domain-i18n-implementation-plan.md#91-plan-기능-한국어-정본-확정)에
있다.

## 3. 문자열 소유권

모든 발견 문자열은 다음 중 하나로 분류한다.

| 분류           | 예                            | 처리                                 |
| -------------- | ----------------------------- | ------------------------------------ |
| 플랫폼 UI      | 로그인, 저장, 다시 시도, 정렬 | message catalog로 이동               |
| 도메인 enum    | 주문 상태, 템플릿 plan 기능   | 값은 유지하고 표시명만 번역          |
| 포맷           | 날짜, 가격, 개수, 상대 시각   | 공통 formatter 사용                  |
| 운영 콘텐츠    | 상품명, 설명, 포트폴리오      | translation table에서 locale별 조회  |
| 사용자 콘텐츠  | 방송 제목, 메모, 작가명       | 원문 보존, 자동 번역 금지            |
| 템플릿 저작 UI | input label, placeholder      | 활성 템플릿에 명시적 locale map 필수 |
| 템플릿 캔버스  | 로고, 장식 문구, 고정 텍스트  | 활성 템플릿에 검수된 명시 번역 제공  |
| 내부 로그      | 서버 오류 문맥, 진단          | 안정적인 개발자용 문장 유지          |
| 코드 주석      | 구현 설명                     | 번역 대상 아님                       |

## 4. 기존 다국어 문서에서 승계하는 결정

### 그대로 유지

- 전역 표준 locale은 `ko`, `en`, `ja`다.
- legacy `kr/en/jp`와 플랫폼 locale을 직접 동일 타입으로 만들지 않는다.
- 번역 key는 원문이 아니라 semantic key를 사용한다.
- locale별 dictionary key 완전성을 자동 검사한다.
- 사용자 작성 input은 자동 번역하지 않는다.
- canvas static text는 기계 번역하지 않고 제작자가 제공한 검수 번역만 사용한다.
- locale 문자열 길이 차이에 대한 반응형/시각 검증을 수행한다.

### 전역 계획에서 확장

| 기존 Studio 결정              | 전역 목표                                   |
| ----------------------------- | ------------------------------------------- |
| Shell이 locale state 소유     | locale route/provider가 소유                |
| `?lang`가 공유 링크 source    | `/ko`, `/en`, `/ja` path가 canonical source |
| runtime 전용 typed dictionary | 도메인별 전역 message catalog               |
| fallback `en`                 | 소비자 서비스 fallback `ko`                 |
| 계정 저장 없음                | 로그인 사용자는 `preferred_locale` 동기화   |
| route middleware 제외         | 소비자 route에 locale segment 적용          |
| 외부 dependency 없음          | 전체 규모를 위해 `next-intl` PoC 후 도입    |

### 역사 문서의 역할

기존 Studio 문서는 해당 기능이 만들어진 이유와 당시 검증 내용을 기록하는
구현 이력이다. 이 통합 계획은 기존 문서를 수정해 현재와 과거를 섞지 않고,
최종 전역 상태로 이동하는 adapter와 제거 단계를 정의한다.

## 5. 비목표와 경계

### locale과 지역 설정을 분리한다

`ko`, `en`, `ja`는 UI 언어다. 다음을 자동으로 바꾸지 않는다.

- 결제 통화: 계속 KRW
- 사용자의 방송 시간: 입력한 wall-clock 값 유지
- 서비스 운영 시간대: 초기에는 기존 정책 유지
- 템플릿의 `weekdayOption`/`monthOption`: 디자인 설정 유지

### 번역과 콘텐츠 제작을 분리한다

message catalog는 제품 UI를 위한 것이고 DB translation은 상품/포트폴리오 같은
운영 콘텐츠를 위한 것이다. 사용자 입력과 템플릿 캔버스 텍스트를 message
catalog에 넣지 않는다.

### 관리자 제외를 지킨다

소비자 locale routing은 `/admin`에 적용하지 않는다. 관리자 UI가 consumer
message provider에 의존하게 만들지 않는다. 다만 translation row를 생성하는
최소 도구는 별도 작업으로 연결할 수 있다.

## 6. 우선순위

### P0

- locale route와 전역 source of truth
- 공통 navigation/auth/error
- 상점 → 구매 요청 → 마이페이지 → 템플릿 실행
- Studio runtime locale 통합
- Legacy 공통 편집 UI
- message 누락/잘못된 locale 차단

### P1

- 상품/포트폴리오 DB 콘텐츠
- 사용자 선호 locale의 계정 저장
- 맞춤 주문/구매 이력/작업 일정
- 이메일과 PWA metadata
- SEO alternate/canonical
- CJK 폰트 로딩 전략 ([02 §11](./02-locale-routing-and-messages.md#11-폰트와-typography))

### P2

- 리뷰 원문/번역 병기 정책
- pseudo-locale과 자동 screenshot diff 고도화
- 사용자 timezone/통화 선택

모든 활성 Legacy/Studio 템플릿의 저작 라벨과 소비자 노출 정적 문구는 P0/P1
출시 범위다. 번역이 없는 템플릿은 해당 locale에서 비공개로 처리한다.
