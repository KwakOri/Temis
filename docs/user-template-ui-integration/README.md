# 사용자 템플릿 UI 통합 개발 계획

최종 수정: 2026-08-05  
상태: 01~04단계 완료, M1 로컬 내 템플릿 사용 가능 달성

## 1. 목표

로컬 Supabase에 연결된 개발 환경에서 사용자가 자신에게 권한이 있는 템플릿을
찾고, 구분하고, 실행하고, 결과를 만드는 전체 UI 흐름을 완성한다.

지원 대상은 다음 세 종류다.

| 사용자 노출 종류 | 데이터 분류                                         | 실행 경로               |
| ---------------- | --------------------------------------------------- | ----------------------- |
| Legacy 시간표    | `template_engine=legacy`, `template_kind=null`      | `/time-table/{id}`      |
| Studio 시간표    | `template_engine=studio`, `template_kind=timetable` | `/template-studio/{id}` |
| Studio 썸네일    | `template_engine=studio`, `template_kind=thumbnail` | `/thumbnail/{id}`       |

이번 계획은 이미 구현된 제작·발행 시스템을 사용자용 마이페이지, 상점, 구매,
권한 및 런타임 UI에 연결하는 작업이다. Thumbnail Studio나 Template Studio의
관리자 편집 기능을 다시 설계하지 않는다.

## 2. 최상위 원칙: 로컬 우선

개발과 검증의 기준은 로컬 Supabase다.

```text
저장소 migration
→ 로컬 Supabase
→ 로컬 API·권한 검증
→ 사용자 UI 구현
→ 로컬 브라우저 E2E
→ 기능 안정화
→ 원격 DB 반영 검토
```

- 원격 Supabase 미반영은 1~7단계의 시작을 막지 않는다.
- `npm run dev:local`이 제공하는 로컬 DB·API·Auth 환경을 기준으로 작업한다.
- 원격 데이터 복제가 필요하지 않은 작업에서는 `npm run db:restore:remote`를
  사용하지 않는다.
- 원격 `db push --linked`, migration repair, rollback은 8단계 전에는 실행하지
  않는다.
- 8단계에서도 사용자 명시 승인 없이 원격 DB를 변경하지 않는다.

## 3. 목표 사용자 흐름

### 구매 사용자

```text
상점에서 템플릿 탐색
→ 종류와 제공 기능 확인
→ 구매 요청
→ 관리자 승인
→ template_access 생성
→ 마이페이지에서 템플릿 확인
→ 종류별 사용자 런타임 실행
```

### 작가 사용자

```text
template_artists로 사용자 계정 연결
→ 마이페이지의 내 작업물에서 확인
→ 종류별 사용자 런타임 실행
```

### 맞춤 제작 사용자

```text
관리자가 특정 사용자에게 template_access 부여
→ 마이페이지에서 개인 템플릿 확인
→ 종류별 사용자 런타임 실행
```

## 4. 데이터와 권한 불변식

- 공통 비즈니스 식별자는 항상 `templates.id`다.
- `is_public`은 일반 판매/맞춤 제작 분류이며 이용 권한이 아니다.
- 일반 사용자의 실행 권한은 `template_access` 또는 연결 작가 여부로 판정한다.
- 관리자는 공통 entitlement 판정에서 우회할 수 있다.
- `draft`와 `archived` 템플릿은 일반 사용자 목록과 런타임에서 제외한다.
- UI는 엔진과 종류를 추측하지 않고 API 응답의 `template_engine`,
  `template_kind`, `use_href`를 사용한다.
- 썸네일 사용자 입력은 초기 범위에서 결과 파일을 서버에 저장하지 않는다.
  이미지 입력은 현재 계약대로 동일 브라우저 IndexedDB에 보관한다.

상세 결정은 [현재 상태와 확정 결정](./00-decisions-and-current-state.md)을 따른다.

## 5. 애플리케이션 계층

프로젝트의 Next.js 데이터 계층을 유지한다.

