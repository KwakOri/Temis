# 00. 현재 상태와 확정 결정

상태: 00단계 재검증 완료, 01~04단계 결과 반영  
최종 수정: 2026-08-05

## 1. 목적

사용자 템플릿 UI 구현 중 데이터 의미나 라우트가 다시 갈라지지 않도록 현재
구현과 이번 계획의 결정을 한곳에 고정한다.

## 2. 현재 준비된 기능

### 사용자 목록

`GET /api/user/templates`는 다음 두 권한 출처를 합친다.

- `template_access`: 구매 승인 또는 관리자 직접 부여
- `template_artists`: 연결 작가 본인의 작업물

API는 `status=published`만 남기고 각 항목에 `use_href`를 계산한다.

### 실행 경로

`src/utils/template-links.ts`의 `getTemplateUseHref()`를 단일 기준으로 사용한다.

| engine   | kind        | 경로                    |
| -------- | ----------- | ----------------------- |
| `legacy` | `null`      | `/time-table/{id}`      |
| `studio` | `timetable` | `/template-studio/{id}` |
| `studio` | `thumbnail` | `/thumbnail/{id}`       |

UI에서 이 분기를 다시 구현하지 않는다.

### 런타임 API

`GET /api/user/templates/{id}/runtime`은 로그인, 공통 entitlement, Studio 엔진,
게시 상태, 문서 종류를 검사한다.

- Studio 시간표: 서버에 사용자 runtime values 저장 가능
- Studio 썸네일: 초기값을 반환하고 결과 저장은 하지 않음
- 썸네일 이미지 입력: 동일 브라우저 IndexedDB 사용

### 구매와 승인

- 구매 요청: `template_purchase_requests`
- 승인 결과: `template_access`
- 승인 RPC: 접근 권한 upsert와 구매 요청 완료를 한 트랜잭션으로 처리

## 3. 현재 UI의 주요 간극

| 영역              | 현재 상태                      | 필요한 변경                             |
| ----------------- | ------------------------------ | --------------------------------------- |
| 마이페이지 실행   | `use_href` 사용                | 종류 표시, 접근 가능한 버튼·카드 필요   |
| 마이페이지 이미지 | `/thumbnail/{id}.png` 하드코딩 | `thumbnail_url` 우선 + 안전한 fallback  |
| 마이페이지 분류   | 일반/개인만 표시               | 시간표/썸네일과 Legacy/Studio 구분      |
| 상점 카피         | 시간표 중심                    | 종류별 카피·필터·CTA                    |
| 상품 옵션         | 시간표 capability 중심         | 썸네일에서는 숨김 또는 종류별 모델 적용 |
| 권한 관리         | 공통 목록은 가능               | 종류·게시 상태 표시, 중복 부여 UX 보완  |
| 썸네일 검증       | 정적 계약 중심                 | 구매부터 실행까지 로컬 E2E 추가         |

## 4. 확정 용어

사용자 UI에서는 다음 용어를 사용한다.

| 내부 값                   | 사용자 표시                        |
| ------------------------- | ---------------------------------- |
| `template_kind=timetable` | 시간표                             |
| `template_kind=thumbnail` | 썸네일                             |
| `template_engine=legacy`  | 기존 시간표 또는 Legacy 보조 badge |
| `template_engine=studio`  | Studio 보조 badge                  |
| `is_public=true`          | 일반 판매                          |
| `is_public=false`         | 맞춤/개인 템플릿                   |
| `access_source=purchase`  | 구매한 템플릿                      |
| `access_source=artist`    | 내 작업물                          |

`공개/비공개`는 이용 가능 여부로 오해할 수 있으므로 소비자 UI의 핵심 분류로
사용하지 않는다.

## 5. 카드 대표 이미지 계약

카탈로그 카드가 사용할 이미지 우선순위를 확정한다.

1. 비어 있지 않은 `templates.thumbnail_url`
2. Legacy 시간표인 경우에만 `/thumbnail/{id}.png`
3. 종류별 placeholder

Studio 시간표나 Studio 썸네일에서 `/thumbnail/{id}.png` 존재를 가정하지 않는다.
사용자 런타임 `/thumbnail/{id}`와 정적 이미지 `/thumbnail/{id}.png`는 서로 다른
리소스임을 코드와 문서에서 명시한다.

