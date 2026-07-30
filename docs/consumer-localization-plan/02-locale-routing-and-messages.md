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

### 6.3 타입과 fallback

- ko catalog를 구조 기준으로 사용한다.
- en/ja에 누락·추가 key가 있으면 CI를 실패시킨다.
- production UI에서 locale 간 runtime fallback을 하지 않는다.
- catalog load 자체가 실패하면 오류를 기록하고 `ko` fail-safe 페이지를
  제공하되 해당 locale 출시 관문을 실패 처리한다.
- 테스트용 pseudo-locale은 production locale allowlist에 넣지 않는다.

## 7. Studio runtime 통합

이행 중에는 기존 `runtime-i18n.ts`를 adapter로 유지한다.

1. 전역 `AppLocale`과 Studio locale type의 동일성을 정적 검사한다.
2. `TemplateStudioRuntimeShell`의 `useState("en")`, storage/cookie/query 판정,
   selector persistence를 제거한다.
3. shell은 `useLocale()`과 전역 language selector를 사용한다.
4. `StudioRuntimeCopy` key를 `studio-runtime.json`으로 옮긴다.
5. formatter 함수는 전역 formatter를 사용하되 timetable date의 UTC 계산
   규칙은 기존 utility에 남긴다.
6. 기존 `?lang` URL은 route compatibility redirect로만 처리한다.
7. 두 릴리스 동안 adapter test를 유지한 뒤 중복 상수와 copy map을 제거한다.

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
