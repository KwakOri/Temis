# 02. locale, 라우팅, 메시지 아키텍처

## 1. locale 계약

```ts
export const locales = ["ko", "en", "ja"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ko";
```

| App locale | Intl locale | legacy adapter |
| ---------- | ----------- | -------------- |
| `ko`       | `ko-KR`     | `kr`           |
| `en`       | `en-US`     | `en`           |
| `ja`       | `ja-JP`     | `jp`           |

외부 입력은 반드시 allowlist로 검증한다. locale 값을 그대로 파일 import path,
DB column, redirect URL에 연결하지 않는다.

## 2. URL 정책

### 2.1 canonical URL

소비자 페이지는 기본 언어를 포함해 항상 prefix를 가진다.

```text
/ko
/en/shop
/ja/my-page
/en/template-studio/{templateId}
/ko/time-table/{templateId}
```

장점:

- 공유 링크만으로 표시 언어가 결정된다.
- SSR의 `<html lang>`과 metadata가 최초 응답부터 정확하다.
- 같은 콘텐츠의 언어별 canonical/hreflang을 만들 수 있다.
- client mount 이후 locale 변경으로 생기는 hydration mismatch와 깜빡임을 피한다.

### 2.2 prefix 제외

다음 경로는 locale redirect와 matcher에서 제외한다.

```text
/admin/**
/api/**
/_next/**
/icons/**
/fonts/**
/landing/**
/manifest*
/robots.txt
/sitemap.xml
```

정적 파일은 확장자와 public asset allowlist를 함께 사용해 제외한다. 단순히
점(`.`)이 있다는 이유만으로 모든 경로를 제외하면 동적 slug의 예외가 생길 수
있으므로 matcher 테스트를 둔다.

### 2.3 기존 URL 호환

기존 unprefixed consumer URL은 제거하지 않고 308 redirect한다.

```text
/shop                  → /{resolvedLocale}/shop
/time-table/{id}       → /{resolvedLocale}/time-table/{id}
/?lang=en              → /en
/template-studio/{id}?lang=ja → /ja/template-studio/{id}
```

`?lang` 이외의 query는 보존한다. `returnUrl`도 locale path를 포함한 내부
상대 경로인지 검증하고 보존한다.

이행 기간의 unprefixed locale 결정 순서:

1. 유효한 `?lang`
2. `temis_platform_locale` cookie
3. 이행용 `temis.platform.locale` 값을 cookie로 옮긴 상태
4. `Accept-Language`
5. `ko`

`localStorage`는 server routing에서 읽을 수 없으므로 최초 이행용 client
bridge가 한 번 cookie로 복사한다. 이후에는 쓰지 않고 두 릴리스 뒤 읽기
지원도 제거한다.

### 2.4 기존 middleware와의 합성

`src/middleware.ts`가 이미 존재하고 maintenance 모드 redirect를 담당한다.
Next.js는 프로젝트당 미들웨어 파일 하나만 허용하므로 locale 미들웨어를 새
파일로 추가할 수 없다. 기존 파일 안에서 두 관심사를 합성한다.

현재 동작에서 그대로 두면 깨지는 지점:

| 현재 동작                                     | locale prefix 도입 후 문제                                      |
| --------------------------------------------- | --------------------------------------------------------------- |
| maintenance 시 `/` 외 전 경로를 `/`로 redirect | `/en/shop` → `/` 로 가며 locale이 소실된다                      |
| redirect 목적지가 `/`                          | `/`는 다시 locale resolver의 redirect 대상이라 2단 redirect가 된다 |
| matcher가 `/admin`을 제외하지 않음             | locale 판정이 관리자 경로에까지 적용된다                        |
| matcher가 확장자 일부만 제외                   | `/fonts/**`, `/icons/**`, `/landing/**`, `manifest*`가 통과한다  |

확정 합성 순서:

```text
request
  │
  1. 정적/제외 경로 판정 (/admin, /api, /_next, public asset, manifest, robots, sitemap)
  │     → 즉시 next() : locale·maintenance 판정 모두 건너뛴다
  │
  2. maintenance 모드 판정
  │     → 차단 대상이면 /{resolvedLocale} 로 redirect (locale 보존)
  │     → 이미 /{locale} 루트면 next() : redirect loop 방지
  │
  3. locale 판정
        → prefixed URL이면 통과
        → unprefixed URL이면 §2.3 우선순위로 308 redirect
```

