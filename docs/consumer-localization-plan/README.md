# Temis 소비자 서비스 다국어 지원 통합 계획

최종 수정: 2026-07-31

## 1. 문서 목적

Temis의 관리자 화면을 제외한 소비자용 웹 서비스와 사용자가 실제로 편집하는
템플릿 실행 화면을 한국어, 영어, 일본어로 제공하기 위한 통합 계획이다.

이 문서는 기존 Template Studio 런타임의 로컬라이제이션 설계를 전역 서비스
설계로 확장한다. 기존 문서의 결정을 폐기하지 않고 다음과 같이 흡수한다.

- `ko | en | ja` 로케일 ID를 전역 표준으로 승격한다.
- 플랫폼 UI와 템플릿 저작 콘텐츠를 서로 다른 번역 경계로 유지한다.
- `temis.platform.locale`과 `temis_platform_locale`는 호환 입력으로 보존한다.
- Studio 런타임이 독립적으로 소유하던 locale 상태는 전역 locale을 소비하도록
  전환한다.
- 관리자 페이지를 제외하고 소비자에게 노출되는 제품·운영·템플릿 저작
  콘텐츠 전체를 번역한다.
- 영어·일본어는 해당 소비자 노출 범위의 번역이 끝나기 전까지 비공개로 한다.
- 검증 없이 모든 페이지를 한 번에 전환하지 않고 화면군별 완료 기준을 통과하며
  순차 배포한다.

## 2. 목표

1. 메인, 인증, 상점, 포트폴리오, 맞춤 주문, 마이페이지 등 소비자용 일반
   페이지가 같은 언어 선택과 번역 규칙을 사용한다.
2. Legacy와 Studio 템플릿 실행 화면의 플랫폼 조작 UI가 같은 언어로 표시된다.
3. URL, `<html lang>`, 메타데이터, 날짜·숫자·통화, 오류 메시지가 선택 locale과
   일치한다.
4. 템플릿 이름·설명 같은 운영 콘텐츠는 locale별 원문을 저장하고 명시적으로
   번역할 수 있다.
5. 템플릿 제작자가 제공한 라벨과 캔버스 문구는 명시적으로 번역하고, 사용자가
   작성한 이름, 메모, 방송 제목은 원문과 저장값을 유지한다.
6. 기존 한국어 서비스와 기존 템플릿 저장값·권한·구매 흐름을 깨지 않고
   점진적으로 전환한다.

## 3. 확정 범위

### 포함

| 화면군      | 대표 경로                                                       | 주요 대상                                             |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| 메인/탐색   | `/`, `/portfolio`, `/work-schedule`                             | 내비게이션, 랜딩 카피, 목록·상세, 필터, 상태          |
| 인증/계정   | `/auth`, `/auth/signup`, `/auth/verify`, `/auth/reset-password` | 폼, 검증, 오류, 리다이렉트 안내                       |
| 상점/주문   | `/shop`, `/shop/[id]`, `/custom-order`                          | 상품 메타데이터, 요금, 구매·주문 폼, 진행 상태        |
| 마이페이지  | `/my-page`                                                      | 구매/작업 템플릿, 주문 이력, 프로필, Twitter 연결     |
| 접근/설치   | `/access-denied`, `/mobile-install`                             | 보호 라우트, PWA 설치 안내                            |
| Studio 실행 | `/template-studio/[templateId]`                                 | 런타임 플랫폼 UI와 locale 저장 통합                   |
| Legacy 실행 | `/time-table/[id]`, `/team-time-table/[id]`, `/thumbnails/[id]` | 공통 편집 UI, 템플릿별 입력·정적 문구, 날짜 표시 경계 |
| 고객 접점   | 인증·권한 부여 이메일                                           | 제목, 본문, 링크의 locale                             |

### 제외

- `/admin/**` 화면의 내비게이션, 폼, 버튼, 관리자용 오류 카피 번역
- Template Studio 편집기와 관리자 Preview 자체의 전면 번역
- 사용자가 입력한 텍스트의 자동 번역
- 사용자가 입력한 콘텐츠의 기계 번역
- 환율 계산과 통화 환전
- 사용자 시간대 설정 및 방송 시간의 자동 시간대 변환
- 번역 관리 SaaS 도입
- 원격 Supabase 스키마 반영

관리자 UI 번역은 제외하지만 소비자에게 노출되는 locale별 상품 콘텐츠를
입력하기 위한 최소 데이터 계약은 포함한다. 실제 관리자 입력 UI는 후속
관리자 작업 또는 검증된 import 절차로 제공한다.

이 문서의 주요 제품 방향은 2026-07-30에 확정되었다. 2026-07-31에 계획을
코드베이스와 대조 검토해 구현 계약을 좁혔다. 확정 내용과 해석 경계는
[확정된 의사결정](./00-confirmed-decisions.md)을 기준으로 하며, 검토에서 추가된
결정은 같은 문서 §4.1에 있다.

