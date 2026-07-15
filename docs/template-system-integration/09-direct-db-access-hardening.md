# 09. 브라우저 직접 DB 접근 축소

상태: 완료 (2026-07-15, 우선 대상 범위)

## 목적

RLS에 의존하지 않는 프로젝트 원칙에 맞춰 민감 테이블을 브라우저에서 직접 읽고
쓰는 경로를 제거하고, 서버 API를 권한 경계로 만든다.

## 현재 확인된 위험

원격 anon key로 private 템플릿을 포함한 `templates`, `template_access`, 구매 요청의
일부 필드를 직접 읽을 수 있었다. RLS를 사용하지 않는다면 이 권한은 애플리케이션
API 권한 검사로 보완되지 않는다.

## 변경 순서

1. 브라우저 Supabase 쿼리를 inventory한다.
2. 민감 쿼리를 Service → Next API → server Supabase client 흐름으로 옮긴다.
3. 서버 API에서 인증, role, resource entitlement를 검증한다.
4. 전환된 테이블과 RPC의 `anon`, 필요 시 `authenticated` 직접 권한을 revoke한다.
5. 허용한 공개 메타데이터는 좁은 view/API로 별도 제공한다.

우선 대상:

- `template_access`
- `template_purchase_requests`
- Studio documents, drafts, revisions, assets, user states
- 전체 문서를 반환하는 RPC

## 완료 조건

- anon REST 요청으로 민감 행을 읽거나 쓸 수 없다.
- 정상 UI는 서버 API를 통해 기존 기능을 유지한다.
- service-role key는 서버 환경 밖으로 노출되지 않는다.

## 범위 한정

"우선 대상"으로 명시된 5개 대상(`template_access`, `template_purchase_requests`,
Studio documents/drafts/revisions/assets/user states, 관련 RPC)만 다뤘다.
앱 전체의 모든 브라우저 Supabase 쿼리에 대한 전수 inventory는 하지 않았다.
예를 들어 `templates`/`shop_templates`(공개 상품 카탈로그, 의도적으로
공개), `artists`, `custom_timetable_orders` 등 다른 테이블의 브라우저 직접
접근 여부는 이번에 조사하지 않았다. 필요하면 별도로 다시 조사해야 한다.

## 실제 변경 사항

조사 결과 브라우저에서 anon key로 직접 실행되던 코드는 두 곳이었다(나머지
"우선 대상" 접근은 이미 API route를 거치고 있었다):

- **`AdminPurchaseService`** (`src/services/admin/purchaseService.ts`): react-query
  `queryFn`/`mutationFn`이 `PurchaseManagement.tsx`(`"use client"`)에서 직접
  실행되어, `template_purchase_requests` CRUD와 `approve_template_purchase_request`
  RPC가 브라우저 anon key로 그대로 나가고 있었다.
- **`ShopService.getUserTemplateAccess`** (`src/services/shopService.ts`): 인자로
  받은 임의의 `userId`로 `template_access`를 브라우저에서 직접 조회했다 —
  호출자는 항상 로그인한 자기 자신의 id를 넘겼지만, API 자체는 다른 사용자의
  id를 넘겨도 막을 방법이 없었다.

이 둘을 서버 API 경유로 옮겼다:

- `GET /api/admin/purchase-requests`, `PATCH /api/admin/purchase-requests/{id}`
  (상태 변경, 예: 거절), `POST /api/admin/purchase-requests/{id}/approve`를
  신설했다(모두 `requireAdmin`). `AdminPurchaseService`는 이제 이 route들을
  fetch하는 얇은 클라이언트로 재작성했다. 승인 route는 요청 행에서
  `template_id`/`user_id`를 직접 조회하므로 `approvePurchaseRequest`의
  `templateId`/`userId` 파라미터가 더는 필요 없어져 시그니처를 정리하고
  `useAdminPurchases.ts`/`PurchaseManagement.tsx` 호출부도 함께 줄였다.
  승인 route는 하드코딩된 `timetable@admin.com` 이메일 조회 대신
  `requireAdmin`이 준 실제 요청자 id를 `granted_by`로 기록한다(6단계에서
  발견했던 하드코딩 문제가 이 경로에서는 자연스럽게 해결됨).
  `findUserByEmail`/`getTemplateById`/`sendAccessGrantedEmail`은 승인 route
  내부로 흡수되어 더는 필요 없는 클라이언트 메서드라 함께 제거했다.
- `GET /api/user/template-access`(신설)는 토큰의 user id만 사용해
  `template_access.template_id` 목록을 반환한다. `ShopService.getUserTemplateAccess()`는
  더 이상 userId 인자를 받지 않고 이 route를 호출한다.
