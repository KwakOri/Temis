# 03. 마이페이지 통합 UI

상태: 완료 (2026-08-05)  
선행 조건: 02단계 공용 계약·카드 완료

## 1. 목표

사용자가 Legacy 시간표, Studio 시간표, Studio 썸네일을 마이페이지 한곳에서
확인하고 올바른 런타임으로 이동할 수 있게 한다.

## 2. 유지한 정보 구조

마이페이지의 기존 최상위 사용자 흐름은 유지했다.

- 구매한 템플릿
- 작가 사용자의 내 작업물
- 구매 내역
- 맞춤 주문
- 작가 계정 관리
- 팀 템플릿

구매한 템플릿과 내 작업물의 카드 영역만 `UserTemplateSection`으로 교체했다. 팀
템플릿은 별도 `team_templates` 시스템과 기존 `/team-time-table/{id}` 이동을
유지하며 공용 소비자 카드 목록에는 섞지 않았다.

## 3. 구현 결과

### 3.1 Legacy 실행 경계

- `src/utils/templates/legacy-template-routes.ts`
  - 실제 UUID `page.tsx`가 존재하는 Legacy route 83개를 registry로 고정했다.
  - `_template`과 registry 밖 UUID는 지원 대상에서 제외했다.
  - `isLegacyTemplateRouteId()`와 browser fixture용
    `LEGACY_TEMPLATE_ROUTE_FIXTURE_ID`를 제공한다.
- `src/utils/templates/consumer-template.ts`
  - `normalizeConsumerTemplate()`이 registry 밖 Legacy row를 fail-closed로
    제외한다.
  - raw `/api/user/templates` 응답 계약은 변경하지 않았다.

임의 Legacy ID를 처리하는 범용 dynamic route는 이번 단계에서 추가하지 않았다.
Legacy renderer와 preset 연결을 별도로 설계하지 않고, 실제 실행 가능한 route만
소비자 UI에 노출하는 가장 작은 경계를 선택했다.

### 3.2 공용 카드·필터·상태 UI

- `src/components/my-page/user-template-section.tsx`
  - `전체`, `시간표`, `썸네일` 필터
  - 전체 목록과 필터 결과를 구분한 빈 상태
  - 템플릿 영역 skeleton, 독립 오류와 `refetch()`, background fetching 상태
  - 모바일 1열부터 데스크톱 4열까지의 반응형 grid
  - `UserTemplate.consumer`를 `ConsumerTemplateCard`에 전달
- `src/app/(root)/my-page/page.tsx`
  - raw row의 engine/kind/route/cover 재해석과 직접 클릭 카드를 제거했다.
  - 구매/작업 탭 전환 시 `key={activeTab}`으로 종류 필터를 `전체`로 초기화한다.
  - 기존 구매 내역, 주문, 작가 관리, 팀 템플릿 구조는 유지했다.

카드는 API에서 정규화된 `useHref`를 그대로 사용한다. engine badge는 기본적으로
숨기고 시간표/썸네일 종류와 권한 출처를 우선 표시한다.

### 3.3 최신성·실패 복귀

- `useUserTemplates()`에 `refetchOnMount: "always"`를 적용했다.
- 다음 mutation 성공 시 `queryKeys.user.templates()`를 invalidate한다.
  - 구매 승인
  - 관리자 직접 권한 부여·수정·회수
  - 템플릿 작가 연결 변경
- Studio timetable과 thumbnail runtime의 오류 상태에서 `/my-page`로 돌아갈 수
  있게 했다.
- polling은 추가하지 않았다.

## 4. 로컬 fixture

`scripts/fixtures-03-create.sql`은 bcrypt hash만 저장하는 local-only fixture다.

- 구매+작가 사용자: `user-template-ui-03@temis.local`
- 비작가 팀 사용자: `user-template-ui-03-team@temis.local`
- 비밀번호: `temis-local-03`
- route-backed Legacy 시간표 1개
- published Studio 시간표·썸네일 각 1개
- 구매·작가 중복, null cover, 404 cover
- 활성 팀·팀 템플릿·팀 멤버 관계 각 1개