이미지 오류 시 DOM을 `innerHTML`로 교체하지 않는다. React state와 재사용 가능한
fallback 컴포넌트로 처리한다.

## 6. 권한 레벨 해석

현재 런타임 entitlement는 `template_access` 행의 존재를 기준으로 하며
`read`, `write`, `admin`을 사용자 편집기 기능 차이로 해석하지 않는다.

따라서 이번 초기 UI에서는:

- 일반 사용자의 `write`를 템플릿 구조 편집 권한으로 표시하지 않는다.
- 마이페이지에서는 모두 `사용 가능`으로 표현한다.
- API와 service 타입에는 기존 `access_level` 값을 유지한다. 초기 UI가 사용하지
  않더라도 응답에서 제거하거나 다른 의미로 덮어쓰지 않는다.
- 구조 편집 권한이 필요해지면 별도 제품·권한 계약을 먼저 만든다.

## 7. 로컬과 원격의 경계

- 1~7단계의 데이터 기준은 로컬 Supabase다.
- 로컬 migration이 원격에 없다는 사실은 개발 차단 사유가 아니다.
- 원격 상태는 8단계 입력 자료로만 기록한다.
- 로컬 테스트 fixture에 실제 운영 사용자 정보나 비밀정보를 넣지 않는다.

## 8. 초기 범위에서 제외

- 썸네일 작업 결과의 서버 프로젝트 저장
- 사용자 자유 레이어 편집
- 결제 자동화
- 무료 공개 템플릿 권한 모델
- `read`, `write`, `admin`에 따른 사용자 런타임 기능 차등
- `write`를 Studio 문서 구조 편집 권한으로 확장하는 모델
- 팀 시간표를 Studio 시간표로 이관
- 레거시 `thumbnails` 데이터를 신규 Studio 썸네일로 자동 이관
- 원격 DB migration 적용

## 9. 구현 중 추가 결정이 필요한 항목

다음은 단계를 막지 않는 후속 결정이다.

- 썸네일 상품 plan: 초기 `pro` 단일 사용 후 별도 상품 모델 도입 여부
- 마이페이지의 엔진 badge를 항상 노출할지 문제 진단용으로만 노출할지

각 항목은 해당 단계에서 가장 작은 구현을 선택하고 결정 결과를 이 문서에
추가한다.

대표 이미지는 초기에는 **관리자 업로드를 유일한 필수 경로**로 사용한다.
published 문서 기반 자동 생성은 04단계 완료 조건에 포함하지 않고 후속 개선으로
분리한다.

## 10. 00단계 재검증 결과

확인 날짜: 2026-08-04  
확인 범위: 저장소 파일·route·service·hook·migration만 확인. 원격 Supabase와 로컬 DB에는 접속하지 않았고 코드·migration·fixture도 변경하지 않았다.

### 10.1 실제 확인한 흐름과 핵심 symbol