규칙:

- maintenance redirect 목적지는 `/`가 아니라 `/{resolvedLocale}`이다. locale
  결정에는 §2.3의 우선순위를 재사용한다.
- maintenance 통과 조건은 "pathname이 `/`인지"가 아니라 "pathname이 locale
  루트인지"로 바꾼다. `/ko`, `/en`, `/ja` 모두 통과해야 한다.
- 제외 경로 판정을 두 관심사보다 먼저 수행해 관리자·API·정적 자산이 어느
  쪽 redirect에도 걸리지 않게 한다.
- matcher는 negative lookahead 하나에 모든 조건을 밀어 넣지 않고, matcher로
  1차 축소한 뒤 함수 안에서 명시적 allowlist로 재판정한다. 정규식만으로
  판정하면 동적 slug와 확장자 예외를 구분하지 못한다.
- `next-intl`을 도입하는 경우에도 그 미들웨어를 단독 export하지 않고 위 3단계
  중 3번 위치에서 호출하는 형태로 감싼다.

이 합성은 maintenance 모드와 locale redirect가 동시에 켜진 조합에서만 드러나는
loop를 만들 수 있으므로 [05 §3.1](./05-quality-rollout-and-operations.md#31-locale-resolution)의
전용 테스트 대상이다.

## 3. App Router 구조

목표 구조는 소비자와 관리자의 root layout을 분리한다.

```text
src/app/
├── [locale]/
│   ├── layout.tsx          # consumer root: html/body/lang/messages
│   └── (consumer)/
│       ├── page.tsx
│       ├── shop/**
│       ├── my-page/**
│       ├── template-studio/**
│       ├── time-table/**
│       └── ...
├── (admin)/
│   └── admin/**
├── api/**
└── globals.css
```

107개 consumer page를 한 번에 내용 변경하지 않는다. 먼저 route 이동만 하고
상대 import와 CSS 경로, 보호 라우트의 pathname parser, template link를
고친 뒤 `/ko`에서 기존 한국어 동작을 검증한다. 번역 추출은 그 다음 commit
단위로 진행한다.

관리자와 consumer가 별도 root layout을 쓰면 양쪽을 오갈 때 full page load가
발생할 수 있다. 일반 소비자에게 관리자 이동은 핵심 여정이 아니므로 허용한다.
공통 global CSS와 provider 조립은 함수/컴포넌트로 공유하되 locale provider는
consumer root에만 둔다.

## 4. locale-aware navigation

직접 `next/link`, `useRouter`, `redirect`를 호출하는 consumer 코드를 전용
wrapper로 통일한다.

예정 파일:

```text
src/i18n/config.ts
src/i18n/routing.ts
src/i18n/request.ts
src/i18n/navigation.ts
src/i18n/format.ts
src/i18n/legacy-locale.ts
```

`src/i18n/navigation.ts`는 locale을 보존하는 `Link`, `useRouter`,
`redirect`, `getPathname`을 노출한다. 다음 hardcoded URL 생성도 이 계약으로
이동한다.

- `src/utils/template-links.ts`
- `src/utils/routeUtils.ts`
- `src/utils/pageAwareLocalStorage.ts`
- `ProtectedRoute`, `TemplateProtectedRoute`, `TeamTemplateProtectedRoute`
- `BackButton`, `TimeTableControls`, `MobileHeader`
- `AuthContext`의 로그인/로그아웃 후 이동
- 포트폴리오 category/page query 이동

`getTemplateUseHref()`는 DB/API가 locale이 박힌 URL을 저장하지 않도록 계속
locale-neutral path를 반환하고, UI 경계에서 localized pathname으로 바꾼다.

## 5. locale source of truth와 저장

### 5.1 요청 중 우선순위

prefixed URL의 locale이 현재 렌더의 유일한 source of truth다. 계정 선호나
cookie가 URL을 렌더 도중 덮어쓰지 않는다.

### 5.2 언어 변경

언어 selector는 다음을 원자적으로 수행한다.

1. 현재 route의 locale만 교체한다.
2. dynamic segment와 query를 보존한다.
3. `temis_platform_locale` cookie를 갱신한다.
4. 로그인 상태면 locale preference mutation을 비동기로 호출한다.
5. preference 저장 실패 시 경로 전환은 되돌리지 않고 재시도 가능한 알림만 표시한다.

### 5.3 로그인 사용자

`users.preferred_locale text null`을 추가하고 `ko/en/ja` CHECK를 둔다.

- null은 아직 명시적으로 선택하지 않았다는 뜻이다.
- 회원가입 시 현재 URL locale을 초기값으로 저장한다.
- 로그인 성공 응답은 `preferredLocale`을 반환하고 locale cookie를 설정한다.
- JWT에는 넣지 않는다. 선호가 바뀌어도 토큰 재발급이 필요 없어야 한다.
- `PUT /api/user/preferences/locale`는 token 사용자만 갱신한다.
- 명시적 prefixed URL은 DB 선호보다 우선한다.

원격 migration은 구현·로컬 검증 후 별도의 사용자 승인 없이는 적용하지 않는다.

## 6. message catalog

### 6.1 디렉터리

도메인별 namespace로 나눈다.

```text
src/i18n/messages/
├── ko/
│   ├── common.json
│   ├── navigation.json
│   ├── auth.json
│   ├── shop.json
│   ├── my-page.json
│   ├── custom-order.json
│   ├── portfolio.json
│   ├── legacy-runtime.json
│   ├── studio-runtime.json
│   └── errors.json
├── en/
└── ja/
```

페이지에는 필요한 namespace만 전달한다. 모든 메시지를 하나의 client provider
payload로 보내지 않는다.

### 6.2 key 규칙

원문을 key로 사용하지 않는다.

```json
{
  "actions": {
    "back": "뒤로가기",
    "retry": "다시 시도"
  },
  "templateCount": "{count, plural, =0 {템플릿 없음} other {템플릿 #개}}"
}
```

- namespace는 기능 영역, key는 의미를 나타낸다.
- 버튼과 명사는 문맥이 다르면 key를 분리한다.
- 문장을 조각내 JSX에서 이어 붙이지 않는다.
- 변수, 복수형, select는 ICU message 하나로 처리한다.
- HTML 문자열은 기본 금지한다. rich text가 필요하면 허용 tag callback을 사용한다.
- translator note가 필요한 message는 인접 metadata 또는 용어집에 문맥을 기록한다.

### 6.3 타입과 message fallback

이 계획에서 "fallback"은 두 개의 다른 규칙을 가리킨다. 같은 단어로 부르면
구현 시 서로의 규칙을 적용하게 되므로 문서 전체에서 아래 용어로 구분한다.

| 용어             | 대상             | 규칙                                                     | 정의 위치            |
| ---------------- | ---------------- | -------------------------------------------------------- | -------------------- |
| message fallback | message catalog  | production에서 **금지**. 누락은 CI가 차단한다            | 이 절                |
| content fallback | DB 운영 콘텐츠   | preview·rollback에서만 허용. 공개 판정에 사용하지 않는다 | [03 §2.4](./03-content-and-template-contracts.md#24-content-fallback) |

message fallback 규칙:

- ko catalog를 구조 기준으로 사용한다.
- en/ja에 누락·추가 key가 있으면 CI를 실패시킨다.
- production UI에서 locale 간 message fallback을 하지 않는다. 누락 key는
  화면에 다른 언어를 표시하는 대신 빌드/CI 단계에서 막는다.
- catalog load 자체가 실패하면 오류를 기록하고 `ko` fail-safe 페이지를
  제공하되 해당 locale 출시 관문을 실패 처리한다. 이것은 장애 대응이며
  message fallback 허용이 아니다.
- 테스트용 pseudo-locale은 production locale allowlist에 넣지 않는다.

[05 §10](./05-quality-rollout-and-operations.md#10-모니터링)의 모니터링 지표는
두 용어를 분리해 수집한다. message 계층의 지표는 "발생하면 안 되는 사건"이고,
content 계층의 지표는 "이행 기간 동안 줄여야 하는 비율"이다.

## 7. Studio runtime 통합

이행 중에는 기존 `runtime-i18n.ts`를 adapter로 유지한다.

1. 전역 `AppLocale`과 Studio locale type의 동일성을 정적 검사한다.
2. `TemplateStudioRuntimeShell`의 `useState("en")`, storage/cookie/query 판정,
   selector persistence를 제거한다.
3. shell은 `useLocale()`과 전역 language selector를 사용한다.
4. `StudioRuntimeCopy` key를 `studio-runtime.json`으로 옮긴다.
5. `getLocalizedStudioAddEntryDisabledReason()`의 영어 원문 분기를 제거한다.
   entry 추가 불가 사유를 반환하는 상위 코드가 문장 대신 안정적인 code
   (`MULTI_REQUIRED`, `MAX_ENTRIES`, `DAY_NOT_SELECTED`)를 반환하고, UI가 그
   code로 message key를 찾는다. 원문을 key로 쓰는 유일한 잔존 지점이므로
   catalog 이관과 같은 단계에서 없앤다.
6. formatter 함수는 전역 formatter를 사용하되 timetable date의 UTC 계산
   규칙은 기존 utility에 남긴다.
7. 기존 `?lang` URL은 route compatibility redirect로만 처리한다.
8. 두 릴리스 동안 adapter test를 유지한 뒤 중복 상수와 copy map을 제거한다.

관리자 Preview가 같은 runtime shell을 재사용한다는 점에 주의한다. 관리자
Preview에는 admin 고정 locale 또는 명시적 preview locale prop을 전달해
consumer provider가 없어서 깨지지 않게 한다.

## 8. formatter

다음 포맷만 공통 utility/provider를 통해 호출한다.

| 데이터         | 규칙                                                              |
| -------------- | ----------------------------------------------------------------- |
| KRW 가격       | `Intl.NumberFormat(locale, {style: "currency", currency: "KRW"})` |
| 일반 수        | locale number format                                              |
| 개수           | ICU plural                                                        |
| 날짜-only      | UTC/local 변환 없이 date parts 기반으로 locale 표시               |
| 서버 timestamp | 명시된 서비스 timezone과 locale로 표시                            |
| 상대 시간      | locale relative time formatter                                    |
| 방송 입력 시각 | 문자열 값 유지, 시간대 변환 금지                                  |

현재의 `toLocaleString()`/`toLocaleDateString("ko-KR")` 직접 호출과 `₩`
문자열 결합은 단계적으로 제거한다.

## 9. API 오류 계약

서버는 번역 문장을 분기 key로 사용하지 않는다.

이행 응답:

```json
{
  "code": "SHOP_TEMPLATES_FETCH_FAILED",
  "error": "템플릿을 가져오는데 실패했습니다.",
  "params": {}
}
```

최종 client는 `code`를 `errors.json` key로 변환한다. `error`는 구버전
클라이언트 호환 fallback으로 한동안 유지한 뒤 제거를 검토한다.

- 인증/인가의 HTTP status와 code를 분리하지 않는다.
- validation은 field별 code와 안전한 params를 반환한다.
- DB/stack/내부 식별자를 params에 넣지 않는다.
- server log는 locale과 무관한 안정적인 기술 문장을 사용한다.
- 알 수 없는 code는 `errors.unknown`으로 표시하고 원래 code를 모니터링에 남긴다.

## 10. SEO, metadata, PWA

- consumer locale root layout에서 `<html lang="ko|en|ja">`를 출력한다.
- 메인, 상점, 포트폴리오 공개 페이지는 locale별 title/description을 생성한다.
- canonical은 현재 locale URL, alternates는 준비 완료된 locale만 포함한다.
- 미번역/비공개 locale은 sitemap과 `hreflang`에서 제외한다.
- PWA manifest의 한국어 고정 name/description/lang을 locale-aware manifest
  또는 locale-neutral brand copy로 전환한다.
- `start_url: "/"`는 preference redirect entry로 유지하거나 locale별
  manifest를 제공한다. 구현 PoC에서 설치·업데이트 동작을 비교해 결정한다.
- PWA cache는 locale path/query가 cache key에 포함되는지 검증하고, rollout
  시 cache version을 올려 기존 한국어 응답의 교차 노출을 방지한다.

## 11. 폰트와 typography

### 11.1 현재 상태

`src/app/layout.tsx`는 Geist / Geist Mono를 `subsets: ["latin"]`으로만
선언한다. 한글과 일본어 glyph는 전부 OS 시스템 폰트 fallback으로 렌더링되고
있다. 즉 지금도 한국어 화면의 실제 서체는 기기마다 다르다.

일본어를 추가하면 이 문제가 커진다. 같은 문자열이 기기별로 다른 서체·자폭으로
렌더링되므로, 레이아웃 검증 결과를 재현할 수 없다.

### 11.2 결정

- 폰트는 locale별로 교체하지 않고, 하나의 fallback stack에 CJK 폰트를 추가해
  세 locale이 같은 stack을 공유한다. locale마다 다른 서체를 쓰면 언어 전환 시
  레이아웃이 흔들린다.
- 한국어·일본어 웹폰트를 새로 로드할 경우 `next/font`의 subset 지정과
  `display: swap`을 사용하고, 초기 로드 크기 예산을 먼저 정한 뒤 도입한다.
  CJK 폰트는 latin 대비 파일이 크므로 무조건 추가하지 않는다.
- 웹폰트를 추가하지 않고 시스템 fallback stack을 명시적으로 정의하는 선택도
  허용한다. 이 경우 "서체가 기기별로 다르다"는 것을 알려진 제약으로 문서화하고
  레이아웃 검증을 가장 좁은 자폭 기준으로 수행한다.
- 둘 중 어느 쪽을 택하든 `font-family` 값을 한 곳에서 정의하고 컴포넌트가
  개별적으로 폰트를 지정하지 않게 한다.

### 11.3 PNG 출력물 회귀 주의

소비자 화면에는 DOM을 PNG로 저장하는 경로가 두 개 있고, 서로 다른 라이브러리를
쓴다.

| 경로              | 구현 지점                                                    | 라이브러리                      |
| ----------------- | ------------------------------------------------------------ | ------------------------------- |
| Legacy 시간표 저장 | `src/hooks/useTimeTableState.ts`의 `downloadImage()`          | `modern-screenshot` `domToPng`  |
| Studio 런타임 저장 | `template-studio-runtime-shell.tsx`의 `savePreviewImage()`    | `html-to-image` `toPng`         |

폰트 stack이나 `-webkit-font-smoothing` 값이 바뀌면 **두 경로의 저장 결과
이미지가 모두 변한다.** 이는 `weekdayOption`/`monthOption`을 불변으로 유지하는
것과는 별개의 리스크이며, Legacy만의 문제가 아니다. 두 라이브러리는 스타일
직렬화 방식이 달라 같은 변경에도 영향 정도가 다를 수 있으므로 각각 확인한다.

따라서 폰트 관련 변경은 다음을 만족해야 한다.

- 번역 작업 commit과 분리한다.
- 변경 전후 PNG를 Legacy 파일럿 템플릿과 Studio 런타임 양쪽에서 비교한다
  ([05 §3.5](./05-quality-rollout-and-operations.md#35-template-studio),
  [05 §3.6](./05-quality-rollout-and-operations.md#36-legacy)).
- `src/app/layout.tsx`의 `$antialiased` 오타 수정도 여기에 해당한다. 오타를
  고치면 `body`에 Tailwind `antialiased`가 실제로 적용되기 시작해 텍스트 두께가
  변하므로, 단순 오타 수정으로 취급하지 않고 PNG 회귀 확인 대상에 넣는다.

영향 범위에 예외가 있다. 아래 두 Legacy 템플릿은 자체 CSS에서 `html` 선택자에
이미 `-webkit-font-smoothing: antialiased`를 전역으로 지정하고 있어 오타 수정의
영향을 받지 않는다.

```text
src/app/(root)/time-table/f156601a-2c4b-479c-bec7-19aed782d812/_styles/index.css
src/app/(root)/time-table/24a5b103-4940-427b-b9f7-f1ae766ddbdd/_styles/index.css
```

두 파일은 `html`에 전역으로 규칙을 걸기 때문에 해당 템플릿 페이지가 로드되는
동안 다른 화면에도 영향을 준다. PNG 비교 대상 파일럿을 고를 때 이 두 템플릿만
보면 "변화 없음"이라는 잘못된 결론이 나온다. 자체 CSS에 폰트 스무딩 지정이 없는
템플릿을 최소 하나 포함한다.