대표 Legacy ID뿐 아니라 고정된 사용자·템플릿·팀·작가·상품·권한·관계 ID와
예약 이메일·작가 slug가 비-fixture 데이터에 이미 사용 중이면 create를 중단한다.
`ON CONFLICT DO UPDATE`는 소유 조건을 통과한 fixture row에만 적용되며, cleanup도
fixture prefix와 예상 관계 조건을 만족하는 행만 삭제한다.

```bash
psql postgresql://postgres:postgres@127.0.0.1:56322/postgres \
  -v ON_ERROR_STOP=1 -f scripts/fixtures-03-cleanup.sql
psql postgresql://postgres:postgres@127.0.0.1:56322/postgres \
  -v ON_ERROR_STOP=1 -f scripts/fixtures-03-create.sql
npm run check:user-template-ui:my-page-browser
psql postgresql://postgres:postgres@127.0.0.1:56322/postgres \
  -v ON_ERROR_STOP=1 -f scripts/fixtures-03-cleanup.sql
```

## 5. 검증 결과

### 5.1 정적·계약 검증

```text
npm run check:user-template-ui:consumer  PASS
npx tsc --noEmit                         PASS
대상 npm run lint                        PASS
대상 npx prettier --check                PASS
git diff --check                         PASS
```

Legacy registry와 실제 UUID route 비교 결과는 다음과 같다.

```text
legacy_registry_routes=83
missing=0
```

### 5.2 API·브라우저 검증

`playwright@1.62.1`을 exact devDependency로 추가하고 Chromium으로 실행했다.
실제 `/api/auth/login`과 `/api/user/templates` 확인 결과는 다음과 같다.

```text
login_status=200
templates_status=200
purchase=2 artist=1 total=3
```

브라우저 checker는 다음 항목을 확인하도록 확장했다.

- desktop `1440x900`, mobile `390x844`
- 전체/시간표/썸네일 필터와 구매·작가 중복 분류
- null/404 cover placeholder와 404 cover 요청 1회
- 카드 keyboard focus와 Enter 실행
- Legacy, Studio timetable, Studio thumbnail의 정확한 세 실행 경로
- 모바일 1열 grid와 가로 overflow 없음
- 별도 비작가 계정에서 팀 템플릿 노출과 기존
  `/team-time-table/{id}` 이동
- loading, query error/retry, 전체 목록 empty, 필터 결과 empty
- Studio timetable/thumbnail runtime 오류 화면의 `/my-page` 복귀 링크

기존 03단계 실행에서 정상 목록·필터·팀 템플릿·대표 runtime 링크 smoke는
통과했다. 이번 보완 후 확장된 상태 검증 checker는 구문 검증과 정적 검토까지
완료했으며, dev server가 필요한 전체 재실행은 별도 로컬 smoke로 남겨 두었다.

최종 cleanup 결과:

```text
remaining_03_users=0
remaining_03_templates=0
remaining_03_team_rows=0|0|0|0
```

## 6. 완료 조건

- [x] 세 템플릿 종류가 한 마이페이지에서 구분된다.
- [x] 종류 필터와 전체/필터별 빈 상태가 정확하다.
- [x] 모든 개인 템플릿 카드가 `use_href`로 이동한다.
- [x] Studio 템플릿에 레거시 이미지 파일이 없어도 카드가 깨지지 않는다.
- [x] 구매한 템플릿과 내 작업물의 중복 규칙이 유지된다.
- [x] 팀 템플릿 기존 노출과 실행 경로에 회귀가 없다.
- [x] 모바일·데스크톱 브라우저 smoke test가 통과한다.

## 7. 잔여 범위

- 83개 Legacy route 전체는 registry 대조로 확인했고, 브라우저에서는 대표 route
  1개를 실행했다. 전체 수직 회귀는 07단계 범위다.
- 대표 이미지 관리자 업로드·교체·삭제는 04단계에서 구현했다.
- 구매부터 승인, 권한 부여, 실행까지의 전체 사용자 수직 흐름과 미권한 음수
  시나리오는 06~07단계에서 확장한다.
- 기존 팀 카드는 이번 단계의 통합 대상이 아니므로 구조와 상호작용 방식을
  변경하지 않고 browser regression만 확인했다.
- dependency 설치 시 보고된 npm audit 41건은 이 기능 범위에서 자동 수정하지
  않았다.
- production build, 원격 Supabase, git stage/commit/push는 실행하지 않았다.