## 4. 핵심 결정

| 항목               | 결정                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| 지원 locale        | `ko`, `en`, `ja`                                                              |
| 기본 locale        | `ko` — 현재 한국어 서비스의 기존 동작 보존                                    |
| Intl 매핑          | `ko-KR`, `en-US`, `ja-JP`                                                     |
| 소비자 URL         | locale prefix 필수: `/ko/...`, `/en/...`, `/ja/...`                           |
| 관리자/API URL     | `/admin/**`, `/api/**`를 prefix 없이 유지                                     |
| 번역 런타임        | App Router의 locale segment + `next-intl` 도입을 기본안으로 사용              |
| middleware         | 기존 `src/middleware.ts`에 maintenance·locale 판정을 합성                     |
| URL 진실 공급원    | 현재 요청의 locale path                                                       |
| 선호 저장          | cookie를 즉시 사용하고 로그인 사용자는 `users.preferred_locale`에 동기화      |
| 기존 저장 호환     | `temis_platform_locale`, `temis.platform.locale`, `?lang=`를 이행 기간에 읽음 |
| 플랫폼 메시지      | locale별 정적 message catalog                                                 |
| DB 콘텐츠          | 도메인별 translation table                                                    |
| 번역 대상 판정     | 스키마 컬럼이 아니라 실제 렌더링 지점 기준                                    |
| fallback           | `message fallback`은 production 금지, `content fallback`은 preview·rollback 한정 |
| API 오류           | 안정적인 error code를 반환하고 UI에서 번역                                    |
| API 응답           | 요청 locale 텍스트만 반환하고 base 컬럼을 함께 내려보내지 않음                |
| redirect 코드      | 이행 308, 롤백 307, maintenance 307                                           |
| 템플릿 저작 콘텐츠 | 모든 활성 소비자 템플릿에 명시적 locale 번역 제공, 사용자 입력은 원문 유지    |
| 폰트               | locale별 서체를 교체하지 않고 단일 stack을 공유                               |
| 가격               | 저장 통화인 KRW를 locale 형식으로 표시, 환전하지 않음                         |
| 시간               | 날짜/타임스탬프만 locale 포맷; 방송 시각은 wall-clock 값 유지                 |

`next-intl`은 현재처럼 작은 한 화면용 typed dictionary를 전체 서비스 규모로
확장할 때 필요한 ICU 복수형, 서버/클라이언트 메시지 사용, 날짜·숫자 포맷을
하나의 계약으로 제공하기 위한 신규 의존성 제안이다. 구현 시작 시 현재
Next.js 15.4 구성 및 PWA wrapper와의 호환성을 작은 PoC로 먼저 검증하고,
검증에 실패하면 같은 message 구조를 유지한 내부 provider로 대체한다.

## 5. 목표 구조

```text
URL /ko|en|ja
       │
       ▼
locale routing / request validation
       │
       ├── <html lang>, metadata, canonical, hreflang
       ├── server/client message catalog
       ├── locale-aware navigation
       └── formatter (date, number, KRW)
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
consumer pages          template runtimes
          │              ├── Studio platform UI
          │              └── Legacy shared UI
          ▼
services → React Query(locale in queryKey) → /api
                                              │
                                              ├── stable error code
                                              └── localized DB content
```

관리자 화면은 위 locale route tree 밖에 남는다. API도 URL locale prefix를
사용하지 않으며, locale에 따라 콘텐츠가 달라지는 조회만 명시적인 `locale`
파라미터를 받는다.

## 6. 단계 요약

| 단계            | 작업                                                                  | 배포 관문                          |
| --------------- | --------------------------------------------------------------------- | ---------------------------------- |
| 0. 기준선       | inventory, 용어집, 핵심 E2E 고정, 유입 계측, 원문 정본화, 폰트 전략 선택 | 기존 ko 회귀 테스트 통과           |
| 1. 기반         | locale route, middleware 합성, provider, catalog, formatter, navigation, 호환 redirect, 폰트 | `/ko`에서 기존 기능 동일           |
| 2. 핵심 일반 UI | 메인, 인증, 공통 보호 UI, 상점, 마이페이지                            | ko/en/ja 핵심 구매 여정 통과       |
| 3. 템플릿 UI    | Studio 전역 locale 연결, Legacy 공통 UI와 파일럿 템플릿               | 양 엔진 저장·이미지 출력 회귀 없음 |
| 4. 운영 콘텐츠  | 사용자 선호 locale, 상품·포트폴리오 translation table, locale API     | fallback과 캐시 격리 검증          |
| 5. 보조 접점    | 맞춤 주문, 작업 일정, 설치 안내, 거래 이메일                          | locale별 고객 여정 완결            |
| 6. 출시         | 시각·접근성·SEO·PWA 검증, 점진 노출, 모니터링                         | locale별 go/no-go 승인             |