| 흐름                  | 확인한 파일                                                                                                                                                                                                                                                                                                                           | 핵심 symbol 또는 계약                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 사용자 템플릿 목록    | `src/app/(root)/my-page/page.tsx`, `src/hooks/query/useUserTemplates.ts`, `src/services/userService.ts`, `src/app/api/user/templates/route.ts`                                                                                                                                                                                        | `MyPageContent`, `useUserTemplates`, `UserService.getUserTemplates`, `GET`                                                                           |
| entitlement·실행 보호 | `src/lib/templates.ts`, `src/app/api/template-access/route.ts`, `src/components/auth/TemplateProtectedRoute.tsx`, `src/hooks/useTemplateAccess.ts`                                                                                                                                                                                    | `TemplateService.hasAccess`, `resolveEntitlement`, `TemplateProtectedRoute`                                                                          |
| Studio runtime        | `src/app/api/user/templates/[id]/runtime/route.ts`, `src/services/server/templateStudioPersistenceService.ts`, `src/app/(root)/template-studio/[templateId]/page.tsx`, `src/app/(root)/thumbnail/[templateId]/page.tsx`                                                                                                               | `authorize`, `GET`/`PUT`, `getTemplateStudioCurrentDocument`, `saveTemplateStudioUserState`, `useTemplateStudioRuntime`, `useThumbnailStudioRuntime` |
| 구매 요청·승인        | `src/app/api/template-purchase-requests/route.ts`, `src/services/templateDetailService.ts`, `src/app/api/admin/purchase-requests/route.ts`, `src/app/api/admin/purchase-requests/[id]/approve/route.ts`, `src/services/admin/purchaseService.ts`                                                                                      | `POST`, `TemplateDetailService.submitPurchaseRequest`, `approve_template_purchase_request` RPC 호출                                                  |
| 권한·작가 연결        | `src/app/api/admin/template-access/route.ts`, `src/app/api/admin/template-artists/route.ts`, `src/services/admin/accessService.ts`, `src/services/admin/artistService.ts`, `src/hooks/query/useAdminAccess.ts`, `src/hooks/query/useAdminArtists.ts`                                                                                  | `TemplateAccessService.grantAccess`, `PUT` 작가 연결, mutation query invalidation                                                                    |
| 종류·schema 경계      | `src/utils/template-links.ts`, `supabase/migrations/20260715010000_add_template_engine_and_status.sql`, `20260715040000_remove_is_public_entitlement_bypass.sql`, `20260715050000_reconcile_template_access.sql`, `20260715090000_validate_plan_on_purchase_approval.sql`, `20260802010000_add_template_kind_to_studio_templates.sql` | `getTemplateUseHref`, engine/status/kind check, access unique, 승인 RPC                                                                              |

### 10.2 문서와 일치한 확정 계약

- `GET /api/user/templates`는 `template_access`와 `template_artists`를 합치고 `status = published`만 남긴다. 작가 연결 항목을 구매 항목보다 우선해 같은 `templates.id`를 중복 표시하지 않으며, `getTemplateUseHref()`로 `use_href`를 계산한다.
- `TemplateService.resolveEntitlement()`은 관리자 우회 후 `published` 템플릿의 `template_access` 또는 `template_artists` 연결을 확인한다. `is_public`은 entitlement에 사용하지 않는다. `20260715040000_remove_is_public_entitlement_bypass.sql`의 migration 의도와 일치한다.
- `template_engine`/`template_kind` 조합은 `20260802010000_add_template_kind_to_studio_templates.sql`의 check constraint가 경계다. 해당 migration이 Studio null을 `timetable`로 backfill하고 Legacy는 null로 제한한다. 따라서 null 정규화는 소비자 UI가 추측하는 경계가 아니라 schema migration 경계로 확정한다.
- `getTemplateUseHref()`는 Legacy를 `/time-table/{id}`, Studio timetable을 `/template-studio/{id}`, Studio thumbnail을 `/thumbnail/{id}`로 보낸다. Studio thumbnail runtime은 공유 runtime API의 `?kind=thumbnail`을 통해 초기값만 받고 PUT은 405로 거부한다. Studio timetable은 사용자 state를 저장한다.
- canonical 구매 route는 `template_purchase_requests`를 사용하고 `is_public`, `published`, 요청 템플릿에 속한 plan 및 판매 중 상태를 검증한다. 승인 route는 요청에 기록된 plan만 사용해 `approve_template_purchase_request` RPC를 호출하고, migration의 unique constraint와 RPC upsert가 권한 부여와 요청 완료를 한 트랜잭션으로 처리한다.
- `access_level`은 목록 응답과 service 타입에서 유지된다. 현재 runtime은 `read`/`write`/`admin`을 기능 차이로 해석하지 않으며, 이 단계에서 일반 사용자 UI에 구조 편집 권한으로 표시하지 않는 결정은 유지한다.
- `is_public = true`는 일반 판매, `false`는 맞춤/개인 분류로 유지한다. 판매 요청의 판매 자격과 사용 entitlement를 혼동하지 않는다.

### 10.3 코드와 기준선의 차이 및 가장 작은 수정 방향