```text
Page / UI component
→ React Query hook
→ browser service
→ Next.js API route
→ server service
→ local Supabase
```

- Page와 UI 컴포넌트에서 직접 `fetch`나 Supabase 호출을 추가하지 않는다.
- 서버 상태는 React Query로 관리한다.
- mutation 후 갱신할 query key를 단계 문서에 명시한다.
- 이미지는 `next/image`가 아닌 `<img>`를 사용한다.
- 기본 스타일은 Tailwind CSS, 재사용 컴포넌트 variant는 `cva`를 우선한다.

## 6. 단계별 문서

0. [현재 상태와 확정 결정](./00-decisions-and-current-state.md)
1. [로컬 DB·API 개발 기준선](./01-local-db-api-baseline.md)
2. [사용자 템플릿 계약과 공용 카드](./02-consumer-contract-and-cards.md)
3. [마이페이지 통합 UI](./03-my-page-unified-ui.md)
4. [카탈로그 대표 이미지 파이프라인](./04-catalog-cover-pipeline.md)
5. [상점·상품 종류별 UX](./05-shop-and-product-kind-ux.md)
6. [권한·구매·관리자 연결 UI](./06-entitlement-purchase-admin-ui.md)
7. [로컬 E2E·회귀 검증과 레거시 경계](./07-local-e2e-and-legacy-boundary.md)
8. [원격 DB 최종 반영](./08-remote-db-rollout.md)

각 단계를 별도 개발 작업으로 지시할 때는
[단계별 개발 실행 명령문](./execution-prompts/README.md)을 사용한다.

의존 순서는 다음과 같다.

```text
00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08
```

3단계 마이페이지는 4단계 대표 이미지 업로드 기능을 기다리지 않는다. 2단계에서
정의한 fallback으로 먼저 실사용 가능하게 만든 뒤, 4단계에서 관리자가 실제
대표 이미지를 등록·갱신할 수 있게 한다. 발행본 기반 자동 생성은 후속 개선으로
분리한다.

## 7. 단계 상태

| 단계                 | 상태             | 핵심 산출물                                                                  |
| -------------------- | ---------------- | ---------------------------------------------------------------------------- |
| 00. 결정·현황        | 재검증 완료      | 범위, 용어, 라우트, 권한 계약·코드 대조                                      |
| 01. 로컬 기준선      | 완료             | [01 결과](./01-local-db-api-baseline.md), schema/API checker, fixture 가이드 |
| 02. 사용자 계약·카드 | 완료             | 정규화 타입, 이미지 resolver, 공용 카드, consumer checker                    |
| 03. 마이페이지       | 완료             | Legacy registry, 통합 카드·필터·상태, cache 갱신, browser smoke              |
| 04. 대표 이미지      | 완료             | Studio `thumbnail_url` 관리자 업로드·교체·삭제 흐름                          |
| 05. 상점·상품        | 대기             | 종류별 탐색·상세·상품 설정 UI                                                |
| 06. 권한·구매        | 대기             | 사용자/관리자 권한·승인 UX                                                   |
| 07. 로컬 E2E         | 대기             | 브라우저 수직 흐름 및 레거시 경계 확정                                       |
| 08. 원격 반영        | 최종 단계로 보류 | 승인된 migration·smoke test·rollback                                         |

단계를 시작하거나 완료할 때 README와 해당 단계 문서의 상태, 검증 결과를 함께
갱신한다.

## 8. 마일스톤

### M1. 로컬에서 내 템플릿 사용 가능

1~3단계 완료 상태다.

- 세 템플릿 종류가 마이페이지에 나타난다.
- 잘못된 레거시 경로로 이동하지 않는다.
- 대표 이미지가 없어도 카드가 깨지지 않는다.
- 미권한 사용자는 런타임에 접근할 수 없다.

### M2. 로컬에서 구매부터 사용까지 연결

4~6단계 완료 상태다.

- 상점에서 종류를 구분하고 구매할 수 있다.
- 관리자가 승인하거나 직접 권한을 부여할 수 있다.
- 승인 후 마이페이지 캐시가 올바르게 갱신된다.

