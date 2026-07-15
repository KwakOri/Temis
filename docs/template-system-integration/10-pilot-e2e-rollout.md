# 10. 파일럿 E2E와 배포 준비

상태: 완료 (2026-07-15, 로컬 검증·문서화 범위)

## 목적

한 개 Studio 템플릿을 실제 판매·권한·사용자 저장 흐름에 연결해 전체 설계를
검증한 뒤 원격 반영 준비 자료를 만든다.

## 파일럿 시나리오

1. 관리자가 Studio 템플릿을 생성하고 draft를 저장한다.
2. preview를 확인하고 publish한다.
3. 일반 판매 상품과 plan을 연결해 상점에 노출한다.
4. 사용자가 구매 요청을 하고 관리자가 승인한다.
5. `template_access`가 한 건 생성된다.
6. 구매자는 Studio 실행 페이지에서 값을 저장·재조회한다.
7. 미구매 사용자와 다른 사용자는 접근하지 못한다.
8. 작가와 관리자는 의도한 범위에서 접근한다.
9. template revision을 갱신하고 기존 사용자 상태 호환성을 확인한다.

## 자동 검증

- migration reset 및 migration up
- lint/typecheck/build
- persistence/API checks
- entitlement 단위·통합 테스트
- 사용자 간 runtime 격리 테스트
- anon 직접 DB 접근 거부 테스트

## 원격 반영 전 산출물

- 적용 migration 목록과 순서
- 원격 적용 전 데이터 점검 SQL과 예상 건수
- 구매/access reconciliation 결과
- rollback 또는 forward-fix 전략
- 수동 smoke test 체크리스트
- 원격 반영 후 모니터링 항목

## 경계

이 단계까지 Codex 작업은 로컬 검증과 문서화로 끝낸다. 원격 migration 적용과
운영 데이터 변경은 사용자가 직접 수행한다.

## 실제 변경 사항

`scripts/check-pilot-e2e.ts`(`npm run check:pilot-e2e`)에 파일럿 시나리오
1~9를 하나의 스크립트로 연결했다. 관리자 라우트 → 상점 라우트 → 사용자 라우트
순으로 실제 API route 핸들러를 직접 호출하며, DB 직접 조작은 라우트가 없는
주변 설정(작가·로열티 규칙 생성 등)에만 썼다.

- 1~2단계 검증 중 상점 노출 API(`PATCH /api/admin/shop-templates/{id}`)가
  `is_public`과 작가 연결만 검사하고 `status`(draft/archived)는 검사하지
  않는 것을 발견해 함께 고쳤다(`status !== 'published'`이면 판매 시작 거부).
  7단계에서 클라이언트(`TemplateManagement.tsx`)에만 넣었던 검사를 서버에도
  추가한 것 — 상점 목록 자체는 이미 `status='published'` 조인 필터가 있어
  실제 노출 유출은 없었지만, API를 직접 호출하는 경로까지 방어했다.
- 파일럿을 만들면서 `template_purchase_requests`/`template_access`를 만지는
  API route 중 9단계 조사에서 놓쳤던 5개 파일이 여전히 anon-key 클라이언트를
  쓰고 있는 것을 발견해 **9단계 grant 회수를 실제로 깨뜨리고 있었다**:
  - `src/app/api/template-purchase-requests/route.ts`(구매 요청 생성/목록)
  - `src/app/api/user/purchase-requests/[id]/route.ts`(내 요청 수정/취소)
  - `src/app/api/user/purchase-history/route.ts`(구매 이력)
  - `src/app/api/admin/user-templates/route.ts`
  - `src/app/api/user/templates/route.ts`(7단계에서 만든 마이페이지 목록)

  9단계 조사(Explore agent)는 "브라우저에서 직접 실행되는 코드"만 (A)로
  분류하고 이 5개는 "(B) API route + anon"으로만 표시했는데, grant 회수는
  코드가 브라우저에서 도는지가 아니라 **어떤 key로 접속하는지**에 걸리므로
  서버에서 실행되는 API route라도 anon key를 쓰면 회수 이후 그대로 깨진다.
  전부 `supabaseAdminServer`로 전환해 실제로 이 버그를 잡았다(9단계 커밋
  이후, 10단계에서 발견·수정 — 아래 "9단계 보정" 참고).
- 위 수정 덕분에 파일럿이 처음부터 끝까지 `curl`/직접 SQL이 아니라 실제
  route 코드로 전체 흐름을 통과한다: 템플릿 생성 → draft 저장 → 관리자
  preview → publish → 공개 전환 → 작가 연결 + 로열티 규칙 → 상점 상품 등록
  → plan 생성 → 상점 노출 → 구매 요청 생성/본인 조회/수정/취소(별도
  scratch 요청으로) → 관리자 목록 조회 → 승인(`template_access` 1건,
  `granted_by`=승인한 관리자) → 구매 이력 조회 → 구매자 Studio 실행
  페이지 저장/새로고침 복원 → 마이페이지 목록에 정확한 `use_href` →
  `/api/user/template-access` 목록 포함 → 미구매 사용자는 실행/목록/접근
  목록 어디서도 노출되지 않음 → 연결 작가·관리자는 접근 가능 → 재발행
  (revision 2)해도 호환 값 유지.