- **대표 이미지**: `MyPageContent`는 `thumbnail_url`을 읽지 않고 모든 사용자 템플릿에 `/thumbnail/{id}.png`를 사용한다. 이는 Studio 템플릿에도 Legacy 정적 cover를 가정하는 코드다. 02단계의 순수 resolver와 종류별 placeholder를 먼저 적용하고, 04단계에서 `thumbnail_url` 관리자 업로드를 연결하는 것이 가장 작은 수정이다. 이 단계에서는 UI를 수정하지 않는다.
- **Legacy route**: `getTemplateUseHref()`는 임의 UUID에 대한 `/time-table/{id}` 계약을 반환하지만 현재 저장소는 다수의 UUID 정적 route와 `_template`을 갖고 일반 `[templateId]` route를 확인하지 못했다. 모든 canonical `templates.id`를 실행해야 한다는 제품 의도와 충돌할 수 있으므로, 03단계 전에 동적 Legacy route를 추가할지 기존 UUID registry를 명시할지 결정해야 한다.
- **server service 계층**: `/api/user/templates/route.ts`, `/api/admin/template-access/route.ts`, `/api/admin/template-artists/route.ts`, 구매 요청·관리자 목록 route가 Supabase를 직접 호출한다. 반면 Studio runtime은 `TemplateService`와 `templateStudioPersistenceService`를 사용한다. 새 UI에서는 직접 호출을 늘리지 않고, 목록·권한·구매·작가의 server service 경계를 별도 단계에서 최소 단위로 만든다. 기존 route를 이번 단계에서 대규모 리팩터링하지 않는다.
- **React Query 계층**: 목록은 `Page → useUserTemplates → UserService → API`를 지키지만 `TemplateProtectedRoute → useTemplateAccess`는 `useEffect` 안에서 `fetch`를 직접 호출하고 React Query와 browser service를 사용하지 않는다. runtime client는 `useTemplateStudio` query hook을 사용한다. 따라서 02/03단계에서 entitlement query를 공통 hook/service로 옮기는 것을 후속 수정으로 고정한다.
- **직접 권한 부여**: `TemplateAccessService.grantAccess()`는 단순 insert다. 현재 문서가 요구하는 `(template_id, user_id)` idempotent upsert, 사용자·템플릿 존재 확인, 제공된 `templatePlanId`의 상품 소속 확인, unique 충돌의 명확한 응답을 구현하지 않는다. migration의 unique constraint는 중복을 막지만 API 계약을 완성하지는 않는다. 06단계에서 upsert를 기본 동작으로 하는 최소 수정이 필요하다.
- **cache 갱신**: 00단계 당시 승인·직접 권한·작가 연결 mutation은 관리자 목록만 invalidate했다. 03단계에서 관련 mutation 성공 시 `queryKeys.user.templates()`를 함께 invalidate하고, `useUserTemplates()`에 `refetchOnMount: "always"`를 적용했다. polling은 추가하지 않았다.
- **Legacy 구매 API**: `src/app/api/shop/purchase-request/route.ts`는 아직 `purchase_requests`에 쓰고 `is_public`만 검사한다. 신규 `TemplateDetailService`는 `/api/template-purchase-requests`만 사용하므로 canonical 사용자 흐름은 문서와 일치한다. Legacy route와 테이블은 이 단계에서 삭제하지 않고, 07단계의 boundary 감사 대상으로 유지한다.
- **공개 상점 목록**: `/api/shop/templates`는 `is_shop_visible`과 `templates.status = published`를 검사하지만 `templates.is_public`을 직접 필터링하지 않는다. canonical 구매 route는 `is_public`을 다시 검사한다. `is_public`의 확정 의미를 상점 목록에도 적용할지는 05단계에서 확인하고, 일반 판매 목록이라면 `is_public = true` 필터를 추가하는 가장 작은 수정으로 결정한다.
- **승인 상태**: 승인 route와 RPC는 원자적 upsert를 지키지만 RPC 자체는 요청이 pending인지 별도 차단하지 않고, 별도의 PATCH route는 여러 상태를 직접 갱신한다. 중복 승인 UX와 rejected/completed 재승인 정책은 06단계에서 명시적으로 검증할 후속 항목이다.

### 10.4 차단 항목 해소와 후속 결정

#### 01~03단계에서 해소