### M3. 로컬 출시 후보

7단계 완료 상태다.

- 구매자, 작가, 맞춤 사용자, 미권한 사용자 시나리오가 통과한다.
- 모바일·데스크톱에서 핵심 UI가 동작한다.
- Legacy 시간표 회귀가 없다.

### M4. 원격 배포 후보

8단계 완료 상태다. M3 전에는 시작하지 않는다.

## 9. 전체 완료 조건

- [ ] 로컬 DB에서 Legacy 시간표, Studio 시간표, Studio 썸네일을 한 사용자
      계정으로 각각 실행할 수 있다.
- [ ] 마이페이지가 엔진·종류·권한 출처를 올바르게 표현한다.
- [ ] 카드 이미지 실패가 페이지 레이아웃이나 탐색을 깨뜨리지 않는다.
- [ ] 상점과 상품 UI가 썸네일에 시간표 전용 기능을 표시하지 않는다.
- [ ] 구매 승인과 직접 권한 부여가 동일한 사용자 목록·실행 결과로 이어진다.
- [ ] UI에서 직접 Supabase 또는 직접 HTTP 호출이 추가되지 않는다.
- [ ] 관련 TypeScript, lint, check 스크립트와 브라우저 E2E가 통과한다.
- [ ] 원격 반영 전 백업, migration 순서, smoke test, rollback 절차가 승인된다.

## 10. 관련 문서

- [템플릿 시스템 통합](../template-system-integration/README.md)
- [Template Hub 개발](../template-hub-development/README.md)
- [Thumbnail Studio 개발](../thumbnail-studio/README.md)
- [Thumbnail Studio 사용자 런타임](../thumbnail-studio/05-runtime-export.md)
- [Thumbnail Studio 저장·카탈로그](../thumbnail-studio/06-persistence-catalog.md)

## 11. 00단계 재검증 결과

2026-08-04에 실제 Page, React Query hook, browser service, API route, server service, 핵심 runtime route와 관련 migration을 대조했다. 핵심 계약인 `template_access`/`template_artists` 기반 사용자 목록, `published` 제한, `getTemplateUseHref()`의 세 실행 경로, Studio timetable/thumbnail runtime 분기, `is_public`과 entitlement 분리, canonical 구매 승인 RPC의 원자적 access upsert는 확인됐다.

Legacy route는 03단계에서 실제 UUID page 83개 registry와 fail-closed 소비자
필터로 경계를 확정했다. 로컬 migration 적용 상태는 01단계 disposable reset과
checker로 검증했으며, 두 차단 항목 모두 해결됐다.

01단계에서 남긴 empty DB migration 검증은 disposable local DB에서 `supabase db reset --local --no-seed --yes`로 실제 수행했고, 전체 migration 적용 및 01단계 aggregate 재검증까지 통과했다. 따라서 01단계를 완료 상태로 승격하고 02단계 구현을 시작한다.

## 12. 01단계 검증 결과

2026-08-05에 disposable local DB에서 `supabase db reset --local --no-seed --yes`를 실행해 전체 migration을 빈 DB에 적용했다. 이후 `check-01-all.sh` 전체 8단계와 TypeScript, lint, diff 검증을 재실행해 통과했다. 원격 Supabase는 읽거나 변경하지 않았다.

01단계 산출물은 [migration 결과](./01-migration-result.md),
[fixture 가이드](./01-fixture-guide.md), [API 결과](./01-api-test-results.md),
[수동 검증 목록](./01-manual-verification.md),
[사용자 템플릿 응답 예시](./01-user-template-response-sample.json)다.

구매 plan checker 수정 후 사후 read-only 확인 결과는 다음과 같다.

```text
plan_check_user=0
plan_check_templates=0
```

01단계 완료 조건을 충족했으므로 02단계 소비자 계약·공용 카드 구현으로 진행했다.

## 13. 02단계 소비자 계약·공용 카드 결과

