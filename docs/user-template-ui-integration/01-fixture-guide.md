# 01단계 fixture 생성·정리 가이드

## 권장 경로: 통합 checker

disposable local DB에서 가장 안전한 재현 경로는 생성, route/API 검증, 승인 재시도,
cleanup, cleanup 확인을 하나의 `try/finally`로 묶은 checker다. 공유·운영 데이터가
있는 local DB에서는 먼저 별도 DB를 사용하거나 reset 여부를 확인한다.

```bash
npm run check:user-template-ui:baseline
```

이 checker는 실행 전 예약 prefix와 user ID의 기존 fixture를 정리하고, 실행 후에도 같은 대상을 정리한다. 중간 assertion이 실패해도 `finally`에서 cleanup을 시도한다.

예약 식별자:

- users: `9190101` admin, `9190102` buyer, `9190103` artist, `9190104` no-access
- 이메일: `user-template-ui-baseline-*@temis.local`
- 동적 template UUID는 실행마다 생성되지만 이름 prefix는 `[01 baseline] user-template-ui`다.
- SQL fixture는 `f010...` UUID와 `[01 baseline]` 이름을 사용한다.

실제 사용자의 Supabase Auth 계정이나 운영 PII를 복제하지 않는다. 이 프로젝트의 route checker가 사용하는 앱 권한 기준은 local `public.users`와 서명된 local JWT다.

## fixture matrix

| 표본                    | 상태        | 권한/연결                                   | checker 기대                                |
| ----------------------- | ----------- | ------------------------------------------- | ------------------------------------------- |
| Legacy 시간표           | published   | buyer `template_access`                     | 구매 목록, `/time-table/{id}`               |
| Studio 시간표           | published   | buyer `template_access` + buyer artist 연결 | 작업 목록, `/template-studio/{id}`          |
| Studio 썸네일           | published   | buyer `template_access`                     | 구매 목록, `/thumbnail/{id}`                |
| Studio 썸네일           | draft       | buyer `template_access`                     | 목록/일반 entitlement 미허용                |
| Studio 시간표           | archived    | buyer `template_access`                     | 목록/일반 entitlement 미허용                |
| 작가 연결 Studio 템플릿 | published   | artist user의 `template_artists` 연결       | artist user의 작업 목록                     |
| 미권한 사용자           | 별도 사용자 | 연결 없음                                   | 목록 0, runtime 403                         |
| 관리자                  | 별도 사용자 | role `admin`                                | entitlement 우회, unpublished는 runtime 404 |

Studio 시간표에는 published document/revision과 draft가, Studio 썸네일에는 published document/revision과 asset row가 생성된다. runtime PUT으로 buyer별 `template_studio_user_states`도 생성된다.

## SQL 경로

구조 fixture만 별도로 준비할 때는 local DB에만 다음 순서로 실행한다. 첫 명령은 예약 대상만 지우며 운영/원격 DB에는 사용하지 않는다.

```bash
psql postgresql://postgres:postgres@127.0.0.1:56322/postgres \
  -v ON_ERROR_STOP=1 -f scripts/fixtures-01-cleanup.sql
psql postgresql://postgres:postgres@127.0.0.1:56322/postgres \
  -v ON_ERROR_STOP=1 -f scripts/fixtures-01-create.sql
# 사용 후 반드시 cleanup
psql postgresql://postgres:postgres@127.0.0.1:56322/postgres \
  -v ON_ERROR_STOP=1 -f scripts/fixtures-01-cleanup.sql
```

`fixtures-01-create.sql`은 다음을 deterministic하게 만든다.

- local app users 4명과 artists 2명
- Legacy/Studio timetable/Studio thumbnail 및 draft/archived/artist-linked 템플릿 6개
- Studio document, revision, draft, asset row
- buyer access 5건과 artist link 2건
- Legacy/artist-linked shop product와 `lite`/`pro` plan
- access, artist link, product, plan의 고정 UUID

`fixtures-01-cleanup.sql`은 sales와 purchase request를 먼저 지운 뒤 access, artist link, Studio state/document/asset, plan/product, template, artist, user 순으로 정리한다. 예약 ID만 대상으로 하므로 반복 실행할 수 있다.

## cleanup 확인

통합 checker 마지막 출력은 다음 두 줄을 포함해야 한다.

```text
User template UI local DB/API baseline check passed.
Fixture cleanup verified for reserved 01단계 identifiers.
```

SQL 경로를 사용한 뒤에는 다음 예약 ID가 0건이어야 한다.

```sql
SELECT COUNT(*) FROM public.templates
WHERE id IN (
  'f0100001-0101-0101-0101-010101010101',
  'f0100002-0102-0102-0202-020202020202',
  'f0100003-0103-0103-0303-030303030303',
  'f0100004-0104-0104-0404-040404040404',
  'f0100005-0105-0105-0505-050505050505',
  'f0100006-0106-0106-0606-060606060606'
);
```

기대값은 `0`이다. 이 SQL은 local DB URL을 명시적으로 사용하며 `--linked`나 remote token을 사용하지 않는다.
