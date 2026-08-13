# 01단계 migration 적용 결과

확인일: 2026-08-05  
범위: `/Users/kwakori/projects/promotion/temis`의 local Supabase와 route-level API  
원격 Supabase: 읽기·쓰기 모두 수행하지 않음

## 실행 결과

`npm run dev:local`의 기본 local 모드로 실행했다. `--dump`, `supabase link`, `db push --linked`, migration repair/rollback은 사용하지 않았다.

- local Supabase 컨테이너 시작: 통과
- 기본 제외 서비스: Realtime, Storage API, Studio, mail, analytics 등
- local migration 적용 단계: 통과
- 실행 출력: `Local database is up to date.`
- disposable local DB에서 `supabase db reset --local --no-seed --yes` 실행: 통과
- reset 후 전체 migration 재적용: 통과
- reset 출력: `Finished supabase db reset on branch features/template-system.`
- reset 후 `bash scripts/check-01-all.sh`: 통과
- 기존 local 데이터는 disposable 검증 범위로 초기화했으며, 원격 DB에는 영향이 없다.

## Empty DB 재현 결과

```text
supabase db reset --local --no-seed --yes: PASS
전체 migration 적용: PASS
bash scripts/check-01-all.sh: PASS
```

reset 후 schema/API/fixture/정적 검증을 다시 실행했고, purchase-plan checker의
사후 fixture 조회에서 `plan_check_user=0`, `plan_check_templates=0`을 확인했다.

`npm run check:user-template-ui:schema` 통과:

- `templates`: `template_engine`, `template_kind`, `status` 및 사용자 목록에 필요한 핵심 컬럼
- `template_access`: `(template_id, user_id)` 권한 행과 plan 연결 컬럼
- `template_studio_documents`
- `template_studio_document_revisions`
- `template_studio_document_drafts`
- `template_studio_assets`
- `template_studio_user_states`
- `shop_templates`: `template_id` 및 판매 노출 컬럼
- `template_purchase_requests`: plan/status 관계 컬럼
- `approve_template_purchase_request`: random request probe로 함수 설치 확인

unique 동작과 RPC의 실제 원자성은 [`01-api-test-results.md`](./01-api-test-results.md)의 통합 checker 결과에서 별도로 확인했다.

## 전체 정적·회귀 검증

검증 전담 실행 결과:

- `npx tsc --noEmit`: 통과
- 변경 checker 파일 ESLint: 경고/오류 없음
- `scripts/check-01-all.sh`: 통과
- `npm run check:template-studio:runtime`: 통과
- `npm run check:thumbnail-studio:runtime`: 통과
- `npm run check:thumbnail-studio:integration`: 통과
- `npm run check:pilot-e2e`: 통과
- `npm run check:supabase-key-boundary`: 통과
- `git diff --check`: 통과

Pilot E2E에서 local Gmail 환경 변수가 없어 이메일 발송 시도는 실패 로그가
있었지만, 이메일 실패를 허용하는 기존 계약에 따라 전체 checker는 통과했다.

## 관련 migration 계약

- `20260715010000_add_template_engine_and_status.sql`
- `20260802010000_add_template_kind_to_studio_templates.sql`
- `20260705000000_create_template_studio_persistence.sql`
- `20260715020000_relink_template_studio_to_templates.sql`
- `20260715060000_create_template_studio_user_states.sql`
- `20260715050000_reconcile_template_access.sql`
- `20260715090000_validate_plan_on_purchase_approval.sql`
- `20260716020000_shop_templates_template_id_unique.sql`

이 migration들이 정의한 canonical `templates.id`, `template_engine/template_kind/status`, Studio persistence, access unique, shop unique, 구매 승인 RPC 경계를 checker에서 직접 사용했다.

## 재현 명령

프로젝트 루트에서 local 환경을 준비한 뒤 다음을 실행한다.

```bash
npm run dev:local
npm run check:user-template-ui:schema
npm run check:user-template-ui:baseline
```

전체 01단계 순차 검증은 다음 명령을 사용한다.

```bash
bash scripts/check-01-all.sh
```

`tsx` IPC가 `EPERM`이면 프로젝트 루트에서 다음 형태를 사용한다.

```bash
node --import tsx scripts/check-01-db-schema.ts
```

## 잔여 경계

- 브라우저 UI와 실제 이미지 fallback은 02~04단계 범위다.
- Legacy `/time-table/{id}`의 일반 동적 route 존재 여부는 03단계 전 확정한다.
- 원격 migration 상태와 원격 반영은 08단계에서 별도 승인 후 검토한다.