2026-08-05에 02단계 구현과 순수 함수·SSR 카드 검증을 완료했다. 기존 마이페이지 전체 교체는 03단계 범위로 남기고, service와 공용 UI가 사용할 소비자 계약을 먼저 고정했다.

구현 산출물은 다음과 같다.

- `src/utils/templates/consumer-template.ts`
  - `ConsumerTemplateSummary`와 snake_case raw row 정규화
  - `legacy + template_kind=null`을 `timetable`로 변환
  - 알 수 없는 engine/kind, 잘못된 `is_public`, 내부 경로가 아닌 `use_href`를 제외
  - `accessSource`, `plan`, `thumbnailUrl`, `coverUrl`을 소비자 필드로 제공
  - `thumbnail_url` 우선, Legacy 시간표만 `/thumbnail/{id}.png` fallback
- `src/services/userService.ts`
  - `/api/user/templates` 응답을 정규화하고 각 `UserTemplate`에 `consumer`를 제공
- `src/components/templates/template-kind-badge.tsx`
- `src/components/templates/template-cover.tsx`
- `src/components/templates/consumer-template-card.tsx`
  - `cva` surface/state variant
  - API가 제공한 `consumer.useHref`를 실제 `Link` href로 사용
  - 네트워크 호출·router·route 재계산 없이 badge, CTA, placeholder, image error fallback 제공
- `scripts/check-consumer-template-contract.tsx`
  - normalizer/resolver와 SSR 카드 markup 검증
- `package.json`
  - `check:user-template-ui:consumer` 명령 추가

02단계 검증 결과:

```text
npm --prefix .. run check:user-template-ui:consumer  PASS
npx tsc --noEmit                                      PASS
대상 npm run lint                                     PASS
대상 npx prettier --check                             PASS
git -C .. diff --check                                PASS
```

검증은 `scripts/` 디렉터리를 working directory로 사용했으며, DB·환경변수·원격 Supabase가 필요 없는 계약/SSR checker로 실행했다. production build와 브라우저 E2E는 프로젝트 규칙 및 후속 단계 범위에 따라 실행하지 않았다.

03단계 연결 인터페이스:

- `useUserTemplates`의 `UserTemplate.consumer`를 `ConsumerTemplateCard`의 `template` prop으로 전달한다.
- 03단계 UI는 raw `templates.*`, `access_source`, `template_plan`을 다시 해석하지 않고 `ConsumerTemplateSummary`만 사용한다.
- 실행 시 `template.useHref`를 그대로 사용하며, 카드에서 Legacy/Studio route를 추론하지 않는다.
- `surface="myPage"`, `state` variant와 `showEngineBadge`/`showAccessSource` 옵션은 통합 UI의 탭·상태 표시를 연결할 수 있는 경계다.

03단계에서 해결한 후속 항목:

- 일반 Legacy dynamic route 대신 실제 UUID page 83개 registry를 고정하고,
  registry 밖 Legacy row는 소비자 normalizer에서 fail-closed로 제외했다.
- 실제 이미지 `onError` fallback, keyboard focus/Enter, 모바일 1열·overflow를
  Playwright browser smoke로 검증했다.
- 마이페이지를 `UserTemplate.consumer`와 `ConsumerTemplateCard` 기반 통합 목록으로
  교체했다.

04단계 이후에 남은 범위:

- 관리자 대표 이미지 업로드·갱신
- 상점 구매와 관리자 권한 UI의 종류별 UX
- 83개 Legacy route 및 구매·승인·실행 전체 수직 회귀

따라서 02단계의 소비자 계약을 03단계 마이페이지에 연결했고, M1 완료 조건을
충족했다.

## 14. 03단계 마이페이지 통합 UI 결과

2026-08-05에 Legacy route registry, 공용 소비자 카드 기반 마이페이지 목록,
전체/시간표/썸네일 필터, 영역별 loading/error/empty 상태와 권한 mutation cache
invalidation을 구현했다. Studio runtime 실패 상태에는 `/my-page` 복귀 링크를
추가했다.

