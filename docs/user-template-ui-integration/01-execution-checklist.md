# 01단계 실행 체크리스트

작성일: 2026-08-04  
최종 확인일: 2026-08-05  
상태: 완료

## 사전 준비

현재 위치가 temis 루트인지 확인한다.

```bash
pwd
# /Users/kwakori/projects/promotion/temis
```

현재 local DB가 disposable 테스트 환경이면 다음 reset을 허용한 뒤 기준선을 재검증한다.

```bash
supabase db reset --local --no-seed --yes
```

reset은 원격 Supabase에 영향을 주지 않으며, 이 작업에서 실제로 실행했다.

## 1. local Supabase 시작·migration 경로

```bash
npm run dev:local
```

확인 결과:

- local mode로 시작
- Realtime, Storage API, Studio, mail, analytics 등 기본 제외
- `migration up --local --yes` 실행
- `Local database is up to date.` 확인
- `--dump`, remote link, `db push --linked`, migration repair/rollback 미사용
- disposable local DB에서 `supabase db reset --local --no-seed --yes` 실행
- reset 후 전체 migration 재적용 및 `bash scripts/check-01-all.sh` 통과

상세 결과는 [`01-migration-result.md`](./01-migration-result.md)에 기록한다.

## 2. schema 검증

```bash
npm run check:user-template-ui:schema
```

통과한 영역:

- [x] `templates.template_engine`
- [x] `templates.template_kind`
- [x] `templates.status`
- [x] `template_access` 핵심 컬럼 및 `(template_id, user_id)` unique 동작
- [x] `template_studio_documents`
- [x] `template_studio_document_revisions`
- [x] `template_studio_document_drafts`
- [x] `template_studio_assets`
- [x] `template_studio_user_states`
- [x] `shop_templates.template_id` unique 동작
- [x] `approve_template_purchase_request` RPC 설치

## 3. fixture 생성·정리

권장 통합 경로:

```bash
npm run check:user-template-ui:baseline
```

다음 표본을 만든다.

- [x] published Legacy 시간표
- [x] published Studio 시간표
- [x] published Studio 썸네일
- [x] access가 있지만 미노출되는 draft 썸네일
- [x] access가 있지만 미노출되는 archived 시간표
- [x] `template_artists`로 연결된 published Studio 템플릿
- [x] 미권한 사용자
- [x] 관리자 사용자
- [x] Studio document/revision/draft/asset/user state

수동 SQL 경로는 다음 문서를 따른다.

- [`01-fixture-guide.md`](./01-fixture-guide.md)
- `scripts/fixtures-01-create.sql`
- `scripts/fixtures-01-cleanup.sql`

checker 종료 출력에서 다음을 확인한다.

```text
User template UI local DB/API baseline check passed.
Fixture cleanup verified for reserved 01단계 identifiers.
```

## 4. API·runtime 검증

```bash
npm run check:user-template-ui:baseline
npm run check:template-entitlement
npm run check:template-studio:runtime
npm run check:thumbnail-studio:runtime
npm run check:thumbnail-studio:integration
npm run check:purchase-plan-validation
```

검증 계약:

- [x] `GET /api/user/templates` 구매/작업 분리
- [x] access와 artist link가 겹쳐도 템플릿 1건
- [x] `template_engine`, `template_kind`, `status`, `thumbnail_url`, `use_href`
- [x] buyer/artist/admin/no-access entitlement
- [x] draft/archived 일반 사용자 차단
- [x] Studio timetable GET/PUT
- [x] Studio thumbnail GET `?kind=thumbnail`
- [x] thumbnail PUT 405
- [x] 불일치 kind 404, 알 수 없는 kind 400
- [x] 미권한 runtime 403
- [x] plan-template mismatch 400
- [x] 승인 RPC mismatch override 거부
- [x] 정상 승인 후 request completed + access 1건
- [x] 승인 RPC 즉시 재시도 후 access 중복 없음
- [x] 승인 후 사용자 목록 노출

실제 응답과 status는 [`01-api-test-results.md`](./01-api-test-results.md),
02단계용 목록 예시는 [`01-user-template-response-sample.json`](./01-user-template-response-sample.json)에 있다.

## 5. 정적 검증

```bash
npx tsc --noEmit
npm run lint -- \
  --file scripts/check-01-db-schema.ts \
  --file scripts/check-user-template-ui-baseline.ts \
  --file scripts/check-purchase-plan-validation.ts
npm run check:supabase-key-boundary
git diff --check
```

`npx tsc --noEmit`, 변경 checker 파일 lint, `check:supabase-key-boundary`, aggregate
`scripts/check-01-all.sh`, `check:pilot-e2e`, `git diff --check`도 통과했다.
Pilot E2E의 local Gmail 환경 변수 미설정에 따른 이메일 발송 실패 로그는 기존
선택적 메일 실패 허용 계약에 해당한다. empty DB reset과 reset 후 migration 적용도
완료했으며, purchase-plan fixture cleanup의 사용자·템플릿 잔여는 0건이다.

`tsx` IPC가 `EPERM`이면 프로젝트 루트에서 다음 형태를 사용한다.

```bash
node --import tsx scripts/<check-file>
```

## 6. 결과 산출물

- [`01-local-db-api-baseline.md`](./01-local-db-api-baseline.md)
- [`01-migration-result.md`](./01-migration-result.md)
- [`01-fixture-guide.md`](./01-fixture-guide.md)
- [`01-api-test-results.md`](./01-api-test-results.md)
- [`01-manual-verification.md`](./01-manual-verification.md)
- [`01-user-template-response-sample.json`](./01-user-template-response-sample.json)

## 7. 완료 판정

- [x] 빈 local DB에서 전체 migration 적용을 실제로 확인했다.
- [x] 세 종류 published fixture를 만들고 route/API에서 확인했다.
- [x] 목록 `use_href`와 source 중복 제거를 확인했다.
- [x] thumbnail 권한/kind/PUT 정책을 확인했다.
- [x] 구매 plan 관계와 승인 atomic/idempotent 동작을 확인했다.
- [x] cleanup 후 fixture가 남지 않음을 확인했다.
- [x] 원격 Supabase를 읽거나 변경하지 않았다.

01단계 완료 조건을 모두 충족했으므로 01단계를 완료로 표시하고 02단계 소비자
계약·공용 카드 구현으로 진행한다.