### 9단계 보정 (grant 회수 버그 수정)

9단계 커밋(`e23e836e`) 이후 이 단계에서 발견한 위 5개 파일의 anon→service-role
전환은 9단계 문서(`09-direct-db-access-hardening.md`)의 "완료 조건"을 실제로
만족시키기 위한 필수 보정이었다. 9단계 문서 자체는 이번 커밋과 함께
갱신해 이 5개 파일을 "실제 변경 사항"에 반영했다.

## 자동 검증 실행 결과

- `supabase db reset --local`(seed 없음)로 9개 신규 migration을 포함한 전체
  스키마가 빈 DB에서 처음부터 재현됨을 확인했다.
- 아래 스크립트를 초기화된 DB에서 전부 재실행해 통과를 확인했다:
  `check:template-entitlement`, `check:template-studio:persistence`,
  `check:template-studio:runtime`, `check:admin-purchase-requests`,
  `check:admin-template-access`, `check:pilot-e2e`.
- `tsc --noEmit` 전체 통과.
- 변경/신규 파일 ESLint 통과(무관한 사전 존재 경고 1건 확인 후 그대로 둠 —
  `purchase-requests/[id]/route.ts`의 미사용 `message` 변수, import 줄만
  바꿔서 발생한 것이 아님을 diff로 확인).
- `npm run build`: 타입 검사까지 통과(신규 라우트 2개 포함 205페이지 수집).
  `/admin` prerender 실패는 1~3단계부터 문서화된 기존 이슈로 이번 변경과
  무관함을 재확인했다(타입 검사 통과 이후, static page 생성 단계에서만
  발생).
- anon REST 직접 접근 거부는 9단계에서 `curl`로 이미 검증했고, 이번
  `check:pilot-e2e`는 그 위에서 실제 승인/실행 흐름이 서비스-role 경로로
  끝까지 동작함을 추가로 검증했다.

## 원격 반영 전 산출물

### 1. 적용 migration 목록과 순서

원격 마지막 마이그레이션은 `20260518010000`이다(README 개발 기준점). 이후
로컬에만 있는 마이그레이션은 순서대로 다음과 같다:

```
20260705000000_create_template_studio_persistence.sql
20260707000000_create_template_studio_preview_assets.sql
20260709000000_extend_template_studio_assets_for_r2_sync.sql
20260715010000_add_template_engine_and_status.sql
20260715020000_relink_template_studio_to_templates.sql
20260715040000_remove_is_public_entitlement_bypass.sql
20260715050000_reconcile_template_access.sql
20260715060000_create_template_studio_user_states.sql
20260715070000_revoke_anon_access_to_sensitive_tables.sql
```

9개 전부 로컬에서 빈 DB부터, 그리고 원격 복제 데이터 위에서(6·9단계 검증
당시) 순서대로 적용 가능함을 확인했다. `supabase db push`로 원격에 반영할
때도 이 순서를 따른다(파일명 타임스탬프 순서와 동일하므로 CLI가 자동으로
지킨다).

### 2. 원격 적용 전 데이터 점검 SQL과 예상 건수

6단계에서 원격을 로컬에 복제해 확인한 기준 건수(2026-07-15):

| 테이블 | 마이그레이션 적용 전 | 마이그레이션 적용 후 예상 |
| --- | --- | --- |
| `templates` | 81 | 81 (변경 없음, 전부 `legacy`/`published`로 backfill) |
| `users` | 370 | 370 (변경 없음) |
| `template_access` | 155 | **154** (`20260715050000`이 중복 1건 정리) |
| `template_purchase_requests` | 57 | 57 (변경 없음) |
| `shop_templates` | 10 | 10 (변경 없음) |

원격 적용 직전 실행할 점검 SQL(로컬에서 쓴 것과 동일, 6단계 사전 점검
그대로):

```sql
-- 완료된 구매 요청인데 access가 없는 행 (0건이어야 함)
SELECT count(*) FROM template_purchase_requests r
WHERE r.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM template_access a
    WHERE a.template_id = r.template_id AND a.user_id = r.user_id
  );

-- 동일 (template_id, user_id) 중복 access
SELECT template_id, user_id, count(*)
FROM template_access GROUP BY template_id, user_id HAVING count(*) > 1;

-- 삭제된 template/plan을 참조하는 access
SELECT count(*) FROM template_access a
LEFT JOIN templates t ON t.id = a.template_id WHERE t.id IS NULL;
```

적용 후에는 위 표의 "적용 후 예상" 건수와 `SELECT count(*) FROM
template_access GROUP BY template_id, user_id HAVING count(*) > 1;`가 0행인지
확인한다.

### 3. 구매/access reconciliation 결과