Legacy는 실제 UUID page 83개만 허용하고 registry 밖 row를 소비자 normalizer에서
제외한다. raw 사용자 템플릿 API 계약과 기존 팀 템플릿 시스템은 변경하지 않았다.

bcrypt local fixture와 `playwright@1.62.1` checker로 다음을 확인했다.

- 실제 로그인과 사용자 템플릿 API: `purchase=2 artist=1 total=3`
- desktop `1440x900`, mobile `390x844`에서 필터·중복·cover fallback·키보드
  실행·세 종류 route·1열/overflow
- 별도 비작가 사용자에서 팀 템플릿 노출과 기존 `/team-time-table/{id}` 이동
- Legacy registry 83개와 실제 route 비교 `missing=0`
- consumer checker, TypeScript, 대상 lint/Prettier, `git diff --check`

브라우저 성공 출력은 다음과 같다.

```text
03 my-page desktop/mobile and team-template browser smoke passed.
```

최종 cleanup은 사용자, 개인 템플릿, 팀·팀 템플릿·멤버·관계 모두 0건을
확인했다. 상세 구현과 명령은 [03단계 문서](./03-my-page-unified-ui.md)에 기록했다.
원격 Supabase, production build, git stage/commit/push, 04단계는 실행하지 않았다.

## 15. 04단계 카탈로그 대표 이미지 결과

2026-08-05에 Studio 시간표·썸네일의 관리자 catalog cover 업로드 경로를 구현했다.
기존 상품 관리 화면에서 파일을 선택하면 관리자 인증 API가 MIME/크기와 Studio
종류를 검증하고, R2 managed key를 생성해 `templates.thumbnail_url`을 갱신한다.
교체·삭제는 DB 갱신과 R2 자산 수명주기를 분리하며, 외부 URL이나 Legacy 정적
cover는 임의 삭제하지 않는다.

- 허용 형식: PNG, JPEG, WebP
- 최대 크기: 10MB
- managed prefix: `uploads/catalog-covers/{templateId}/`
- API: `POST/DELETE /api/admin/templates/{id}/catalog-cover`
- 관리자 UI: `/admin/template-products/{templateId}`
- 상점 상세도 마이페이지와 같은 resolver/placeholder를 사용하며 Studio 템플릿에
  Legacy `/thumbnail/{id}.png` fallback을 적용하지 않는다.
- published 문서 기반 자동 생성과 사용자 썸네일 결과 서버 저장은 계속 후속 범위다.

계약 checker, TypeScript, Prettier, `git diff --check`, local fixture create/cleanup과
03단계 local browser smoke는 통과했다. 실제 R2 업로드/교체/삭제와 관리자 catalog-cover
browser smoke는 dev server 및 R2 환경이 필요한 별도 smoke로 남겨 두었다.

## 16. 04단계 local DB + remote R2 격리 smoke 결정

04단계 catalog cover smoke는 원격 Supabase를 사용하지 않는다. local Supabase fixture의
`templates.thumbnail_url`만 갱신하고, R2 객체만 원격 bucket의 별도 test prefix에 저장한다.

- production 기본 key: `uploads/catalog-covers/{templateId}/{uuid}.{ext}`
- smoke key: `uploads/catalog-covers/_test/<run-id>/{templateId}/{uuid}.{ext}`
- `CATALOG_COVER_R2_PREFIX`는 단일 test run prefix만 허용한다.
- `npm run cleanup:catalog-cover:test:r2`는 dry-run이 기본이며,
  `--apply`와 동일한 명시적 test prefix가 있어야 삭제한다.
- cleanup 도구는 R2 list/delete만 수행하고 Supabase metadata를 읽거나 변경하지 않는다.

따라서 실제 remote R2 smoke를 실행하더라도 test run prefix 전체를 나중에 한 번에
삭제할 수 있고, production catalog cover prefix는 cleanup 대상이 될 수 없다. 실제
원격 R2 write는 storage 변경이므로 코드·dry-run 검증 후 별도 승인 단계에서 실행한다.