1. **Legacy 실행 route 계약**: 03단계에서 실제 UUID `page.tsx` 83개를 registry로 고정했다. 소비자 normalizer는 registry 밖 Legacy row를 fail-closed로 제외하며, 범용 dynamic Legacy route는 추가하지 않았다.
2. **실제 로컬 schema 적용 상태**: 01단계에서 disposable local DB reset과 전체 checker로 migration 적용을 검증했다.
3. **사용자 템플릿 cache 갱신**: 03단계에서 구매 승인, 직접 권한 부여·수정·회수, 작가 연결 변경 후 `queryKeys.user.templates()`를 invalidate하도록 보강했다.

#### 후속 결정

- 직접 권한 부여의 기존 행 처리, `templatePlanId` 검증과 409/upsert 응답을 06단계에서 확정한다.
- 사용자 purchase history cache 갱신 범위와 승인 후 전체 수직 흐름을 06~07단계에서 검증한다.
- public shop 목록에 `is_public = true`를 적용할지 05단계에서 판매 모델과 함께 확정한다.
- 썸네일 상품 plan의 초기 `pro` 단일 사용 여부는 기존 후속 결정으로 유지한다.
- 엔진 badge는 03단계 마이페이지에서 기본 숨김으로 결정했으며, 문제 진단 또는 종류 차이 설명이 필요할 때만 보조 정보로 사용한다.
- `thumbnail_url` 관리자 업로드·갱신은 04단계에서 진행한다.

### 10.5 00단계 결론

00단계 재검증 당시 핵심 데이터 의미·entitlement·Studio runtime·canonical 구매 승인 계약은 migration과 코드에 대체로 일치했고, Legacy route 식별자, catalog cover, 직접 권한 API, cache invalidation, server service 경계를 후속 항목으로 고정했다. 이 중 로컬 schema 기준선, 소비자 cover 계약, Legacy registry, 마이페이지 통합과 사용자 템플릿 cache invalidation은 01~~03단계에서 해결했다. 직접 권한 API, 상점·상품 UX, 대표 이미지 업로드와 전체 수직 회귀는 04~~07단계 범위로 유지한다.

## 10.6 04단계 대표 이미지 결정

- `templates.thumbnail_url`은 catalog cover URL만 저장하며 사용자 `/thumbnail/{id}` 실행 결과와 분리한다.
- 04단계 필수 경로는 관리자 업로드뿐이다. published document 기반 자동 생성은 후속 단계다.
- 관리 대상 key는 `uploads/catalog-covers/{templateId}/` 아래에 두고, 삭제 시 공개 URL origin과 prefix를 함께 확인한다.
- 허용 MIME은 PNG/JPEG/WebP, 최대 크기는 10MB로 고정했다. 16:9·1280×720은 권장값이며 원본 문서를 변형하지 않는다.
- 업로드는 새 객체 저장 → DB URL 갱신 → 이전 managed 객체 정리 순서다. DB 갱신 실패 시 신규 orphan 삭제를 시도하고, 이전 객체 삭제 실패는 `cleanupWarning`과 운영 cleanup 대상으로 남긴다.
- 외부 URL과 Legacy 정적 cover는 R2 삭제 대상으로 취급하지 않는다. Studio 대표 이미지 API는 Studio timetable/thumbnail에만 허용한다.
- 상점 상세와 마이페이지는 같은 resolver 및 종류별 placeholder를 사용한다.

## 10.7 04단계 local DB + remote R2 test prefix 결정

catalog cover의 개발 smoke는 local Supabase와 원격 R2를 분리한다. API의 DB read/write는
local Supabase 연결을 사용하고, R2 객체만 원격 bucket의
`uploads/catalog-covers/_test/<run-id>/` 아래에 저장한다.

- `CATALOG_COVER_R2_PREFIX`가 없으면 기존 production prefix를 유지한다.
- 환경변수를 지정할 때는 `uploads/catalog-covers/_test/<run-id>` 형식만 허용한다.
- test mode에서는 현재 run prefix 밖의 URL을 managed 삭제 대상으로 인정하지 않는다.
- test cleanup은 `npm run cleanup:catalog-cover:test:r2`로 수행하며 dry-run이 기본이다.
  `--apply`도 test run prefix safety assertion을 통과한 경우에만 동작한다.
- cleanup 도구는 Supabase import/call을 하지 않으며 metadata를 수정하지 않는다.
- 실제 remote R2 upload/replace/delete smoke는 reversible하더라도 원격 storage write이므로
  사전 확인 후 별도 실행한다.
