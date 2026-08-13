# 01. 로컬 DB·API 개발 기준선

상태: 완료  
확인일: 2026-08-05  
선행 조건: 00단계 결정 확인

## 1. 목표

원격 DB와 무관하게 로컬 Supabase에서 사용자 UI 개발에 필요한 schema, fixture,
권한 API와 런타임 API가 재현되는 기준선을 만든다.

## 2. 개발 환경 원칙

- 기본 실행은 `npm run dev:local`을 사용한다.
- 현재 로컬 데이터를 재사용할 때는 원격 복원 명령을 사용하지 않는다.
- migration은 `supabase/`의 로컬 이력을 기준으로 적용한다.
- Realtime, Storage, Studio 등 제외된 서비스가 실제로 필요한 경우에만
  `SUPABASE_START_EXCLUDE`를 조정한다.
- 검증 fixture는 예약된 테스트 사용자와 임시 템플릿만 사용하고 종료 시
  정리한다.
- 기본 개발/검증에서는 원격 Supabase를 읽거나 쓰지 않는다. 원격 데이터가
  필요한 경우 별도 `npm run db:restore:remote` 복원 절차를 사용하며, 이
  절차도 원격 DB에는 쓰지 않는다.

## 3. 확인한 schema

`npm run check:user-template-ui:schema`가 local PostgREST에서 다음 영역을
확인한다.

- `templates.template_engine`
- `templates.template_kind`
- `templates.status`
- `template_access`의 `(template_id, user_id)` 유일성 대상 컬럼
- `template_studio_documents`
- `template_studio_document_revisions`
- `template_studio_document_drafts`
- `template_studio_assets`
- `template_studio_user_states`
- `shop_templates.template_id` 유일성 대상 컬럼
- 구매 승인 RPC `approve_template_purchase_request`

unique의 실제 violation과 RPC의 원자성/idempotency는 통합 checker가 fixture를
만든 뒤 직접 검증한다.

## 4. 로컬 fixture matrix

`npm run check:user-template-ui:baseline`은 다음 표본과 사용자를 만들고
route/API 검증 후 `finally`에서 정리한다.

| 표본                    | 상태        | 권한 출처                     | 기대 목록/권한                     |
| ----------------------- | ----------- | ----------------------------- | ---------------------------------- |
| Legacy 시간표           | published   | `template_access`             | 구매 목록, `/time-table/{id}`      |
| Studio 시간표           | published   | `template_access` + 작가 연결 | 작업 목록, `/template-studio/{id}` |
| Studio 썸네일           | published   | `template_access`             | 구매 목록, `/thumbnail/{id}`       |
| Studio 썸네일           | draft       | `template_access`             | 일반 목록 미노출                   |
| Studio 시간표           | archived    | `template_access`             | 일반 목록 미노출                   |
| 작가 연결 Studio 템플릿 | published   | `template_artists`            | 작가 사용자의 작업 목록            |
| 미권한 사용자           | 별도 사용자 | 연결 없음                     | 목록 0, runtime 403                |
| 관리자                  | 별도 사용자 | role `admin`                  | entitlement 우회                   |

추가로 Studio document/revision/draft/asset과 runtime user state를 생성해
persistence 경계도 함께 확인한다.

## 5. API 검증 범위

### 목록

- `GET /api/user/templates`
- 구매/작업 목록 분리
- 동일 템플릿의 구매/작가 중복 제거
- `template_engine`, `template_kind`, `status`, `thumbnail_url`, `use_href`
  응답 확인

### 권한

- `GET /api/template-access?templateId=...`
- 구매 사용자 허용
- 연결 작가 허용
- 미권한 사용자 거부
- draft/archived 일반 사용자 거부
- 관리자 우회

### 런타임

- Studio 시간표 GET/PUT
- Studio 썸네일 `GET .../runtime?kind=thumbnail`
- 잘못된 kind 400/불일치 kind 404
- 썸네일 유효 payload PUT 405
- 미권한 사용자 403

### 구매·승인

- 구매 plan이 요청 템플릿 상품에 속하는지 검사
- plan mismatch 요청 400 및 RPC override 거부
- 승인 후 `template_access` 한 건 생성
- 중복 승인 시 권한 중복 없음
- 승인 후 사용자 목록에 즉시 노출

## 6. 실행 명령

프로젝트 규칙에 따라 production build는 기본 검증에서 제외한다.

```bash
npm run dev:local
npm run check:user-template-ui:schema
npm run check:user-template-ui:baseline
npm run check:template-entitlement
npm run check:template-studio:runtime
npm run check:thumbnail-studio:runtime
npm run check:thumbnail-studio:integration
npm run check:purchase-plan-validation
npx tsc --noEmit
supabase db reset --local --no-seed --yes
bash scripts/check-01-all.sh
```

01단계 순차 실행은 다음을 사용한다.

```bash
bash scripts/check-01-all.sh
```

샌드박스에서 `tsx` IPC가 `EPERM`이면 다음 형태를 사용한다.

```bash
node --import tsx scripts/check-01-db-schema.ts
```

DB checker는 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`가 local 값을 가리킬 때만 실행한다.

## 7. 산출물

- [migration 적용 결과](./01-migration-result.md)
- [fixture 생성·정리 가이드](./01-fixture-guide.md)
- [API·구매 승인 결과](./01-api-test-results.md)
- [수동·후속 검증 목록](./01-manual-verification.md)
- [02단계용 사용자 템플릿 응답 예시](./01-user-template-response-sample.json)
- `scripts/check-01-db-schema.ts`
- `scripts/check-user-template-ui-baseline.ts`
- `scripts/fixtures-01-create.sql`
- `scripts/fixtures-01-cleanup.sql`

## 8. 완료 조건

- [x] **물리적으로 빈 local DB에서 전체 migration이 적용된다.** disposable local DB에서
      `supabase db reset --local --no-seed --yes` 후 전체 migration과 aggregate를 통과했다.
- [x] 세 템플릿 종류의 published fixture를 만들 수 있다.
- [x] 한 사용자의 목록 응답에 세 종류가 올바른 `use_href`로 나타난다.
- [x] 썸네일 런타임이 권한과 kind를 모두 검사한다.
- [x] 구매 승인 후 권한과 요청 상태가 원자적으로 변경된다.
- [x] 테스트 종료 후 fixture가 남지 않는다.
- [x] 원격 Supabase를 읽거나 변경하지 않고 검증할 수 있다.

## 9. 현재 결론

canonical schema, fixture, 목록/entitlement/runtime route, plan-template 검증,
승인 RPC 원자성·중복 승인 idempotency는 local 기준선으로 재현된다. disposable
local DB reset 후 전체 migration과 01단계 aggregate도 통과했으며, 구매 plan
checker의 fixture 사용자·템플릿 사후 잔여도 0건이다.

01단계 완료 조건을 충족했으므로 02단계에서 소비자 계약, 대표 이미지 resolver,
공용 카드 primitive 구현을 진행한다. 브라우저 UI, 실제 이미지 fallback, Legacy
동적 route 경계와 원격 상태는 후속 단계의 범위로 남긴다.