- `src/lib/templates.ts`(`TemplateService`/`TemplateAccessService`)는 API
  route에서만 import되지만(브라우저 번들에 포함되지 않음) anon-key 클라이언트를
  쓰고 있어 grant를 회수하면 함께 깨질 상황이었다. import를
  `supabaseAdminServer as supabase`로 바꿔 service-role로 전환했다(호출부
  코드는 변경 없음). `templateStudioPersistenceService.ts`는 이미 처음부터
  service-role만 썼음을 재확인했다.

**보정 (10단계에서 발견)**: 이 단계의 최초 조사는 "브라우저에서 직접
실행되는 코드"만 우선순위로 잡아, **서버 API route 안에서 anon-key
클라이언트를 쓰는 나머지 경우**를 놓쳤다. GRANT 회수는 코드가 브라우저에서
도는지가 아니라 **어떤 key로 DB에 접속하는지**로 결정되므로, 서버에서
실행되는 API route라도 `@/lib/supabase`(anon key)를 쓰면 이번 GRANT 회수로
그대로 깨진다. 10단계 파일럿 스크립트를 만들다가 다음 5개 파일이 여전히
anon key로 `template_access`/`template_purchase_requests`를 건드리고
있음을 발견해 `supabaseAdminServer`로 전환했다:

- `src/app/api/template-purchase-requests/route.ts`
- `src/app/api/user/purchase-requests/[id]/route.ts`
- `src/app/api/user/purchase-history/route.ts`
- `src/app/api/admin/user-templates/route.ts`
- `src/app/api/user/templates/route.ts`

이 5개를 고치지 않았다면 이번 GRANT 회수가 구매 요청 생성/조회/수정/취소,
구매 이력 조회, 마이페이지 목록을 전부 깨뜨렸을 것이다. 앞으로 이
테이블들을 건드리는 새 API route를 추가할 때는 반드시
`supabaseAdminServer`를 써야 한다.

## GRANT 회수

신규 마이그레이션 `20260715070000_revoke_anon_access_to_sensitive_tables.sql`:

- 7개 테이블(`template_access`, `template_purchase_requests`, 5개
  `template_studio_*`)에서 `anon`, `authenticated`의 모든 테이블 권한을
  `REVOKE`했다.
- 3개 함수(`approve_template_purchase_request`, `has_template_access`,
  `publish_template_studio_document`)에서 `anon`, `authenticated`뿐 아니라
  **`PUBLIC`**(함수 생성 시 기본으로 EXECUTE가 부여되는 pseudo-role)에서도
  회수했다 — `PUBLIC` grant를 놓치면 `anon`/`authenticated`에서만
  revoke해도 `PUBLIC` 경유로 여전히 실행 가능하다는 것을 로컬에서 실제로
  확인하고 반영했다.
- `has_template_access`는 애플리케이션 코드에서 호출되는 곳이 없음을
  재확인했지만(6단계 조사와 동일 결론), grant가 열려 있던 채로 남기지
  않기 위해 함께 회수했다.
- `service_role`은 건드리지 않았다(별도의 명시적 grant가 이미 있고, 로컬
  Supabase의 `service_role`은 RLS도 우회한다).

## 로컬 검증

- REST로 직접 확인: anon key로 `template_access` SELECT/INSERT,
  `template_purchase_requests` SELECT, `template_studio_user_states` SELECT,
  `has_template_access` RPC 호출이 모두 `401 permission denied for table ...`로
  거부됨을 `curl`로 확인했다. 반대로 `templates`/`shop_templates`(공개
  카탈로그, 대상 아님)는 anon으로 여전히 `200`.
- `supabase db reset --local`로 전체 migration(회수 migration 포함)이 빈
  DB에서 처음부터 재현됨을 확인했다.
- 신규 스크립트 `scripts/check-admin-purchase-requests.ts`
  (`npm run check:admin-purchase-requests`): 비관리자 403, 목록 조회,
  승인(접근 생성 + `granted_by`가 실제 승인한 관리자인지 + 재시도해도
  중복 없음), 거절(PATCH), 잘못된 status 값 400을 검증.
- 신규 스크립트 `scripts/check-admin-template-access.ts`
  (`npm run check:admin-template-access`): 관리자 수동 부여
  POST/GET/PUT/DELETE 전체 흐름을 service-role 전환 후에도 검증.
- 기존 `check:template-entitlement`, `check:template-studio:persistence`,
  `check:template-studio:runtime`을 grant 회수 이후에도 재실행해 회귀가
  없음을 확인했다(이 스크립트들은 이미 `lib/templates.ts`의
  entitlement 판정 경로를 검증하고 있었다).
- `tsc --noEmit`, 변경/신규 파일 ESLint 통과.
- 원격 DB는 변경하지 않았다.