6단계에서 이미 수행·문서화됨(`06-purchase-access-reconciliation.md`
"로컬 검증" 참고): 원격 복제 데이터 기준 `template_access` 155건 중 실제
중복 1건(같은 template_id/user_id, 3초 간격 완전 동일 행) 발견, 마이그레이션
적용 후 154건·중복 0건. 완료 구매인데 access 없는 행, 삭제된 template/plan
참조, 지정자 없는 개인 맞춤 템플릿은 모두 0건이었다. 원격 적용 시 로컬과
동일한 결과가 나오는지 위 점검 SQL로 재확인한다.

### 4. Rollback / forward-fix 전략

- **스키마 마이그레이션(9개)**: 전부 `ADD COLUMN`, `CREATE TABLE`,
  `REVOKE`, 기존 데이터를 안전한 기본값으로 backfill하는 형태이며 기존
  컬럼/행을 삭제하지 않는다(`20260715020000`의 `template_studio_templates`
  DROP만 예외이나, 이 테이블은 원격에 아직 생성된 적이 없으므로 원격에는
  영향 없음). 되돌릴 필요가 생기면 `DROP`/`REVERT` 대응 SQL을 새 forward
  migration으로 작성해 적용한다 — 이미 적용된 migration 파일을 원격에서
  직접 수정하거나 `db reset`하지 않는다(운영 데이터 보존).
- **`20260715070000`(GRANT 회수)이 문제를 일으키면**: 가장 되돌리기 쉬운
  변경이다. 문제가 되는 테이블/함수에 한해 `GRANT ... TO anon,
  authenticated`를 다시 실행하는 forward migration으로 즉시 롤백 가능하다.
  단, 이번 10단계에서 발견한 대로 anon 경유 서버 라우트가 남아있지 않은지
  먼저 확인한다(아래 "9단계 보정" 참고 — 이미 이번 커밋에서 5개 모두
  수정됨).
- **`20260715050000`(template_access 중복 정리)이 예상과 다른 행을
  지우면**: 삭제 전 `granted_at`/`id` 기준 규칙이 고정되어 있으므로,
  원격 적용 직전 위 점검 SQL로 실제 삭제 대상 행을 미리 조회해
  사람이 확인한 뒤 진행한다. 필요하면 적용 직전 `pg_dump
  --table=template_access`로 백업 후 진행한다.
- **애플리케이션 코드**: 이번 브랜치의 모든 변경은 `git revert`로 개별
  커밋 단위 되돌리기가 가능하다(커밋이 단계별로 분리되어 있음: 5~9단계
  각각 별도 커밋).

### 5. 수동 smoke test 체크리스트 (원격 반영 후)

- [ ] 미인증 상태로 `/api/template-access?templateId=...` 호출 시 `401`
- [ ] 일반 사용자가 미구매 템플릿의 `/time-table/{id}` 또는
      `/template-studio/{id}` 접근 시 `/access-denied`로 리다이렉트
- [ ] 관리자 로그인 후 `/admin` 템플릿 목록에 engine/status 배지가 보이는지
- [ ] 관리자가 Studio 템플릿을 만들고 draft 저장 → preview 확인 → publish
- [ ] 신규 판매 상품 등록(작가/로열티 규칙 연결 포함) → 상점에 노출되는지
      (`is_public=false`나 `status=draft`인 템플릿은 노출되면 안 됨)
- [ ] 실제 사용자 계정으로 구매 요청 제출 → 관리자 승인 → 이메일 수신 확인
      (운영 환경은 Gmail 환경변수가 설정되어 있어 로컬과 달리 실제 발송됨)
- [ ] 구매자가 마이페이지에서 항목을 클릭해 올바른 실행 페이지(legacy는
      `/time-table`, Studio는 `/template-studio`)로 이동하는지
- [ ] Studio 실행 페이지에서 값을 입력·저장 후 새로고침해도 유지되는지
- [ ] 같은 템플릿을 다른 계정으로 열었을 때 값이 섞이지 않는지
- [ ] anon key(공개 anon key, service role 아님)로 REST API에서
      `template_access`/`template_purchase_requests`를 직접 조회/삽입
      시도 시 거부되는지(`curl`로 9단계와 동일하게 확인)

### 6. 원격 반영 후 모니터링 항목

- Postgres 로그에서 `permission denied for table template_access` 등
  `42501` 에러가 급증하는지 — 놓친 anon-key 호출부가 남아있다는 신호.
- `/api/admin/purchase-requests/*`, `/api/user/templates/*/runtime`,
  `/api/template-purchase-requests`, `/api/user/template-access`의 5xx
  비율.
- `template_access` insert 실패율(신규 unique 제약 `(template_id, user_id)`
  위반 — 승인 재시도가 아니라 실제 이중 승인 흐름이 남아있는지 확인 신호).
- 이메일 발송 실패 로그("권한 부여 알림 메일 발송 실패") — 알림은
  best-effort이므로 실패해도 승인 자체는 막히지 않지만, 급증하면 Gmail
  설정 문제로 봐야 한다.
- `/admin` 페이지의 실제 프로덕션 동작(빌드 prerender 이슈와 별개로,
  런타임에서 정상 작동하는지는 배포 후 별도 확인 필요 — 이번 범위에서
  근본 원인은 진단하지 않았다).

