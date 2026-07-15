# 06. 구매·권한 데이터 정합성

상태: 완료 (2026-07-15)

## 목적

구매 승인 결과와 `template_access`를 일치시키고 중복 또는 누락된 이용 권한을
정리한다.

## 사전 점검

- 완료된 구매 요청인데 access가 없는 행
- 동일 `(template_id, user_id)`의 중복 access
- 삭제된 template/plan을 참조하는 행
- 사용자가 지정되지 않은 개인 맞춤 템플릿
- access는 있으나 구매·관리자 부여 근거를 추적할 수 없는 행

## 변경 범위

- 데이터 정리 migration을 로컬 복제본에서 먼저 검증한다.
- 정리 후 `template_access(template_id, user_id)` unique 제약을 추가한다.
- 구매 승인 처리는 insert가 아니라 idempotent upsert로 만든다.
- 관리자 수동 부여와 구매 승인 모두 `granted_by`/시간 정보를 유지한다.
- 완료 구매 → access 생성이 하나의 트랜잭션 경계 안에서 처리되도록 한다.

## 완료 조건

- 같은 사용자·템플릿 access가 한 건만 존재한다.
- 승인 API 재시도 시 중복 access가 생기지 않는다.
- 원격 복제 데이터에 대한 reconciliation 결과가 문서화된다.

## 실제 변경 사항

- 신규 마이그레이션 `20260715050000_reconcile_template_access.sql`:
  - `template_access`에서 동일 `(template_id, user_id)` 중복 행을 정리한다
    (`granted_at`이 더 이른 행을 남기고, 동률이면 `id`가 작은 행을 남긴다).
  - `template_access_template_id_user_id_key` UNIQUE 제약을
    `(template_id, user_id)`에 추가한다.
  - `public.approve_template_purchase_request(p_request_id, p_admin_id, p_plan_id)`
    RPC를 추가한다. 이 함수는 대상 구매 요청을 `FOR UPDATE`로 잠근 뒤
    `template_access`를 `ON CONFLICT (template_id, user_id) DO UPDATE`로
    upsert하고, 같은 트랜잭션 안에서 `template_purchase_requests.status`를
    `completed`로 갱신한다. `authenticated`에만 EXECUTE 권한을 부여했다
    (anon에는 부여하지 않음; 나머지 테이블 직접 접근 축소는 9단계 범위).
- `src/services/admin/purchaseService.ts`의 `approvePurchaseRequest()`가
  `template_access` insert + `template_purchase_requests` update를 분리된
  두 호출로 하던 것을 위 RPC 단일 호출로 교체했다. 승인 재시도가 더 이상
  중복 access를 만들지 않는다.
- 사용되지 않던 `AdminPurchaseService.grantTemplateAccess()`를 제거했다. 이
  메서드는 `granted_by: data.user_id`로 관리자 대신 대상 사용자 ID를 기록하는
  버그가 있었고, 이를 호출하는 `useGrantTemplateAccess`/`useAdminPurchase.ts`
  훅 파일도 어느 컴포넌트에서도 참조되지 않는 죽은 코드였다(전수 grep으로
  확인). 함께 제거했다. 실제 사용 중인 관리자 수동 부여 경로는
  `AccessManagement.tsx` → `AdminAccessService.grantAccess()` →
  `POST /api/admin/template-access` → `TemplateAccessService.grantAccess()`이며,
  이 경로는 이미 `requireAdmin` 인증을 거치고 `granted_by`에 실제 관리자 ID를
  올바르게 기록하고 있어 변경하지 않았다. 새 UNIQUE 제약이 이 경로의 중복
  요청도 방어한다(두 번째 시도는 에러로 거부됨).
- `src/types/supabase.ts`에 `approve_template_purchase_request` RPC 타입을
  수동으로 추가했다(원격에는 아직 반영되지 않은 로컬 전용 함수이므로
  `npm run gen:types`는 실행하지 않았다 — 이 스크립트는 원격 프로젝트를
  대상으로 하며 로컬 전용 마이그레이션을 반영하지 못한다).

## 로컬 검증

- `supabase db dump --linked --data-only`로 원격 데이터를 스크래치 경로에
  복제한 뒤 `supabase db reset --local`로 빈 로컬 DB에서 전체 마이그레이션이
  처음부터 재현됨을 확인했다.
- 복제본 기준 사전 점검 결과: `template_access` 155건 중 실제 중복 1건
  발견(`template_id=f8da2116-…`, `user_id=38`, 3초 간격의 완전 동일한 두 행 —
  이중 클릭성 중복으로 추정). 마이그레이션 적용 후 154건, 중복 0건.
  완료 구매인데 access가 없는 행, 삭제된 template/plan을 참조하는 access,
  지정자 없는 개인 맞춤 템플릿은 0건이었다.
- `approve_template_purchase_request` RPC를 트랜잭션 내에서 두 번 연속
  호출해 동일한 access 행 id가 반환되고(신규 행 미생성), 존재하지 않는
  request id에는 예외가 발생함을 SQL로 확인했다(트랜잭션은 ROLLBACK하여
  실제 데이터에 영향 없음).
- 애플리케이션 코드 경로(`AdminPurchaseService.approvePurchaseRequest()`)를
  실제로 두 번 연속 호출해 access 행이 1건만 남고, `granted_by`가 관리자
  ID로 기록되며, 구매 요청이 `completed`로 전환됨을 확인했다(테스트 행은
  검증 후 삭제).
- `npm run check:template-entitlement` 재실행으로 5단계 권한 시나리오에
  회귀가 없음을 확인했다.
- `tsc --noEmit`, 변경 파일 ESLint 통과.
- 원격 DB는 변경하지 않았다(스키마도, 데이터도).