영어와 일본어 경로는 해당 locale에서 소비자에게 노출할 모든 제품 UI, 운영
콘텐츠, 활성 템플릿, 거래 이메일이 준비되기 전에는 공개하지 않는다. 미번역
상태로 한국어 fallback을 보여 주는 URL을 검색엔진에 노출하지 않는다.

## 7. 문서 구성

1. [확정된 의사결정](./00-confirmed-decisions.md)
2. [현황, 범위, 기존 결정 통합](./01-current-state-and-scope.md)
3. [locale, 라우팅, 메시지 아키텍처](./02-locale-routing-and-messages.md)
4. [콘텐츠와 템플릿 번역 계약](./03-content-and-template-contracts.md)
5. [화면군별 마이그레이션 계획](./04-surface-migration-plan.md)
6. [검증, 배포, 운영 계획](./05-quality-rollout-and-operations.md)
7. [일반 도메인 en/ja 다국어 개발 계획](./06-general-domain-i18n-implementation-plan.md)

00~05는 전체 범위의 설계와 계약이다. 06은 그중 **일반 도메인만 먼저 개발하기
위한 실행 계획**이다. Template Studio 계열 작업이 진행 중이므로 파일이 겹치지
않는 영역을 우선 개발한다. 06은 개발 순서만 좁힌 것이고 공개 시점을 정하지
않는다. 현재 착수 대상은 06이다.

## 8. 기존 문서와의 관계

다음 문서는 Studio Preview V2 로컬라이제이션의 구현 이력과 세부 검증 기준으로
계속 유효하다.

- [`template-studio-preview-localization-week-global-cards-plan.md`](../template-studio-preview-localization-week-global-cards-plan.md)
- [`07-runtime-localization.md`](../template-studio-preview-v2-ui/07-runtime-localization.md)
- [`10-localization-week-global-verification.md`](../template-studio-preview-v2-ui/10-localization-week-global-verification.md)
- [`08-user-runtime-state.md`](../template-system-integration/08-user-runtime-state.md)

이 통합 계획이 변경하는 것은 적용 범위와 locale 소유권이다. Studio 내부
카피와 검증 항목은 재사용하되, 최종 상태에서는
`TemplateStudioRuntimeShell`이 URL/localStorage/cookie를 독립 판정하지 않고
전역 locale provider에서 받은 locale을 사용한다.

## 9. 전체 완료 조건

- [ ] 소비자 공개 경로가 `/ko`, `/en`, `/ja`에서 동등하게 동작한다.
- [ ] `/admin/**`와 `/api/**` 경로가 locale routing의 영향을 받지 않는다.
- [ ] maintenance 모드가 켜진 상태에서도 locale이 보존되고 redirect loop가 없다.
- [ ] 언어 변경 시 현재 페이지, path parameter, query parameter가 보존된다.
- [ ] 새로고침, 로그인, 로그아웃, 다른 기기 로그인 후 선호 locale 규칙이
      문서와 일치한다.
- [ ] `<html lang>`, canonical, `hreflang`, 페이지 metadata가 locale과 일치한다.
- [ ] message key 누락과 지원하지 않는 locale이 CI에서 차단된다.
- [ ] 상점/마이페이지의 locale별 데이터가 React Query cache에서 섞이지 않는다.
- [ ] 공개 API 응답에 base 한국어 텍스트 컬럼이 함께 실려 나가지 않는다.
- [ ] API의 사용자 노출 오류가 error code를 통해 번역된다.
- [ ] Studio와 Legacy의 모든 활성 소비자 템플릿에서 플랫폼 UI와 제작자가
      제공한 저작 문구가 번역된다.
- [ ] 사용자 입력은 locale 변경 후에도 원문과 저장값을 유지한다.
- [ ] locale별 날짜·숫자·KRW 형식이 일관되고 방송 시각 값이 변하지 않는다.
- [ ] 세 locale이 같은 폰트 stack을 사용하고 폰트 변경이 Legacy·Studio 저장
      PNG를 의도치 않게 바꾸지 않는다.
- [ ] ko/en/ja에서 인증 → 상점 → 구매 요청 → 마이페이지 → 템플릿 실행의
      핵심 브라우저 흐름을 통과한다.
- [ ] 영어·일본어에서 320px 모바일과 주요 데스크톱 폭의 레이아웃이 깨지지 않는다.
- [ ] 운영 locale을 개별적으로 비활성화할 수 있고 한국어 경로로 안전하게
      되돌릴 수 있다.

## 10. 외부 참고

- [Next.js App Router internationalization guide](https://nextjs.org/docs/app/guides/internationalization)
- [Next.js `generateMetadata` alternates](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#alternates)
- [next-intl](https://next-intl.dev/)
